/**
 * Localizaciones de una película desde Wikidata (SOLO SERVIDOR, gratis, sin clave).
 *
 * Se busca el elemento por su id de IMDb (propiedad P345) y se leen:
 *   - P915 «localización de rodaje» (filming location)
 *   - P840 «lugar de la narración» (narrative location)
 *
 * De cada lugar se piden además la COORDENADA (P625) y QUÉ ES (P31), porque sin
 * esas dos cosas no se puede dibujar un mapa honesto: Wikidata mezcla sitios
 * concretos —un puente, un museo, una base aérea— con países y estados enteros.
 * Clavar un pin en el centro geográfico de España y llamarlo «localización de
 * rodaje» sería mentir, así que cada lugar se clasifica y la ficha decide.
 *
 * Wikidata pide un User-Agent identificable. La cobertura es parcial: sobre una
 * muestra variada, ~86 % de las películas tienen algún lugar y ~68 % tienen al
 * menos uno con coordenada útil. El cine español está peor cubierto que el
 * anglosajón.
 */
const ENDPOINT = 'https://query.wikidata.org/sparql';
const UA = 'CineArchive/1.0 (film archive; contact via site)';

/**
 * Precisión del lugar:
 *   - `exacto`: un sitio identificable (puente, museo, estudio, aeropuerto).
 *   - `ciudad`: un municipio. Sirve para el mapa, pero el pin es el centro.
 *   - `region`: país, estado, provincia, isla… NO se dibuja: el centroide de un
 *     país no dice nada y da una falsa sensación de precisión.
 */
export type TipoLugar = 'exacto' | 'ciudad' | 'region';

export interface FilmPlace {
  name: string;
  lat: number | null;
  lon: number | null;
  kind: TipoLugar;
}

export interface FilmLocations {
  /**
   * Versión del formato. La 1 (sin `v`) guardaba solo nombres, sin coordenadas;
   * al leerla, films.ts fuerza una consulta nueva en vez de esperar al TTL.
   */
  v: 2;
  filming: FilmPlace[];
  narrative: FilmPlace[];
}

/** Un municipio: se pinta, pero el pin es el centro del pueblo, no el plató. */
const ES_CIUDAD = /ciudad|megaciudad|metr[óo]poli|municipio|villa|pueblo|localidad|comuna|borough/i;
/** Una demarcación entera: no se pinta. */
const ES_REGION =
  /pa[íi]s|estado|provincia|regi[óo]n|comunidad aut|prefectura|condado|territorio|isla|archipi|continente|departamento|distrito|land\b|rep[úu]blica|reino/i;

/**
 * Clasifica por lo que Wikidata dice que ES el lugar (P31).
 *
 * Primero se mira si es una ciudad y solo después si es una demarcación: Tokio
 * está catalogada a la vez como «prefectura de Japón» y como «megaciudad», y es
 * una ciudad a todos los efectos.
 */
export function clasificarLugar(tipos: string[]): TipoLugar {
  const texto = tipos.join(' · ');
  if (!texto) return 'ciudad'; // sin tipo: se pinta, pero sin presumir de exacto
  if (ES_CIUDAD.test(texto)) return 'ciudad';
  if (ES_REGION.test(texto)) return 'region';
  return 'exacto';
}

/**
 * Convierte el WKT de Wikidata a coordenadas.
 * OJO al orden: `Point(longitud latitud)`, la longitud PRIMERO. Invertirlo
 * coloca los pines en el hemisferio equivocado.
 */
export function parsePoint(wkt: string | undefined): { lat: number; lon: number } | null {
  if (!wkt) return null;
  const m = wkt.match(/Point\(\s*(-?[\d.]+)\s+(-?[\d.]+)\s*\)/i);
  if (!m) return null;
  const lon = Number(m[1]);
  const lat = Number(m[2]);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
  if (lat < -90 || lat > 90 || lon < -180 || lon > 180) return null;
  return { lat, lon };
}

