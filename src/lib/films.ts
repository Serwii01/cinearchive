/**
 * Capa de acceso a películas (SOLO SERVIDOR): combina TMDB + OMDb y cachea el
 * resultado en films_cache. OMDb tiene un límite diario bajo, así que su respuesta
 * se reutiliza desde cache durante OMDB_TTL.
 */
import { eq, inArray } from 'drizzle-orm';
import { db } from '../db/client';
import { filmsCache } from '../db/schema';
import {
  getMovie,
  director,
  posterUrl,
  extractWatchProviders,
  type TmdbMovie,
  type WatchAvailability,
} from './tmdb';
import { getOmdbByImdbId, type OmdbData } from './omdb';
import { getFilmLocations, esFormatoActual, type FilmLocations } from './wikidata';
import { createMemo } from './memo';
import { registerCache } from './cache-registry';
import { WATCH_REGIONS } from '../data/countries';

const OMDB_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 días
const WIKIDATA_TTL_MS = 60 * 24 * 60 * 60 * 1000; // 60 días (cambia rara vez)

export interface FilmDetail {
  tmdb: TmdbMovie;
  omdb: OmdbData | null;
  /** Dónde ver, por región ISO. Viene de TMDB/JustWatch, sin coste de cuota. */
  providers: Record<string, WatchAvailability>;
  locations: FilmLocations | null;
}

// La ficha es idéntica para todos los visitantes: durante unos minutos se
// reutiliza el resultado en memoria en lugar de repetir consulta a BD + TMDB +
// upsert en cada visita (una peli popular, o un bot rastreando el catálogo, lo
// repetirían cientos de veces). Las capas de abajo (OMDb y Wikidata)
// mantienen sus TTL largos en films_cache; esto solo evita el trabajo repetido
// a corto plazo.
const FILM_MEMO_TTL_MS = 10 * 60 * 1000; // 10 min
const filmMemo = createMemo<FilmDetail>(FILM_MEMO_TTL_MS, 300);

registerCache({
  id: 'films',
  label: 'Fichas de película',
  ttlMs: FILM_MEMO_TTL_MS,
  maxKeys: 300,
  size: () => filmMemo.size,
  clear: () => filmMemo.clear(),
});

export function getFilm(tmdbId: number, locale: string): Promise<FilmDetail> {
  return filmMemo.get(`${tmdbId}:${locale}`, () => loadFilm(tmdbId, locale));
}

