/**
 * "Encuentra tu cine" — SOLO SERVIDOR.
 *
 * Busca salas de cine reales cerca de una ubicación en España (península e islas)
 * con datos abiertos de OpenStreetMap:
 *   - Nominatim: geocodifica una ciudad / código postal → coordenadas.
 *   - Overpass:  lista los `amenity=cinema` en un radio alrededor del punto.
 *
 * Se llama solo desde /api/cinemas (proxy con rate-limit). Cumple la política de
 * uso de Nominatim: User-Agent identificable, resultados cacheados, ≤1 req/s y
 * atribución © OpenStreetMap (mostrada en la página). No se descargan zonas
 * enteras: siempre alrededor de un punto que el usuario proporciona.
 */

// Identifica la aplicación ante Nominatim/Overpass (requerido por su política).
const UA = 'CineArchive/1.0 (+https://cinearchive.es)';
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
  name: string;
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

interface PhotonFeature {
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
 * Sugerencias de lugares para el autocompletado (hasta 6), restringidas a España.
 * Usa Photon con `osm_tag=place` (solo entidades de población / códigos postales),
 * sesgado al centro peninsular para mejorar el ranking. Se cachea por texto; ante
 * fallo de red se devuelve lista vacía (nunca lanza).
 */
export async function suggestPlaces(query: string): Promise<GeoPoint[]> {
  const raw = query.trim();
  if (raw.length < 2) return [];
  const key = raw.toLowerCase().slice(0, 120);
  const cached = suggestCache.get(key);
  if (fresh(cached)) return cached.data;

  const url = new URL(PHOTON);
  url.searchParams.set('q', raw);
  url.searchParams.set('limit', '6');
  url.searchParams.set('osm_tag', 'place'); // ciudades/pueblos/CP, no comercios
  url.searchParams.set('lat', '40.4'); // sesgo al centro de España (mejor ranking)
  url.searchParams.set('lon', '-3.7');

  let data: GeoPoint[] = [];
  try {
    const res = await fetchWithTimeout(url.toString(), {
      headers: { 'User-Agent': UA, accept: 'application/json' },
    });
    if (res.ok) {
      const json = (await res.json()) as { features?: PhotonFeature[] };
      const seen = new Set<string>();
      data = (json.features ?? [])
        .map((f) => {
          const p = f.properties ?? {};
          const c = f.geometry?.coordinates;
          if (p.countrycode !== 'ES' || !c) return null;
          const [lon, lat] = c;
          if (!Number.isFinite(lat) || !Number.isFinite(lon) || !inSpain(lat, lon)) return null;
          const label = photonLabel(p);
          if (!label || seen.has(label)) return null;
          seen.add(label);
          return { lat, lon, label } satisfies GeoPoint;
        })
        .filter((p): p is GeoPoint => p !== null);
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

/** Convierte la respuesta de Overpass en cines ordenados por distancia. */
function parseCinemas(elements: OverpassElement[], lat: number, lon: number): Cinema[] {
  return elements
    .map((el) => {
      const p = el.center ?? (el.lat != null && el.lon != null ? { lat: el.lat, lon: el.lon } : null);
      const tags = el.tags ?? {};
      // Nombre con respaldo en la marca/cadena: recupera salas sin `name` pero
      // con `brand`/`operator` (multiplex de cadena, que antes se descartaban).
      const name = tags.name ?? tags.brand ?? tags.operator;
      if (!p || !name) return null;
      const street = [tags['addr:street'], tags['addr:housenumber']].filter(Boolean).join(' ');
      const city = tags['addr:city'] ?? tags['addr:town'] ?? tags['addr:village'];
      const address = [street, tags['addr:postcode'], city].filter(Boolean).join(', ') || null;
      const operator = tags.brand ?? tags.operator ?? null;
      const website = tags.website ?? tags['contact:website'] ?? null;
      return {
        id: `${el.type}/${el.id}`,
        name,
        lat: p.lat,
        lon: p.lon,
        address,
        operator: operator && operator !== name ? operator : null,
        website,
        distanceKm: Math.round(haversineKm(lat, lon, p.lat, p.lon) * 10) / 10,
      } satisfies Cinema;
    })
    .filter((c): c is Cinema => c !== null)
    .sort((a, b) => a.distanceKm - b.distanceKm)
    .slice(0, 60);
}

/**
 * Salas de cine (amenity=cinema) alrededor de un punto, ordenadas por distancia.
 *
 * Prueba los espejos de Overpass en orden y usa el primero que responda. Solo se
 * cachea un resultado EFECTIVO (24 h si hay salas, 10 min si vino vacío); si todos
 * los espejos fallan se LANZA una excepción (el endpoint la traduce a un error
 * reintentable) y **no** se cachea, para no dejar un vacío pegado durante horas.
 */
export async function findCinemas(lat: number, lon: number, radius = 25000): Promise<Cinema[]> {
  const key = `${lat.toFixed(3)},${lon.toFixed(3)},${radius}`;
  const cached = cinemaCache.get(key);
  if (cached && Date.now() < cached.expires) return cached.data;

  // El timeout del cliente (15 s) debe superar el de la consulta Overpass (12 s),
  // si no se abortaría la petición antes de que el servidor responda.
  const q =
    `[out:json][timeout:12];` +
    `nwr[amenity=cinema](around:${radius},${lat},${lon});` +
    `out center tags;`;

  let lastError: unknown = new Error('overpass unavailable');
  for (const endpoint of OVERPASS_MIRRORS) {
    try {
      const res = await fetchWithTimeout(
        endpoint,
        {
          method: 'POST',
          headers: { 'User-Agent': UA, 'content-type': 'application/x-www-form-urlencoded' },
          body: 'data=' + encodeURIComponent(q),
        },
        15000,
      );
      if (!res.ok) {
        lastError = new Error(`overpass http ${res.status}`);
        continue; // 429/504…: prueba el siguiente espejo
      }
      const json = (await res.json()) as { elements: OverpassElement[] };
      const out = parseCinemas(json.elements ?? [], lat, lon);
      cinemaCache.set(key, {
        expires: Date.now() + (out.length ? DAY_MS : EMPTY_TTL_MS),
        data: out,
      });
      return out;
    } catch (err) {
      lastError = err; // red/timeout/JSON: prueba el siguiente espejo
    }
  }
  // Ningún espejo respondió: se propaga para responder "error" reintentable.
  throw lastError;
}
