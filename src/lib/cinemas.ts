/**
 * "Encuentra tu cine" — SOLO SERVIDOR.
 *
 * Busca salas de cine reales cerca de una ubicación en España (península e islas)
 * con datos abiertos de OpenStreetMap:
 *   - Nominatim: geocodifica una ciudad / código postal → coordenadas.
 *   - Overpass:  lista las salas en un radio alrededor del punto.
 *
 * OSM es la fuente y a quien se atribuye, pero es colaborativo y su cobertura de
 * los cines españoles es irregular. Sobre la respuesta en bruto se aplica una
 * capa de calidad —ver "Calidad del dato", más abajo— sin la cual faltaban salas
 * en activo (por ejemplo el multicine del CC Los Arcos, en Sevilla).
 *
 * Se llama solo desde /api/cinemas (proxy con rate-limit). Cumple la política de
 * uso de Nominatim: User-Agent identificable, resultados cacheados, ≤1 req/s y
 * atribución © OpenStreetMap (mostrada en la página). No se descargan zonas
 * enteras: siempre alrededor de un punto que el usuario proporciona.
 */

import overridesData from '../data/cinemas-overrides.json';
import { registerCache } from './cache-registry';

/** Correcciones propias sobre OSM (ver src/data/cinemas-overrides.json). */
interface CinemaOverrides {
  /** Campos que se sobrescriben en un objeto de OSM, por su id `tipo/id`. */
  fix: Record<string, Partial<Pick<Cinema, 'name' | 'address' | 'operator' | 'website'>>>;
  /** Ids de OSM que no deben aparecer (no son cines, o han cerrado). */
  hide: string[];
  /** Salas que OSM no tiene en absoluto. */
  add: (Pick<Cinema, 'id' | 'name' | 'lat' | 'lon'> &
    Partial<Pick<Cinema, 'address' | 'operator' | 'website'>>)[];
}

const OVERRIDES = overridesData as unknown as CinemaOverrides;

// Identifica la aplicación ante Nominatim/Overpass (requerido por su política).
// Se exporta para que las sondas del panel usen exactamente el mismo, y no
// aparezcamos ante esos servicios como dos clientes distintos.
export const UA = 'CineArchive/1.0 (+https://cinearchive.es)';
const NOMINATIM = 'https://nominatim.openstreetmap.org/search';
// Photon (Komoot): geocodificador pensado para autocompletado por prefijo. Se usa
// solo para las sugerencias (Nominatim rankea mal los prefijos y cuela comercios).
const PHOTON = 'https://photon.komoot.io/api/';
// Varios espejos de Overpass: el público principal se satura a menudo. Se prueban
// en orden hasta que uno responda, así una instancia caída no deja sin cines.
const OVERPASS_MIRRORS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
  'https://overpass.private.coffee/api/interpreter',
];

// Caja envolvente de España incluyendo Canarias, Baleares, Ceuta y Melilla.
// Sirve para rechazar ubicaciones fuera del país (GPS o geocodificadas).
const ES_BBOX = { minLat: 27.4, maxLat: 43.9, minLon: -18.4, maxLon: 4.6 };

export function inSpain(lat: number, lon: number): boolean {
  return (
    lat >= ES_BBOX.minLat &&
    lat <= ES_BBOX.maxLat &&
    lon >= ES_BBOX.minLon &&
    lon <= ES_BBOX.maxLon
  );
}

export interface GeoPoint {
  lat: number;
  lon: number;
  label: string;
}

export interface Cinema {
  id: string;
  /**
   * Puede ser null: OSM tiene nodos `amenity=cinema` sin nombre. Son cines
   * reales, así que se muestran igual y la página les pone un rótulo genérico
   * en su idioma, en vez de descartarlos.
   */
  name: string | null;
  lat: number;
  lon: number;
  address: string | null;
  /** Cadena/marca (Cinesa, Yelmo, Ocine…) si OSM la registra. */
  operator: string | null;
  /** Web oficial de la sala (para la cartelera), si OSM la registra. */
  website: string | null;
  distanceKm: number;
}

// Caché en memoria (un solo proceso Node en el VPS). Clave → { time, data }.
const DAY_MS = 24 * 60 * 60 * 1000;
// Los resultados vacíos se cachean poco: un sitio puede estrenar cine hoy, o el
// vacío puede venir de una respuesta lenta. NUNCA se cachean los fallos de red.
const EMPTY_TTL_MS = 10 * 60 * 1000;
const geoCache = new Map<string, { time: number; data: GeoPoint | null }>();
const suggestCache = new Map<string, { time: number; data: GeoPoint[] }>();
// La caché de cines usa vencimiento explícito por entrada (24 h si hay salas,
// 10 min si el resultado fue vacío).
const cinemaCache = new Map<string, { expires: number; data: Cinema[] }>();

