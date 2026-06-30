/**
 * Cliente de Watchmode — SOLO SERVIDOR. Indica dónde se puede ver una película
 * (suscripción / alquiler / compra / gratis) por región.
 *
 * Clave en process.env.WATCHMODE_API_KEY (sin PUBLIC_). El plan gratuito es de
 * 1000 peticiones/mes, así que el resultado se cachea de forma prolongada en
 * films_cache (ver lib/films.ts). Si no hay clave, devuelve null y la sección
 * simplemente no se muestra.
 */

const BASE = 'https://api.watchmode.com/v1';

// Cortacircuitos: si Watchmode responde 429 (cuota agotada), dejamos de llamarla
// durante un rato para no malgastar peticiones ni saturar (degrada con elegancia).
let quotaOutUntil = 0;
const QUOTA_COOLDOWN = 60 * 60_000; // 1 h
const isQuotaOut = () => Date.now() < quotaOutUntil;
const markQuotaOut = () => {
  quotaOutUntil = Date.now() + QUOTA_COOLDOWN;
};

export type SourceType = 'sub' | 'rent' | 'buy' | 'free';

export interface WatchSource {
  name: string;
  type: SourceType;
  url: string;
  format?: string;
}

export interface WatchAvailability {
  region: string;
  sources: WatchSource[];
}

interface WatchmodeRawSource {
  name: string;
  type: string; // sub | rent | buy | free | tve
  web_url: string;
  format?: string;
  region: string;
}

function normalizeType(t: string): SourceType | null {
  if (t === 'sub' || t === 'free' || t === 'rent' || t === 'buy') return t;
  if (t === 'tve') return 'sub'; // "TV everywhere" → lo tratamos como suscripción
  return null;
}

/**
 * Devuelve las plataformas donde ver la película en la región dada (por defecto ES).
 * Hace 2 llamadas: mapear tmdbId → id de Watchmode, y obtener las fuentes.
 */
export type WatchmodeStatus =
  | { ok: true; quota: number; quotaUsed: number }
  | { ok: false; reason: 'nokey' | 'quota' | 'error' };

// Cachea el estado en memoria para no gastar una petición de cuota en cada vista
// del panel admin (la cuota es de solo 1000/mes).
let statusCache: { at: number; data: WatchmodeStatus } | null = null;
const STATUS_TTL = 30 * 60_000; // 30 min

/** Estado/cuota de la cuenta de Watchmode (para el panel admin). */
export async function getWatchmodeStatus(): Promise<WatchmodeStatus> {
  const key = process.env.WATCHMODE_API_KEY;
  if (!key) return { ok: false, reason: 'nokey' };
  if (statusCache && Date.now() - statusCache.at < STATUS_TTL) return statusCache.data;

  let data: WatchmodeStatus;
  try {
    const res = await fetch(`${BASE}/status/?apiKey=${key}`);
    if (res.status === 429) {
      markQuotaOut();
      data = { ok: false, reason: 'quota' };
    }
    else if (!res.ok) data = { ok: false, reason: 'error' };
    else {
      const d = (await res.json()) as { quota?: number; quotaUsed?: number };
      data =
        typeof d.quota === 'number'
          ? { ok: true, quota: d.quota, quotaUsed: d.quotaUsed ?? 0 }
          : { ok: false, reason: 'error' };
    }
  } catch {
    data = { ok: false, reason: 'error' };
  }
  statusCache = { at: Date.now(), data };
  return data;
}

export async function getWatchSources(
  tmdbId: number,
  region = 'ES',
): Promise<WatchAvailability | null> {
  const key = process.env.WATCHMODE_API_KEY;
  if (!key) return null;
  if (isQuotaOut()) return null; // cortacircuitos tras un 429 reciente

  try {
    // 1) Buscar el título de Watchmode por su TMDB movie id.
    const searchUrl = new URL(`${BASE}/search/`);
    searchUrl.searchParams.set('apiKey', key);
    searchUrl.searchParams.set('search_field', 'tmdb_movie_id');
    searchUrl.searchParams.set('search_value', String(tmdbId));
    const sRes = await fetch(searchUrl);
    if (sRes.status === 429) {
      markQuotaOut();
      return null;
    }
    if (!sRes.ok) return null;
    const sData = (await sRes.json()) as { title_results?: { id: number }[] };
    const titleId = sData.title_results?.[0]?.id;
    if (!titleId) return { region, sources: [] };

    // 2) Obtener las fuentes (plataformas) de ese título en la región.
    const srcUrl = new URL(`${BASE}/title/${titleId}/sources/`);
    srcUrl.searchParams.set('apiKey', key);
    srcUrl.searchParams.set('regions', region);
    const rRes = await fetch(srcUrl);
    if (rRes.status === 429) {
      markQuotaOut();
      return null;
    }
    if (!rRes.ok) return { region, sources: [] };
    const raw = (await rRes.json()) as WatchmodeRawSource[];

    // Deduplicar por nombre+tipo y quedarnos con la región pedida.
    const seen = new Set<string>();
    const sources: WatchSource[] = [];
    for (const s of raw) {
      if (s.region !== region) continue;
      const type = normalizeType(s.type);
      if (!type) continue;
      const key2 = `${s.name}|${type}`;
      if (seen.has(key2)) continue;
      seen.add(key2);
      sources.push({ name: s.name, type, url: s.web_url, format: s.format });
    }
    return { region, sources };
  } catch {
    return null;
  }
}