async function loadFilm(tmdbId: number, locale: string): Promise<FilmDetail> {
  const [cached] = await db
    .select()
    .from(filmsCache)
    .where(eq(filmsCache.tmdbId, tmdbId))
    .limit(1);

  // TMDB es generoso: pedimos fresco (texto en el idioma correcto) y, si falla,
  // caemos a la cache para no romper la página.
  let tmdb: TmdbMovie | undefined;
  try {
    tmdb = await getMovie(tmdbId, locale);
  } catch {
    tmdb = cached?.tmdb as TmdbMovie | undefined;
  }
  if (!tmdb) throw new Error(`No se pudo obtener la película ${tmdbId}.`);

  // OMDb: reutilizar de cache si está fresca; si no, refrescar por imdb_id.
  let omdb = (cached?.omdb as OmdbData | null) ?? null;
  const omdbFresh =
    cached?.omdb && Date.now() - new Date(cached.fetchedAt).getTime() < OMDB_TTL_MS;
  if (!omdbFresh && tmdb.imdb_id) {
    omdb = (await getOmdbByImdbId(tmdb.imdb_id)) ?? omdb;
  }

  // Dónde ver: viene incrustado en la respuesta de TMDB que acabamos de pedir,
  // así que siempre está fresco y no gasta ninguna cuota. extractWatchProviders
  // se queda con las regiones que ofrecemos y BORRA el bloque en bruto (45-90 kB
  // por película) antes de que se guarde en films_cache.
  let providers = extractWatchProviders(tmdb, WATCH_REGIONS);
  // Si TMDB falló y estamos sirviendo desde cache, el objeto cacheado ya no trae
  // el bloque en bruto: se reutiliza lo que se guardó la última vez.
  if (Object.keys(providers).length === 0 && cached?.providers) {
    providers = cached.providers as Record<string, WatchAvailability>;
  }

  // Wikidata: localizaciones (rodaje/narrativa). Cache muy prolongada.
  const guardado = (cached?.wikidata as FilmLocations | null) ?? null;
  // Lo guardado antes de que hubiera coordenadas es solo una lista de nombres:
  // no sirve para el mapa. Se descarta y se vuelve a consultar en la primera
  // visita, en vez de esperar los 60 días del TTL.
  let locations = esFormatoActual(guardado) ? guardado : null;
  const wdFresh =
    locations !== null &&
    cached?.wikidataFetchedAt &&
    Date.now() - new Date(cached.wikidataFetchedAt).getTime() < WIKIDATA_TTL_MS;
  let wikidataFetchedAt = cached?.wikidataFetchedAt ?? null;
  if (!wdFresh && tmdb.imdb_id) {
    const fresh = await getFilmLocations(tmdb.imdb_id);
    if (fresh) {
      locations = fresh;
      wikidataFetchedAt = new Date();
    }
  }

  await db
    .insert(filmsCache)
    .values({ tmdbId, tmdb, omdb, providers, wikidata: locations, wikidataFetchedAt, fetchedAt: new Date() })
    .onConflictDoUpdate({
      target: filmsCache.tmdbId,
      set: { tmdb, omdb, providers, wikidata: locations, wikidataFetchedAt, fetchedAt: new Date() },
    });

  return { tmdb, omdb, providers, locations };
}

export interface FilmBrief {
  tmdbId: number;
  title: string;
  year: string;
  director: string | null;
  poster: string | null;
  genreIds: number[];
  decade: number | null;
  runtime: number;
}

function briefFromTmdb(m: TmdbMovie): FilmBrief {
  const year = m.release_date ? Number(m.release_date.slice(0, 4)) : null;
  return {
    tmdbId: m.id,
    title: m.title,
    year: year ? String(year) : '',
    director: director(m),
    poster: posterUrl(m.poster_path, 'w185'),
    genreIds: (m.genres ?? []).map((g) => g.id),
    decade: year ? Math.floor(year / 10) * 10 : null,
    runtime: m.runtime ?? 0,
  };
}

/**
 * Resúmenes para una lista de IDs. Usa films_cache; para los que falten, los
 * pide a TMDB (y de paso los cachea). Devuelve un mapa id → FilmBrief.
 */
export async function getFilmsBrief(
  tmdbIds: number[],
  locale: string,
): Promise<Map<number, FilmBrief>> {
  const out = new Map<number, FilmBrief>();
  if (tmdbIds.length === 0) return out;

  const cached = await db
    .select()
    .from(filmsCache)
    .where(inArray(filmsCache.tmdbId, tmdbIds));
  for (const row of cached) out.set(row.tmdbId, briefFromTmdb(row.tmdb as TmdbMovie));

  // Para los que falten pedimos SOLO a TMDB (no OMDb ni Wikidata, que son
  // lentos y aquí no se usan) y en paralelo; se cachea el tmdb para la ficha completa.
  const missing = tmdbIds.filter((id) => !out.has(id));
  await Promise.all(
    missing.map(async (id) => {
      try {
        const tmdb = await getMovie(id, locale);
        out.set(id, briefFromTmdb(tmdb));
        await db
          .insert(filmsCache)
          .values({ tmdbId: id, tmdb, fetchedAt: new Date() })
          .onConflictDoUpdate({ target: filmsCache.tmdbId, set: { tmdb, fetchedAt: new Date() } });
      } catch {
        /* ignorar IDs no resolubles */
      }
    }),
  );
  return out;
}