registerCache({
  id: 'cines-geo',
  label: 'Geocodificación de lugares',
  ttlMs: DAY_MS,
  size: () => geoCache.size,
  clear: () => geoCache.clear(),
});
registerCache({
  id: 'cines-sugerencias',
  label: 'Sugerencias del buscador',
  ttlMs: DAY_MS,
  size: () => suggestCache.size,
  clear: () => suggestCache.clear(),
});
// Sin ttlMs: esta caduca por entrada (24 h con resultados, 10 min si vino vacía).
registerCache({
  id: 'cines-salas',
  label: 'Salas por zona',
  size: () => cinemaCache.size,
  clear: () => cinemaCache.clear(),
});

function fresh<T>(entry: { time: number; data: T } | undefined): entry is { time: number; data: T } {
  return !!entry && Date.now() - entry.time < DAY_MS;
}

/** Distancia Haversine en km entre dos puntos. */
function haversineKm(aLat: number, aLon: number, bLat: number, bLon: number): number {
  const R = 6371;
  const dLat = ((bLat - aLat) * Math.PI) / 180;
  const dLon = ((bLon - aLon) * Math.PI) / 180;
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((aLat * Math.PI) / 180) * Math.cos((bLat * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

async function fetchWithTimeout(url: string, init: RequestInit, ms = 12000): Promise<Response> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), ms);
  try {
    return await fetch(url, { ...init, signal: ctrl.signal });
  } finally {
    clearTimeout(timer);
  }
}

interface NominatimRow {
  lat: string;
  lon: string;
  display_name: string;
}

/**
 * Construye la URL de Nominatim para un texto restringido a España. Detecta
 * códigos postales (4-5 dígitos sin letras) y usa la consulta ESTRUCTURADA, más
 * fiable que la libre; un CP de 4 dígitos se rellena con cero (1007 → 01007).
 */
function nominatimUrl(raw: string, limit: number): string {
  const url = new URL(NOMINATIM);
  url.searchParams.set('format', 'json');
  url.searchParams.set('limit', String(limit));
  url.searchParams.set('addressdetails', '0');

  const digits = raw.replace(/\D/g, '');
  const hasLetters = /[a-zA-ZÀ-ÿ]/.test(raw);
  const postal =
    !hasLetters && digits.length === 5
      ? digits
      : !hasLetters && digits.length === 4
        ? '0' + digits
        : null;

  if (postal) {
    url.searchParams.set('postalcode', postal);
    url.searchParams.set('country', 'Spain');
  } else {
    url.searchParams.set('q', raw);
    url.searchParams.set('countrycodes', 'es');
  }
  return url.toString();
}

function toGeoPoint(r: NominatimRow | undefined): GeoPoint | null {
  if (!r) return null;
  const lat = Number(r.lat);
  const lon = Number(r.lon);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
  return { lat, lon, label: r.display_name };
}

/** Geocodifica un texto (ciudad / código postal) restringido a España. */
export async function geocode(query: string): Promise<GeoPoint | null> {
  const key = query.trim().toLowerCase().slice(0, 120);
  const cached = geoCache.get(key);
  if (fresh(cached)) return cached.data;

  let data: GeoPoint | null = null;
  try {
    // Comparte turno con la búsqueda de salas por Nominatim (una por segundo).
    await nominatimTurn();
    const res = await fetchWithTimeout(nominatimUrl(query.trim(), 1), {
      headers: { 'User-Agent': UA, accept: 'application/json' },
    });
    if (res.ok) {
      const rows = (await res.json()) as NominatimRow[];
      data = toGeoPoint(rows[0]);
    }
  } catch {
    /* red/timeout: se devuelve null y el endpoint responde "not_found" */
  }
  geoCache.set(key, { time: Date.now(), data });
  return data;
}

export interface PhotonFeature {
  properties?: {
    name?: string;
    city?: string;
    county?: string;
    state?: string;
    countrycode?: string;
    osm_value?: string;
  };
  geometry?: { coordinates?: [number, number] }; // [lon, lat]
}

