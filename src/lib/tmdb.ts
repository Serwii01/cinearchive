/**
 * Cliente de The Movie Database (TMDB) — SOLO SERVIDOR.
 * La clave se lee de process.env.TMDB_API_KEY (sin prefijo PUBLIC_), por lo que
 * nunca llega al navegador. El cliente solo se invoca desde rutas /api/* y libs
 * del servidor.
 */

import { createMemo } from './memo';

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
  /** Dónde ver, por región ISO. Llega con append_to_response; se poda antes de cachear. */
  'watch/providers'?: { results: Record<string, TmdbRegionProviders> };
}

export async function getMovie(id: number, locale: string) {
  return tmdbFetch<TmdbMovie>(`/movie/${id}`, {
    language: toTmdbLang(locale),
    // 'watch/providers' viene EN ESTA MISMA petición (append_to_response): el
    // "dónde ver" no cuesta ni una llamada extra ni tiene cuota propia.
    append_to_response: 'credits,keywords,recommendations,similar,videos,watch/providers',
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

/** Ordenaciones admitidas en Descubrir (subconjunto seguro de sort_by de TMDB). */
export const DISCOVER_SORTS = [
  'popularity.desc',
  'vote_average.desc',
  'vote_count.desc',
  'primary_release_date.desc',
  'primary_release_date.asc',
  'revenue.desc',
  'title.asc',
] as const;
export type DiscoverSort = (typeof DISCOVER_SORTS)[number];

export interface DiscoverParams {
  genres?: number[];
  genreMode?: 'and' | 'or'; // combinar géneros: AND (coma) por defecto, OR (barra)
  excludeGenres?: number[]; // without_genres
  decade?: number; // p. ej. 1980 → 1980-01-01..1989-12-31
  yearFrom?: number; // año de estreno mínimo (tiene prioridad sobre decade)
  yearTo?: number; // año de estreno máximo (tiene prioridad sobre decade)
  country?: string; // ISO 3166-1 (origen)
  originalLanguage?: string; // ISO 639-1 (idioma original)
  minRating?: number; // vote_average.gte (0-10)
  minVotes?: number; // vote_count.gte
  runtimeGte?: number; // duración mínima (minutos)
  runtimeLte?: number; // duración máxima (minutos)
  /** Filtro "dónde ver": ids de plataforma (TMDB/JustWatch). Exige watchRegion. */
  watchProviders?: number[];
  watchRegion?: string; // ISO 3166-1 de la región de disponibilidad
  /** Modalidades: sub | free | ads | rent | buy. Vacío = cualquiera. */
  watchTypes?: WatchType[];
  sort?: DiscoverSort;
  page?: number;
}

export interface DiscoverResult {
  results: TmdbSearchResult[];
  totalPages: number;
  /** Total real de coincidencias (TMDB solo sirve las 500 primeras páginas). */
  totalResults: number;
}

/** Nuestras modalidades → las que entiende with_watch_monetization_types. */
const MONETIZATION: Record<WatchType, string> = {
  sub: 'flatrate',
  free: 'free',
  ads: 'ads',
  rent: 'rent',
  buy: 'buy',
};

/** Explorador del catálogo de TMDB para la página Descubrir. */
export async function discoverMovies(opts: DiscoverParams, locale: string): Promise<DiscoverResult> {
  // Suelo de votos: evita que "mejor valoradas" devuelva 10/10 con un puñado de
  // votos. El usuario puede elevarlo (minVotes) pero no bajarlo de ese suelo.
  const voteFloor = opts.sort === 'vote_average.desc' ? 300 : 50;
  const params: Record<string, string> = {
    language: toTmdbLang(locale),
    sort_by: opts.sort ?? 'popularity.desc',
    include_adult: 'false',
    page: String(opts.page ?? 1),
    'vote_count.gte': String(Math.max(voteFloor, opts.minVotes ?? 0)),
  };
  // AND ('coma') = la película es de TODOS los géneros; OR ('|') = de cualquiera.
  if (opts.genres?.length) params.with_genres = opts.genres.join(opts.genreMode === 'or' ? '|' : ',');
  if (opts.excludeGenres?.length) params.without_genres = opts.excludeGenres.join('|');
  if (opts.country) params.with_origin_country = opts.country;
  if (opts.originalLanguage) params.with_original_language = opts.originalLanguage;
  if (opts.minRating != null) params['vote_average.gte'] = String(opts.minRating);
  if (opts.runtimeGte != null) params['with_runtime.gte'] = String(opts.runtimeGte);
  if (opts.runtimeLte != null) params['with_runtime.lte'] = String(opts.runtimeLte);

  // Años: el rango explícito manda; si no lo hay, se deriva de la década.
  const from = opts.yearFrom ?? (opts.decade ?? null);
  const to = opts.yearTo ?? (opts.decade != null ? opts.decade + 9 : null);
  if (from != null) params['primary_release_date.gte'] = `${from}-01-01`;
  if (to != null) params['primary_release_date.lte'] = `${to}-12-31`;

  // Dónde ver: TMDB exige la región junto a las plataformas; sin ella el filtro
  // se ignoraría en silencio y el usuario vería resultados que no puede ver.
  if (opts.watchRegion) {
    params.watch_region = opts.watchRegion;
    if (opts.watchProviders?.length) params.with_watch_providers = opts.watchProviders.join('|');
    if (opts.watchTypes?.length) {
      params.with_watch_monetization_types = opts.watchTypes.map((t) => MONETIZATION[t]).join('|');
    }
  }

  const data = await tmdbFetch<{ results: TmdbSearchResult[]; total_pages: number; total_results: number }>(
    '/discover/movie',
    params,
  );
  return {
    results: data.results,
    totalPages: Math.min(data.total_pages, 500),
    totalResults: data.total_results ?? data.results.length,
  };
}

/* ------------------------------------------------------------------ *
 * Dónde ver (proveedores de streaming).
 *
 * Los datos son de JustWatch y llegan DENTRO de la ficha (append_to_response),
 * así que no cuestan una petición aparte ni tienen cuota propia — al contrario
 * que Watchmode, cuyo plan gratuito (1000/mes, 2 llamadas por película y región)
 * se agotaba en unos cientos de fichas.
 *
 * Condición de uso de TMDB: hay que atribuir los datos a JustWatch y llevar al
 * usuario a su enlace (`link`), no montar un scraper propio. De ahí que se
 * conserve el `link` de cada región y se muestre la atribución en la ficha.
 * ------------------------------------------------------------------ */

/** Un proveedor tal y como lo devuelve TMDB dentro de una región. */
interface TmdbProvider {
  provider_id: number;
  provider_name: string;
  logo_path: string | null;
  display_priority?: number;
}

/** Bloque de una región: el enlace de JustWatch y los proveedores por modalidad. */
export interface TmdbRegionProviders {
  link?: string;
  flatrate?: TmdbProvider[];
  free?: TmdbProvider[];
  ads?: TmdbProvider[];
  rent?: TmdbProvider[];
  buy?: TmdbProvider[];
}

/** Modalidades de acceso, en el orden en que se muestran. */
export const WATCH_TYPES = ['sub', 'free', 'ads', 'rent', 'buy'] as const;
export type WatchType = (typeof WATCH_TYPES)[number];

/** Nombre TMDB de cada modalidad → el nuestro. */
const TYPE_MAP: Record<string, WatchType> = {
  flatrate: 'sub',
  free: 'free',
  ads: 'ads',
  rent: 'rent',
  buy: 'buy',
};

export interface WatchProvider {
  id: number;
  name: string;
  /** Ruta del logo en TMDB (sin dominio); se resuelve con providerLogoUrl(). */
  logo: string | null;
  type: WatchType;
}

export interface WatchAvailability {
  region: string;
  /** Página de JustWatch (vía TMDB) para esa película y región. */
  link: string | null;
  providers: WatchProvider[];
}

/** Logo de una plataforma. w92 basta para un icono; w154 para pantallas densas. */
export function providerLogoUrl(path: string | null, size: 'w45' | 'w92' | 'w154' = 'w92') {
  return path ? `${TMDB_IMG}/${size}${path}` : null;
}

/** Aplana el bloque de una región a nuestra lista, sin repetir plataforma+modalidad. */
function flattenRegion(region: string, block: TmdbRegionProviders | undefined): WatchAvailability {
  const providers: WatchProvider[] = [];
  if (!block) return { region, link: null, providers };

  const seen = new Set<string>();
  for (const [tmdbKey, type] of Object.entries(TYPE_MAP)) {
    const list = block[tmdbKey as keyof TmdbRegionProviders] as TmdbProvider[] | undefined;
    if (!Array.isArray(list)) continue;
    // TMDB los devuelve por display_priority: cuanto menor, más relevante en el país.
    for (const p of [...list].sort((x, y) => (x.display_priority ?? 999) - (y.display_priority ?? 999))) {
      const key = `${p.provider_id}|${type}`;
      if (seen.has(key)) continue;
      seen.add(key);
      providers.push({ id: p.provider_id, name: p.provider_name, logo: p.logo_path, type });
    }
  }
  return { region, link: block.link ?? null, providers };
}

/**
 * Extrae el "dónde ver" de las regiones pedidas y DESCARTA el resto.
 *
 * El bloque en bruto pesa 45-90 kB por película (131 regiones): guardarlo entero
 * duplicaría la tabla films_cache. Podado a las regiones que ofrecemos son unos
 * pocos kB. Además muta el objeto para quitarle la clave gorda, de modo que lo
 * que se cachea después ya va limpio.
 */
export function extractWatchProviders(
  movie: TmdbMovie,
  regions: readonly string[],
): Record<string, WatchAvailability> {
  const raw = movie['watch/providers']?.results ?? {};
  const out: Record<string, WatchAvailability> = {};
  for (const region of regions) {
    const flat = flattenRegion(region, raw[region]);
    // Una región sin plataformas no ocupa sitio en la caché: se omite y al
    // leerla se interpreta como "sin resultados" (que es lo mismo).
    if (flat.providers.length > 0 || flat.link) out[region] = flat;
  }
  delete movie['watch/providers'];
  return out;
}

/** Catálogo de plataformas disponibles en una región (para el filtro de Descubrir). */
export interface ProviderOption {
  id: number;
  name: string;
  logo: string | null;
}

// El catálogo cambia muy rara vez y es igual para todos: se guarda un día en
// memoria por (región, idioma).
const providerCatalog = createMemo<ProviderOption[]>(24 * 60 * 60 * 1000, 60);

/**
 * Plataformas que operan en la región, ordenadas por relevancia local
 * (display_priorities) y recortadas a las `limit` primeras: el filtro no puede
 * ser una lista de 80 casillas.
 */
export async function getProviderOptions(
  region: string,
  locale: string,
  limit = 24,
): Promise<ProviderOption[]> {
  return providerCatalog
    .get(`${region}:${toTmdbLang(locale)}:${limit}`, async () => {
      const data = await tmdbFetch<{
        results: {
          provider_id: number;
          provider_name: string;
          logo_path: string | null;
          display_priorities?: Record<string, number>;
        }[];
      }>('/watch/providers/movie', { language: toTmdbLang(locale), watch_region: region });

      return (data.results ?? [])
        .map((p) => ({
          id: p.provider_id,
          name: p.provider_name,
          logo: p.logo_path,
          priority: p.display_priorities?.[region] ?? 9999,
        }))
        .sort((a, b) => a.priority - b.priority)
        .slice(0, limit)
        .map(({ id, name, logo }) => ({ id, name, logo }));
    })
    // Si TMDB falla, el filtro simplemente no ofrece plataformas: la página sigue.
    .catch(() => []);
}
