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
const OVERPASS = 'https://overpass-api.de/api/interpreter';

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
const geoCache = new Map<string, { time: number; data: GeoPoint | null }>();
const cinemaCache = new Map<string, { time: number; data: Cinema[] }>();

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

/** Geocodifica un texto (ciudad / código postal) restringido a España. */
export async function geocode(query: string): Promise<GeoPoint | null> {
  const key = query.trim().toLowerCase().slice(0, 120);
  const cached = geoCache.get(key);
  if (fresh(cached)) return cached.data;

  const url = new URL(NOMINATIM);
  url.searchParams.set('format', 'json');
  url.searchParams.set('limit', '1');
  url.searchParams.set('addressdetails', '0');

  // Detección de código postal: si el texto no tiene letras y son 4-5 dígitos, se
  // usa la consulta ESTRUCTURADA de Nominatim (más fiable que la libre para CPs).
  // Un CP de 4 dígitos se rellena con cero a la izquierda (p. ej. 1007 → 01007).
  const raw = query.trim();
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

  let data: GeoPoint | null = null;
  try {
    const res = await fetchWithTimeout(url.toString(), {
      headers: { 'User-Agent': UA, accept: 'application/json' },
    });
    if (res.ok) {
      const rows = (await res.json()) as Array<{ lat: string; lon: string; display_name: string }>;
      const r = rows[0];
      if (r) {
        const lat = Number(r.lat);
        const lon = Number(r.lon);
        if (Number.isFinite(lat) && Number.isFinite(lon)) {
          data = { lat, lon, label: r.display_name };
        }
      }
    }
  } catch {
    /* red/timeout: se devuelve null y el endpoint responde "not_found" */
  }
  geoCache.set(key, { time: Date.now(), data });
  return data;
}

/** Salas de cine (amenity=cinema) alrededor de un punto, ordenadas por distancia. */
export async function findCinemas(lat: number, lon: number, radius = 25000): Promise<Cinema[]> {
  const key = `${lat.toFixed(3)},${lon.toFixed(3)},${radius}`;
  const cached = cinemaCache.get(key);
  if (fresh(cached)) return cached.data;

  // El timeout del cliente (abajo, 22 s) debe superar el de la consulta Overpass
  // (18 s), si no se abortaría la petición antes de que el servidor responda.
  const q =
    `[out:json][timeout:18];` +
    `nwr[amenity=cinema](around:${radius},${lat},${lon});` +
    `out center tags;`;

  let out: Cinema[] = [];
  try {
    const res = await fetchWithTimeout(
      OVERPASS,
      {
        method: 'POST',
        headers: { 'User-Agent': UA, 'content-type': 'application/x-www-form-urlencoded' },
        body: 'data=' + encodeURIComponent(q),
      },
      22000,
    );
    if (res.ok) {
      const json = (await res.json()) as {
        elements: Array<{
          type: string;
          id: number;
          lat?: number;
          lon?: number;
          center?: { lat: number; lon: number };
          tags?: Record<string, string>;
        }>;
      };
      out = json.elements
        .map((el) => {
          const p = el.center ?? (el.lat != null && el.lon != null ? { lat: el.lat, lon: el.lon } : null);
          const tags = el.tags ?? {};
          // Nombre con respaldo en la marca/cadena: recupera salas sin `name` pero
          // con `brand`/`operator` (multiplex de cadena, que antes se descartaban).
          const name = tags.name ?? tags.brand ?? tags.operator;
          if (!p || !name) return null;
          const street = [tags['addr:street'], tags['addr:housenumber']].filter(Boolean).join(' ');
          const city = tags['addr:city'] ?? tags['addr:town'] ?? tags['addr:village'];
          const address =
            [street, tags['addr:postcode'], city].filter(Boolean).join(', ') || null;
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
  } catch {
    /* red/timeout: se devuelve lista vacía */
  }
  cinemaCache.set(key, { time: Date.now(), data: out });
  return out;
}