/** Etiqueta legible "Nombre, Comarca/Ciudad, Región" sin repetir segmentos. */
function photonLabel(p: NonNullable<PhotonFeature['properties']>): string {
  const name = p.name ?? '';
  const mid = p.city && p.city !== name ? p.city : p.county && p.county !== name ? p.county : null;
  const parts = [name];
  if (mid) parts.push(mid);
  if (p.state && p.state !== name && p.state !== mid) parts.push(p.state);
  return parts.filter(Boolean).join(', ');
}

/**
 * Orden de los tipos de lugar en las sugerencias: primero ciudades, luego
 * pueblos, barrios y caseríos; regiones y provincias al final.
 *
 * Photon ordena por relevancia, y un barrio o un pueblo con el nombre exacto
 * puede ir por delante de la ciudad («mala» → Mala, un barrio, antes que
 * Málaga). Se reordena por tipo y, dentro de cada tipo, se respeta su orden.
 */
const PLACE_RANK: Record<string, number> = {
  postcode: 0,
  city: 0,
  town: 1,
  municipality: 2,
  village: 3,
  borough: 4,
  suburb: 4,
  quarter: 5,
  neighbourhood: 5,
  hamlet: 6,
  locality: 7,
  isolated_dwelling: 8,
};
export const placeRank = (osmValue: string | undefined): number => PLACE_RANK[osmValue ?? ''] ?? 9;

/**
 * De la respuesta de Photon a las sugerencias: solo España, ordenadas por tipo
 * de lugar, sin etiquetas repetidas (la ciudad y su provincia se llaman igual:
 * gana la ciudad, que va antes) y como mucho seis. Pura (tiene tests).
 */
export function rankSuggestions(features: PhotonFeature[]): GeoPoint[] {
  const seen = new Set<string>();
  return features
    .map((f, i) => {
      const p = f.properties ?? {};
      const c = f.geometry?.coordinates;
      if (p.countrycode !== 'ES' || !c) return null;
      const [lon, lat] = c;
      if (!Number.isFinite(lat) || !Number.isFinite(lon) || !inSpain(lat, lon)) return null;
      const label = photonLabel(p);
      if (!label) return null;
      return { lat, lon, label, rank: placeRank(p.osm_value), i };
    })
    .filter((p): p is GeoPoint & { rank: number; i: number } => p !== null)
    .sort((a, b) => a.rank - b.rank || a.i - b.i)
    .filter((p) => (seen.has(p.label) ? false : (seen.add(p.label), true)))
    .slice(0, 6)
    .map(({ lat, lon, label }) => ({ lat, lon, label }));
}

/**
 * Sugerencias de lugares para el autocompletado (hasta 6), restringidas a España.
 * Usa Photon con `osm_tag=place` (solo entidades de población / códigos postales),
 * limitado a la caja de España y reordenado por tipo (ver placeRank). Se cachea
 * por texto; ante fallo de red se devuelve lista vacía (nunca lanza).
 */
export async function suggestPlaces(query: string): Promise<GeoPoint[]> {
  const raw = query.trim();
  if (raw.length < 2) return [];
  const key = raw.toLowerCase().slice(0, 120);
  const cached = suggestCache.get(key);
  if (fresh(cached)) return cached.data;

  const url = new URL(PHOTON);
  url.searchParams.set('q', raw);
  // Se piden más de las que se enseñan: al reordenar, la ciudad que Photon
  // ponía en séptimo lugar tiene que poder subir.
  url.searchParams.set('limit', '12');
  url.searchParams.set('osm_tag', 'place'); // ciudades/pueblos/CP, no comercios
  // Solo España, con la caja del país. Antes se pedía «cerca del centro de
  // España» (lat/lon), y eso no solo ordenaba por cercanía a Madrid: dejaba
  // fuera de la respuesta a las ciudades lejanas, y «mala» no traía Málaga.
  url.searchParams.set('bbox', `${ES_BBOX.minLon},${ES_BBOX.minLat},${ES_BBOX.maxLon},${ES_BBOX.maxLat}`);

  let data: GeoPoint[] = [];
  try {
    const res = await fetchWithTimeout(url.toString(), {
      headers: { 'User-Agent': UA, accept: 'application/json' },
    });
    if (res.ok) {
      const json = (await res.json()) as { features?: PhotonFeature[] };
      data = rankSuggestions(json.features ?? []);
    }
    // Solo se cachea una respuesta efectiva de la red; si hubo excepción, no.
    suggestCache.set(key, { time: Date.now(), data });
  } catch {
    /* red/timeout: lista vacía, sin cachear */
  }
  return data;
}

