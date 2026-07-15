/**
 * Cliente de The Movie Database (TMDB) — SOLO SERVIDOR.
 * La clave se lee de process.env.TMDB_API_KEY (sin prefijo PUBLIC_), por lo que
 * nunca llega al navegador. El cliente solo se invoca desde rutas /api/* y libs
 * del servidor.
 */

const BASE = 'https://api.themoviedb.org/3';
export const TMDB_IMG = 'https://image.tmdb.org/t/p';

export type TmdbLang = 'es-ES' | 'en-US';
export function toTmdbLang(locale: string): TmdbLang {
  return locale === 'en' ? 'en-US' : 'es-ES';
}

function apiKey(): string {
  const key = process.env.TMDB_API_KEY;
  if (!key) throw new Error('TMDB_API_KEY no está configurada en el servidor.');
  return key;
}

async function tmdbFetch<T>(path: string, params: Record<string, string> = {}): Promise<T> {
  const url = new URL(`${BASE}${path}`);
  url.searchParams.set('api_key', apiKey());
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  const res = await fetch(url, { headers: { accept: 'application/json' } });
  if (!res.ok) throw new Error(`TMDB ${res.status} en ${path}`);
  return res.json() as Promise<T>;
}

export interface TmdbSearchResult {
  id: number;
  title: string;
  original_title: string;
  release_date?: string;
  poster_path: string | null;
  backdrop_path?: string | null;
  overview: string;
  vote_average: number;
  vote_count?: number;
  popularity?: number;
  genre_ids?: number[];
}

export async function searchMovies(query: string, locale: string) {
  const data = await tmdbFetch<{ results: TmdbSearchResult[] }>('/search/movie', {
    query,
    language: toTmdbLang(locale),
    include_adult: 'false',
    page: '1',
  });
  return data.results.slice(0, 20);
}

export interface TmdbMovie {
  id: number;
  imdb_id: string | null;
  title: string;
  original_title: string;
  overview: string;
  tagline?: string;
  release_date?: string;
  runtime: number | null;
  budget?: number;
  revenue?: number;
  original_language?: string;
  poster_path: string | null;
  backdrop_path: string | null;
  vote_average: number;
  vote_count?: number;
  genres: { id: number; name: string }[];
  production_countries: { iso_3166_1: string; name: string }[];
  production_companies?: { id: number; name: string }[];
  credits?: {
    crew: { id: number; job: string; name: string }[];
    cast: { id: number; name: string; character: string; profile_path: string | null }[];
  };
  keywords?: { keywords: { id: number; name: string }[] };
  recommendations?: { results: TmdbSearchResult[] };
  similar?: { results: TmdbSearchResult[] };
  videos?: { results: { key: string; site: string; type: string; name: string; official?: boolean }[] };
}

export async function getMovie(id: number, locale: string) {
  return tmdbFetch<TmdbMovie>(`/movie/${id}`, {
    language: toTmdbLang(locale),
    append_to_response: 'credits,keywords,recommendations,similar,videos',
  });
}

/** Clave de YouTube del mejor tráiler (oficial > tráiler > teaser), o null. */
export function trailerKey(movie: TmdbMovie): string | null {
  const vids = (movie.videos?.results ?? []).filter((v) => v.site === 'YouTube');
  if (vids.length === 0) return null;
  const score = (v: { type: string; official?: boolean }) =>
    (v.type === 'Trailer' ? 2 : v.type === 'Teaser' ? 1 : 0) + (v.official ? 1 : 0);
  return vids.slice().sort((a, b) => score(b) - score(a))[0]?.key ?? null;
}

export interface TmdbTrending extends TmdbSearchResult {
  backdrop_path: string | null;
}

export async function trendingDay(locale: string) {
  const data = await tmdbFetch<{ results: TmdbTrending[] }>('/trending/movie/day', {
    language: toTmdbLang(locale),
  });
  return data.results;
}

export async function discoverByGenres(
  genreIds: number[],
  locale: string,
  sort: 'vote_average.desc' | 'popularity.desc' = 'vote_average.desc',
  page = 1,
) {
  const data = await tmdbFetch<{ results: TmdbSearchResult[] }>('/discover/movie', {
    language: toTmdbLang(locale),
    // OR entre géneros ('|'): basta con que coincida uno, para un pool amplio.
    with_genres: genreIds.join('|'),
    sort_by: sort,
    'vote_count.gte': sort === 'popularity.desc' ? '100' : '300',
    include_adult: 'false',
    page: String(page),
  });
  return data.results;
}

/** Busca una persona por nombre y devuelve su id de TMDB (o null). */
export async function searchPerson(name: string, locale: string): Promise<number | null> {
  const data = await tmdbFetch<{ results: { id: number }[] }>('/search/person', {
    query: name,
    language: toTmdbLang(locale),
    include_adult: 'false',
    page: '1',
  });
  return data.results[0]?.id ?? null;
}

