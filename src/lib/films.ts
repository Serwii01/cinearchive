/**
 * Capa de acceso a películas (SOLO SERVIDOR): combina TMDB + OMDb y cachea el
 * resultado en films_cache. OMDb tiene un límite diario bajo, así que su respuesta
 * se reutiliza desde cache durante OMDB_TTL.
 */
import { eq, inArray } from 'drizzle-orm';
import { db } from '../db/client';
import { filmsCache } from '../db/schema';
import { getMovie, director, posterUrl, type TmdbMovie } from './tmdb';
import { getOmdbByImdbId, type OmdbData } from './omdb';
import { getWatchSources, type WatchAvailability } from './watchmode';

const OMDB_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 días
const WATCHMODE_TTL_MS = 14 * 24 * 60 * 60 * 1000; // 14 días (límite mensual bajo)

export interface FilmDetail {
  tmdb: TmdbMovie;
  omdb: OmdbData | null;
  watchmode: WatchAvailability | null;
}

export async function getFilm(tmdbId: number, locale: string): Promise<FilmDetail> {
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

  // Watchmode: cache prolongada (límite mensual bajo).
  let watchmode = (cached?.watchmode as WatchAvailability | null) ?? null;
  const wmFresh =
    cached?.watchmodeFetchedAt &&
    Date.now() - new Date(cached.watchmodeFetchedAt).getTime() < WATCHMODE_TTL_MS;
  let watchmodeFetchedAt = cached?.watchmodeFetchedAt ?? null;
  if (!wmFresh) {
    const fresh = await getWatchSources(tmdbId, 'ES');
    if (fresh) {
      watchmode = fresh;
      watchmodeFetchedAt = new Date();
    }
  }

  await db
    .insert(filmsCache)
    .values({ tmdbId, tmdb, omdb, watchmode, watchmodeFetchedAt, fetchedAt: new Date() })
    .onConflictDoUpdate({
      target: filmsCache.tmdbId,
      set: { tmdb, omdb, watchmode, watchmodeFetchedAt, fetchedAt: new Date() },
    });

  return { tmdb, omdb, watchmode };
}

export interface FilmBrief {
  tmdbId: number;
  title: string;
  year: string;
  director: string | null;
  poster: string | null;
}

function briefFromTmdb(m: TmdbMovie): FilmBrief {
  return {
    tmdbId: m.id,
    title: m.title,
    year: m.release_date ? m.release_date.slice(0, 4) : '',
    director: director(m),
    poster: posterUrl(m.poster_path, 'w185'),
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

  const missing = tmdbIds.filter((id) => !out.has(id));
  for (const id of missing) {
    try {
      const { tmdb } = await getFilm(id, locale);
      out.set(id, briefFromTmdb(tmdb));
    } catch {
      /* ignorar IDs no resolubles */
    }
  }
  return out;
}