interface OverpassElement {
  type: string;
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
}

/* ------------------------------------------------------------------ *
 * Calidad del dato.
 *
 * OSM es colaborativo, y en España las salas están desigualmente mapeadas. Los
 * tres fallos que se ven una y otra vez:
 *
 *   1. Cines etiquetados como `amenity=theatre` (el multicine del CC Los Arcos
 *      de Sevilla, por ejemplo). Buscando solo `amenity=cinema` no salían.
 *   2. Nodos `amenity=cinema` SIN nombre: son cines de verdad, y se tiraban.
 *   3. Salas cerradas que siguen en el mapa, o duplicadas como nodo y como
 *      edificio.
 *
 * Se corrigen aquí, más una capa de arreglos propios (cinemas-overrides.json)
 * para lo que OSM tiene mal y todavía no se ha enmendado allí.
 * ------------------------------------------------------------------ */

/** Quita acentos y pasa a minúsculas, para comparar nombres sin sorpresas. */
const normalize = (s: string): string =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, ''); // marcas diacríticas sueltas tras NFD

/**
 * ¿El nombre delata una sala de cine? Se aplica SOLO a `amenity=theatre`, para
 * rescatar los cines mal etiquetados sin arrastrar los teatros de verdad
 * ("Teatro Lope de Vega", "Sala Cero"…). Se exige palabra completa: así "Cinesa"
 * entra y "Cinegética" no.
 */
const CINEMA_WORDS =
  /(^|[^a-z0-9])(cine|cines|cinema|cinemas|multicine|multicines|megaplex|kinepolis|cinepolis|cinesa|yelmo|ocine|cinesur|cinebox|imax|filmoteca)([^a-z0-9]|$)/;

export function looksLikeCinema(name: string): boolean {
  return CINEMA_WORDS.test(normalize(name));
}

/** Marcas de que el sitio ya no está en activo: no debe aparecer en la lista. */
export function isClosed(tags: Record<string, string>): boolean {
  if (tags['disused'] === 'yes' || tags['abandoned'] === 'yes') return true;
  if (tags['opening_hours'] === 'closed' || tags['opening_hours'] === 'off') return true;
  // Prefijos de ciclo de vida: disused:amenity=cinema, was:amenity=cinema…
  return Object.keys(tags).some((k) => /^(disused|abandoned|was|removed|demolished):/.test(k));
}

/** ¿Este elemento es una sala de cine que queremos mostrar? */
export function isCinema(tags: Record<string, string>): boolean {
  if (isClosed(tags)) return false;
  if (tags.amenity === 'cinema') return true;
  // Teatro: solo si el nombre lo delata como cine (fallo 1).
  if (tags.amenity === 'theatre') {
    const name = tags.name ?? tags.brand ?? tags.operator ?? '';
    return !!name && looksLikeCinema(name);
  }
  return false;
}

/**
 * Une duplicados: el mismo cine mapeado como nodo Y como edificio aparece dos
 * veces. Se consideran el mismo si están a menos de 200 m y comparten nombre (o
 * uno de los dos no tiene). Se conserva la ficha con más datos.
 */
export function dedupe(list: Cinema[]): Cinema[] {
  const out: Cinema[] = [];
  const richness = (c: Cinema) => (c.name ? 1 : 0) + (c.address ? 1 : 0) + (c.website ? 1 : 0) + (c.operator ? 1 : 0);

  for (const c of list) {
    const twin = out.findIndex((o) => {
      if (haversineKm(o.lat, o.lon, c.lat, c.lon) > 0.2) return false;
      if (!o.name || !c.name) return true; // uno sin nombre, mismo sitio
      const a = normalize(o.name);
      const b = normalize(c.name);
      return a === b || a.includes(b) || b.includes(a);
    });
    if (twin < 0) {
      out.push(c);
    } else if (richness(c) > richness(out[twin])) {
      out[twin] = c; // nos quedamos con la ficha más completa
    }
  }
  return out;
}

/**
 * Convierte la respuesta de Overpass en cines (sin distancia todavía: la pone
 * `nearest`, desde el punto exacto de quien busca).
 */
