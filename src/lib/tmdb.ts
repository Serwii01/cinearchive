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
  overview: string;
  vote_average: number;
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
  release_date?: string;
  runtime: number | null;
  poster_path: string | null;
  backdrop_path: string | null;
  vote_average: number;
  genres: { id: number; name: string }[];
  production_countries: { iso_3166_1: string; name: string }[];
  credits?: { crew: { job: string; name: string }[]; cast: { name: string; character: string }[] };
  keywords?: { keywords: { id: number; name: string }[] };
  recommendations?: { results: TmdbSearchResult[] };
  similar?: { results: TmdbSearchResult[] };
}

export async function getMovie(id: number, locale: string) {
  return tmdbFetch<TmdbMovie>(`/movie/${id}`, {
    language: toTmdbLang(locale),
    append_to_response: 'credits,keywords,recommendations,similar',
  });
}

export async function discoverByGenres(genreIds: number[], locale: string) {
  const data = await tmdbFetch<{ results: TmdbSearchResult[] }>('/discover/movie', {
    language: toTmdbLang(locale),
    with_genres: genreIds.join(','),
    sort_by: 'vote_average.desc',
    'vote_count.gte': '500',
    page: '1',
  });
  return data.results;
}

export function director(movie: TmdbMovie): string | null {
  return movie.credits?.crew.find((c) => c.job === 'Director')?.name ?? null;
}

export function posterUrl(path: string | null, size: 'w185' | 'w342' | 'w500' = 'w342') {
  return path ? `${TMDB_IMG}/${size}${path}` : null;
}