/** Películas dirigidas/escritas por una persona (para directores favoritos). */
export async function discoverByCrew(personId: number, locale: string) {
  const data = await tmdbFetch<{ results: TmdbSearchResult[] }>('/discover/movie', {
    language: toTmdbLang(locale),
    with_crew: String(personId),
    sort_by: 'vote_average.desc',
    'vote_count.gte': '50',
    include_adult: 'false',
    page: '1',
  });
  return data.results;
}

/** Populares (arranque en frío / relleno hasta el mínimo de recomendaciones). */
export async function popularMovies(locale: string, page = 1) {
  const data = await tmdbFetch<{ results: TmdbSearchResult[] }>('/movie/popular', {
    language: toTmdbLang(locale),
    page: String(page),
  });
  return data.results;
}

export function director(movie: TmdbMovie): string | null {
  return movie.credits?.crew.find((c) => c.job === 'Director')?.name ?? null;
}

/** Director con su id de TMDB (para enlazar a su ficha de persona), o null. */
export function directorPerson(movie: TmdbMovie): { id: number; name: string } | null {
  const d = movie.credits?.crew.find((c) => c.job === 'Director');
  return d ? { id: d.id, name: d.name } : null;
}

export interface TmdbPersonCredit {
  id: number;
  title?: string;
  poster_path: string | null;
  release_date?: string;
  character?: string;
  job?: string;
  department?: string;
  vote_count?: number;
}

export interface TmdbPerson {
  id: number;
  name: string;
  biography: string;
  birthday: string | null;
  deathday: string | null;
  place_of_birth: string | null;
  profile_path: string | null;
  known_for_department: string | null;
  movie_credits: { cast: TmdbPersonCredit[]; crew: TmdbPersonCredit[] };
}

/**
 * Persona (director, intérprete…) con su filmografía. Si la biografía no existe
 * en el idioma pedido, recurre a la inglesa para no dejar la ficha vacía.
 */
export async function getPerson(id: number, locale: string): Promise<TmdbPerson> {
  const person = await tmdbFetch<TmdbPerson>(`/person/${id}`, {
    language: toTmdbLang(locale),
    append_to_response: 'movie_credits',
  });
  if (!person.biography && toTmdbLang(locale) !== 'en-US') {
    try {
      const en = await tmdbFetch<{ biography: string }>(`/person/${id}`, { language: 'en-US' });
      if (en.biography) person.biography = en.biography;
    } catch {
      /* sin biografía */
    }
  }
  return person;
}

export type PosterSize = 'w185' | 'w342' | 'w500' | 'w780';
export function posterUrl(path: string | null, size: PosterSize = 'w342') {
  return path ? `${TMDB_IMG}/${size}${path}` : null;
}

/** srcset 1x/2x para imágenes nítidas en pantallas retina. */
export function posterSrcset(path: string | null, base: PosterSize = 'w342', retina: PosterSize = 'w500') {
  if (!path) return null;
  return `${TMDB_IMG}/${base}${path} 1x, ${TMDB_IMG}/${retina}${path} 2x`;
}

export function backdropUrl(path: string | null, size: 'w780' | 'w1280' = 'w1280') {
  return path ? `${TMDB_IMG}/${size}${path}` : null;
}

/** Foto de perfil de una persona del reparto. */
export function profileUrl(path: string | null, size: 'w185' | 'h632' = 'w185') {
  return path ? `${TMDB_IMG}/${size}${path}` : null;
}

export interface DiscoverParams {
  genres?: number[];
  decade?: number; // p. ej. 1980 → 1980-01-01..1989-12-31
  country?: string; // ISO 3166-1 (origen)
  sort?: 'popularity.desc' | 'vote_average.desc' | 'primary_release_date.desc' | 'revenue.desc';
  page?: number;
}

/** Explorador del catálogo de TMDB para la página Descubrir. */
export async function discoverMovies(opts: DiscoverParams, locale: string) {
  const params: Record<string, string> = {
    language: toTmdbLang(locale),
    sort_by: opts.sort ?? 'popularity.desc',
    include_adult: 'false',
    page: String(opts.page ?? 1),
    'vote_count.gte': opts.sort === 'vote_average.desc' ? '300' : '50',
  };
  if (opts.genres?.length) params.with_genres = opts.genres.join('|');
  if (opts.country) params.with_origin_country = opts.country;
  if (opts.decade) {
    params['primary_release_date.gte'] = `${opts.decade}-01-01`;
    params['primary_release_date.lte'] = `${opts.decade + 9}-12-31`;
  }
  const data = await tmdbFetch<{ results: TmdbSearchResult[]; total_pages: number }>(
    '/discover/movie',
    params,
  );
  return { results: data.results, totalPages: Math.min(data.total_pages, 500) };
}