function parseCinemas(
  elements: OverpassElement[],
  lat: number,
  lon: number,
  radius: number,
): Cinema[] {
  const list = elements
    .map((el) => {
      const p = el.center ?? (el.lat != null && el.lon != null ? { lat: el.lat, lon: el.lon } : null);
      const tags = el.tags ?? {};
      if (!p || !isCinema(tags)) return null;

      const id = `${el.type}/${el.id}`;
      if (OVERRIDES.hide.includes(id)) return null;

      // Nombre con respaldo en la marca/cadena. Puede quedar en null: un
      // `amenity=cinema` sin nombre es un cine igual, y la página lo rotula
      // en su idioma (fallo 2).
      const name = tags.name ?? tags.brand ?? tags.operator ?? null;
      const street = [tags['addr:street'], tags['addr:housenumber']].filter(Boolean).join(' ');
      const city = tags['addr:city'] ?? tags['addr:town'] ?? tags['addr:village'];
      const address = [street, tags['addr:postcode'], city].filter(Boolean).join(', ') || null;
      const operator = tags.brand ?? tags.operator ?? null;
      const website = tags.website ?? tags['contact:website'] ?? null;

      const base: Cinema = {
        id,
        name,
        lat: p.lat,
        lon: p.lon,
        address,
        operator,
        website,
        distanceKm: 0,
      };
      // Arreglos propios sobre lo que OSM trae mal. Las claves que empiezan por
      // "_" son notas para quien mantiene el fichero: no deben salir en la API.
      const fix = Object.fromEntries(
        Object.entries(OVERRIDES.fix[id] ?? {}).filter(([k]) => !k.startsWith('_')),
      );
      const merged = { ...base, ...fix } as Cinema;
      // La cadena solo se muestra si aporta algo: repetir el nombre debajo del
      // nombre es ruido. Se decide DESPUÉS del arreglo, que puede cambiar ambos.
      merged.operator = merged.operator && merged.operator !== merged.name ? merged.operator : null;
      return merged;
    })
    .filter((c): c is Cinema => c !== null);

  // Salas que OSM no tiene. Solo entran las que caen DENTRO del radio pedido:
  // si no, aparecerían en búsquedas de la otra punta del país.
  for (const extra of OVERRIDES.add) {
    if (haversineKm(lat, lon, extra.lat, extra.lon) * 1000 <= radius) {
      list.push({ operator: null, website: null, address: null, ...extra, distanceKm: 0 });
    }
  }

  return dedupe(list);
}

/**
 * Rejilla a la que se ajusta el punto de búsqueda antes de preguntar a
 * Overpass: 0,01° son ~1,1 km. Con GPS cada lectura cae unos metros más allá y
 * la caché (que iba por milésimas, ~100 m) casi nunca acertaba: cada visita era
 * otra consulta de 3 s a un servicio público. Con la rejilla, todo un barrio
 * comparte resultado. Para no perder salas en el borde, se pide un poco más de
 * radio (`GRID_MARGIN_M`, más que la diagonal de media celda) y luego se
 * recorta desde el punto exacto.
 */
const GRID = 0.01;
const GRID_MARGIN_M = 1500;

export function snapToGrid(lat: number, lon: number): { lat: number; lon: number } {
  const snap = (v: number) => Math.round(Math.round(v / GRID) * GRID * 100) / 100;
  return { lat: snap(lat), lon: snap(lon) };
}

/**
 * Las salas dentro del radio pedido, con su distancia desde el punto exacto de
 * quien busca, de la más cercana a la más lejana. Pura (tiene tests).
 */
export function nearest(list: Cinema[], lat: number, lon: number, radius: number, max = 60): Cinema[] {
  return list
    .map((c) => ({ ...c, distanceKm: Math.round(haversineKm(lat, lon, c.lat, c.lon) * 10) / 10 }))
    .filter((c) => c.distanceKm * 1000 <= radius)
    .sort((a, b) => a.distanceKm - b.distanceKm)
    .slice(0, max);
}

/**
 * Cuánto se espera a un espejo de Overpass antes de lanzar el siguiente en
 * paralelo. Una consulta normal tarda ~3 s; si no ha contestado para entonces,
 * lo normal es que esté saturado.
 */
const HEDGE_MS = 3000;
/**
 * Tiempo total para Overpass, entre todos sus espejos. Pasado este tiempo se
 * pregunta a Nominatim. Antes no había un tope global: en octubre de 2026 los
 * tres espejos se quedaban colgados sin responder, y la página pasaba 31 s en
 * «Buscando» para acabar en error.
 */