/** ¿Es del formato nuevo (con coordenadas)? Lo usa films.ts para refrescar. */
export function esFormatoActual(x: unknown): x is FilmLocations {
  return !!x && typeof x === 'object' && (x as { v?: number }).v === 2;
}

/** ¿Hay algo que merezca un mapa? Una región suelta no lo merece. */
export function hayMapa(loc: FilmLocations | null | undefined): boolean {
  if (!loc) return false;
  return [...loc.filming, ...loc.narrative].some(
    (p) => p.lat != null && p.lon != null && p.kind !== 'region',
  );
}

interface Fila {
  rel?: { value: string };
  locLabel?: { value: string };
  coord?: { value: string };
  tipoLabel?: { value: string };
}

const MAX_LUGARES = 20;

export async function getFilmLocations(imdbId: string | null): Promise<FilmLocations | null> {
  if (!imdbId) return null;

  // UNION con marca: rodaje y narración en una sola consulta. Cada lugar puede
  // devolver varias filas (una por cada P31), así que después se agrupan.
  const query = `SELECT ?rel ?locLabel ?coord ?tipoLabel WHERE {
    ?film wdt:P345 "${imdbId}".
    { ?film wdt:P915 ?loc. BIND("f" AS ?rel) }
    UNION
    { ?film wdt:P840 ?loc. BIND("n" AS ?rel) }
    OPTIONAL { ?loc wdt:P625 ?coord. }
    OPTIONAL { ?loc wdt:P31 ?tipo. }
    SERVICE wikibase:label { bd:serviceParam wikibase:language "es,en". }
  } LIMIT 300`;

  try {
    const res = await fetch(`${ENDPOINT}?format=json&query=${encodeURIComponent(query)}`, {
      headers: { 'user-agent': UA, accept: 'application/sparql-results+json' },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { results: { bindings: Fila[] } };
    return agrupar(data.results.bindings);
  } catch {
    return null;
  }
}

/** Agrupa las filas por lugar y las reparte entre rodaje y narración. */
export function agrupar(filas: Fila[]): FilmLocations {
  // clave = relación + nombre, para no mezclar el mismo sitio en ambas listas.
  const acumulado = new Map<string, { rel: string; name: string; wkt?: string; tipos: string[] }>();

  for (const f of filas) {
    const name = f.locLabel?.value;
    const rel = f.rel?.value;
    // Sin etiqueta legible el valor es el propio Qxxxxx: no sirve de nada.
    if (!name || !rel || /^Q\d+$/.test(name)) continue;

    const clave = `${rel}|${name}`;
    const previo = acumulado.get(clave);
    if (previo) {
      if (f.tipoLabel?.value) previo.tipos.push(f.tipoLabel.value);
      if (!previo.wkt && f.coord?.value) previo.wkt = f.coord.value;
    } else {
      acumulado.set(clave, {
        rel,
        name,
        wkt: f.coord?.value,
        tipos: f.tipoLabel?.value ? [f.tipoLabel.value] : [],
      });
    }
  }

  const filming: FilmPlace[] = [];
  const narrative: FilmPlace[] = [];
  for (const v of acumulado.values()) {
    const punto = parsePoint(v.wkt);
    const lugar: FilmPlace = {
      name: v.name,
      lat: punto?.lat ?? null,
      lon: punto?.lon ?? null,
      kind: clasificarLugar(v.tipos),
    };
    (v.rel === 'f' ? filming : narrative).push(lugar);
  }

  // Delante lo más concreto: es lo que el lector quiere ver primero.
  const orden = { exacto: 0, ciudad: 1, region: 2 } as const;
  const ordenar = (a: FilmPlace, b: FilmPlace) => orden[a.kind] - orden[b.kind];

  return {
    v: 2,
    filming: filming.sort(ordenar).slice(0, MAX_LUGARES),
    narrative: narrative.sort(ordenar).slice(0, MAX_LUGARES),
  };
}