const OVERPASS_BUDGET_MS = 9000;
/**
 * Tras un fallo total, durante este tiempo no se pregunta a Overpass y se va
 * directo a Nominatim. Si Overpass está caído, lo estará también en la
 * siguiente búsqueda, y no tiene sentido hacer esperar a cada visita. Si sigue
 * caído al volver a probar, la pausa se dobla (10, 20, 40 min, como mucho una
 * hora): en una caída de días, cada reintento hacía esperar 4 s a alguien.
 */
const OVERPASS_COOLDOWN_MS = 10 * 60 * 1000;
const OVERPASS_COOLDOWN_MAX_MS = 60 * 60 * 1000;
/** Ventaja de Overpass antes de preguntar también a Nominatim (ver findCinemas). */
const OVERPASS_HEAD_START_MS = 4000;
let overpassDownUntil = 0;
let overpassFallos = 0;

/** La pausa tras `fallos` caídas seguidas de Overpass. Pura (tiene tests). */
export function overpassCooldown(fallos: number): number {
  return Math.min(OVERPASS_COOLDOWN_MS * 2 ** Math.max(0, fallos - 1), OVERPASS_COOLDOWN_MAX_MS);
}

async function queryOverpass(q: string): Promise<OverpassElement[]> {
  // Aborta todas las peticiones en curso cuando una gana o se acaba el tiempo:
  // así no quedan peticiones colgadas contra un servicio público.
  const master = new AbortController();
  const ask = async (endpoint: string): Promise<OverpassElement[]> => {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'User-Agent': UA, 'content-type': 'application/x-www-form-urlencoded' },
      body: 'data=' + encodeURIComponent(q),
      signal: AbortSignal.any([master.signal, AbortSignal.timeout(25000)]),
    });
    // 429/504…: cuenta como fallo y deja paso al siguiente espejo.
    if (!res.ok) throw new Error(`overpass http ${res.status}`);
    const json = (await res.json()) as { elements?: OverpassElement[] };
    return json.elements ?? [];
  };

  return new Promise((resolve, reject) => {
    let lanzados = 0;
    let fallidos = 0;
    let terminado = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let lastError: unknown = new Error('overpass unavailable');

    const terminar = (fin: () => void) => {
      terminado = true;
      clearTimeout(timer);
      clearTimeout(tope);
      master.abort();
      fin();
    };
    const tope = setTimeout(() => {
      if (!terminado) terminar(() => reject(new Error('overpass timeout')));
    }, OVERPASS_BUDGET_MS);

    const lanzar = () => {
      if (terminado || lanzados >= OVERPASS_MIRRORS.length) return;
      const endpoint = OVERPASS_MIRRORS[lanzados++];
      // Si este tarda, el siguiente sale sin esperar a que falle.
      clearTimeout(timer);
      timer = setTimeout(lanzar, HEDGE_MS);
      ask(endpoint).then(
        (elements) => {
          if (!terminado) terminar(() => resolve(elements));
        },
        (err) => {
          if (terminado) return;
          lastError = err;
          fallidos++;
          if (fallidos >= OVERPASS_MIRRORS.length) {
            terminar(() => reject(lastError));
          } else if (fallidos >= lanzados) {
            lanzar(); // todos los lanzados han fallado: no hay que esperar
          }
        },
      );
    };
    lanzar();
  });
}

/* ------------------------------------------------------------------ *
 * Alternativa: Nominatim.
 *
 * Es también OpenStreetMap (los mismos objetos y los mismos ids, así que
 * isCinema() y cinemas-overrides.json siguen valiendo), pero tiene dos
 * limitaciones frente a Overpass:
 *   - Busca por un solo tipo cada vez: se piden los cines y, aparte, los
 *     teatros, que pasan por el mismo filtro de nombre que con Overpass (así
 *     sale el multicine del CC Los Arcos de Sevilla, que en OSM es un teatro).
 *   - Devuelve como mucho 40 resultados, ordenados por importancia y no por
 *     distancia. Si la zona se llena, se repite por cuadrantes.
 * Por eso es la alternativa cuando Overpass falla, y no la fuente principal.
 * ------------------------------------------------------------------ */

const NOMINATIM_MAX = 40;
/** Política de Nominatim: como mucho una petición por segundo. */
const NOMINATIM_GAP_MS = 1100;
/** Lo que llega por Nominatim se guarda menos: cuando Overpass vuelva, mejor dato. */
const FALLBACK_TTL_MS = 6 * 60 * 60 * 1000;
/**
 * Los teatros se buscan en un radio menor: hay muchos más teatros que cines mal
 * etiquetados, y los que se rescatan son multicines de ciudad, cerca de quien
 * busca. En todo el radio harían falta el doble de peticiones (una por segundo).
 */
const THEATRE_RADIUS_M = 10_000;
let nominatimNext = 0;

/** Turno para hablar con Nominatim, respetando una petición por segundo. */
async function nominatimTurn(): Promise<void> {
  const now = Date.now();
  const wait = Math.max(0, nominatimNext - now);
  nominatimNext = Math.max(now, nominatimNext) + NOMINATIM_GAP_MS;
  if (wait) await new Promise((r) => setTimeout(r, wait));
}

interface Box {
  minLat: number;
  maxLat: number;
  minLon: number;
  maxLon: number;
}

/** Caja que contiene el círculo de `radius` metros alrededor del punto. */
export function boxAround(lat: number, lon: number, radius: number): Box {
  const dLat = radius / 111_320;
  const dLon = radius / (111_320 * Math.cos((lat * Math.PI) / 180));
  return { minLat: lat - dLat, maxLat: lat + dLat, minLon: lon - dLon, maxLon: lon + dLon };
}

export interface NominatimPlace {
  osm_type: string;
  osm_id: number;
  lat: string;
  lon: string;
  name?: string;
  address?: Record<string, string>;
  extratags?: Record<string, string> | null;
}

/**
 * Convierte los resultados de Nominatim a la forma que trae Overpass, para que
 * pasen por el mismo filtro (parseCinemas) que el resto.
 */
export function nominatimToElements(rows: NominatimPlace[], amenity: 'cinema' | 'theatre' = 'cinema'): OverpassElement[] {
  return rows
    .map((r) => {
      const a = r.address ?? {};
      const tags: Record<string, string> = { ...(r.extratags ?? {}), amenity };
      if (r.name) tags.name = r.name;
      const put = (k: string, v: string | undefined) => {
        if (v && !tags[k]) tags[k] = v;
      };
      put('addr:street', a.road ?? a.pedestrian);
      put('addr:housenumber', a.house_number);
      put('addr:postcode', a.postcode);
      put('addr:city', a.city ?? a.town ?? a.village);
      return { type: r.osm_type, id: r.osm_id, lat: Number(r.lat), lon: Number(r.lon), tags };
    })
    .filter((e) => Number.isFinite(e.lat) && Number.isFinite(e.lon));
}

type Amenity = 'cinema' | 'theatre';

async function nominatimBox(box: Box, amenity: Amenity): Promise<OverpassElement[]> {
  await nominatimTurn();
  const url = new URL(NOMINATIM);
  url.searchParams.set('format', 'jsonv2');
  url.searchParams.set('amenity', amenity);
  url.searchParams.set('viewbox', `${box.minLon},${box.maxLat},${box.maxLon},${box.minLat}`);
  url.searchParams.set('bounded', '1');
  url.searchParams.set('limit', String(NOMINATIM_MAX));
  url.searchParams.set('addressdetails', '1');
  url.searchParams.set('extratags', '1');
  const res = await fetchWithTimeout(url.toString(), { headers: { 'User-Agent': UA, accept: 'application/json' } }, 10000);
  if (!res.ok) throw new Error(`nominatim http ${res.status}`);
  return nominatimToElements((await res.json()) as NominatimPlace[], amenity);
}

/**
 * Todos los objetos de un tipo en la caja. Lanza si falla la primera petición.
 * `split = false` se queda con la primera página aunque venga llena.
 */
async function nominatimAmenity(box: Box, amenity: Amenity, split = true): Promise<OverpassElement[]> {
  const first = await nominatimBox(box, amenity);
  if (!split || first.length < NOMINATIM_MAX) return first;
  // Lleno: podrían faltar salas cercanas. Se repite por cuadrantes, y si alguno
  // falla se usa lo que haya.
  const midLat = (box.minLat + box.maxLat) / 2;
  const midLon = (box.minLon + box.maxLon) / 2;
  const quads: Box[] = [
    { ...box, maxLat: midLat, maxLon: midLon },
    { ...box, maxLat: midLat, minLon: midLon },
    { ...box, minLat: midLat, maxLon: midLon },
    { ...box, minLat: midLat, minLon: midLon },
  ];
  const byId = new Map(first.map((e) => [`${e.type}/${e.id}`, e]));
  for (const q of quads) {
    try {
      for (const e of await nominatimBox(q, amenity)) byId.set(`${e.type}/${e.id}`, e);
    } catch {
      /* lo que haya */
    }
  }
  return [...byId.values()];
}

/**
 * Salas alrededor de un punto según Nominatim. Lanza si falla la búsqueda de
 * cines; si solo falla la de teatros, se sigue sin ellos.
 */
async function queryNominatim(lat: number, lon: number, radius: number): Promise<OverpassElement[]> {
  const cinemas = await nominatimAmenity(boxAround(lat, lon, radius), 'cinema');
  // Los teatros, sin partir en cuadrantes: lo que se busca entre ellos son unos
  // pocos multicines mal etiquetados, y cada cuadrante es un segundo más de
  // espera (una petición por segundo). En Sevilla, con la zona llena de
  // teatros, Los Arcos sale igual en la primera página.
  const theatres = await nominatimAmenity(boxAround(lat, lon, Math.min(radius, THEATRE_RADIUS_M)), 'theatre', false).catch(
    () => [],
  );
  return [...cinemas, ...theatres];
}

/**
 * Salas de cine alrededor de un punto, ordenadas por distancia.
 *
 * Pregunta a los espejos de Overpass y, si tardan o fallan, también a
 * Nominatim. Solo se cachea un resultado EFECTIVO (24 h si hay salas,
 * 6 h si vino de Nominatim, 10 min si vino vacío); si fallan las dos fuentes se
 * LANZA una excepción (el endpoint la traduce a un error reintentable) y **no**
 * se cachea, para no dejar un vacío pegado durante horas.
 */
export async function findCinemas(lat: number, lon: number, radius = 25000): Promise<Cinema[]> {
  const grid = snapToGrid(lat, lon);
  const key = `${grid.lat},${grid.lon},${radius}`;
  const cached = cinemaCache.get(key);
  if (cached && Date.now() < cached.expires) return nearest(cached.data, lat, lon, radius);
  const around = radius + GRID_MARGIN_M;

  // Se piden también los teatros: en OSM hay multicines etiquetados como
  // `amenity=theatre` (el del CC Los Arcos, en Sevilla, entre otros). El filtro
  // por nombre se hace AQUÍ, en isCinema(), y no en la consulta: probado con un
  // regex dentro de Overpass, la petición se pasaba de tiempo; traer los teatros
  // de la zona y cribarlos en casa tarda ~3 s y además deja el criterio a la
  // vista y con tests.
  const q =
    `[out:json][timeout:20];` +
    `(nwr[amenity=cinema](around:${around},${grid.lat},${grid.lon});` +
    `nwr[amenity=theatre](around:${around},${grid.lat},${grid.lon}););` +
    `out center tags;`;

  type Result = { elements: OverpassElement[]; ttl: number };
  const viaNominatim = (): Promise<Result> =>
    queryNominatim(grid.lat, grid.lon, around).then((elements) => ({ elements, ttl: FALLBACK_TTL_MS }));

  // Si las dos fuentes fallan, lanza y el endpoint responde un error reintentable.
  let result: Result;
  if (Date.now() >= overpassDownUntil) {
    const op = queryOverpass(q).then((elements): Result => {
      overpassFallos = 0;
      return { elements, ttl: DAY_MS };
    });
    op.catch(() => {
      overpassFallos++;
      overpassDownUntil = Date.now() + overpassCooldown(overpassFallos);
    });
    // Overpass tiene unos segundos de ventaja; si no ha contestado, se pregunta
    // también a Nominatim y gana la primera respuesta buena. Esperar a que
    // Overpass agote su tiempo y SOLO entonces ir a Nominatim sumaba 15 s.
    const early = await Promise.race([
      op.catch(() => null),
      new Promise<null>((r) => setTimeout(() => r(null), OVERPASS_HEAD_START_MS)),
    ]);
    result = early ?? (await Promise.any([op, viaNominatim()]));
  } else {
    result = await viaNominatim();
  }

  const { elements, ttl } = result;
  const all = parseCinemas(elements, grid.lat, grid.lon, around);
  cinemaCache.set(key, {
    expires: Date.now() + (all.length ? ttl : EMPTY_TTL_MS),
    data: all,
  });
  return nearest(all, lat, lon, radius);
}

/** Para los tests: vuelve a dar una oportunidad a Overpass. */
export function _resetOverpassCooldown(): void {
  overpassDownUntil = 0;
  overpassFallos = 0;
}
