/**
 * Capa de acceso a películas (SOLO SERVIDOR): combina TMDB + OMDb y cachea el
 * resultado en films_cache. OMDb tiene un límite diario bajo, así que su respuesta
 * se reutiliza desde cache durante OMDB_TTL.
 */
import { desc, eq, inArray, isNull } from 'drizzle-orm';
import { db } from '../db/client';
import { filmsCache } from '../db/schema';
import {
  getMovie,
  getTranslations,
  director,
  posterUrl, posterSrcset,
  extractWatchProviders,
  slimMovie,
  type TmdbMovie,
  type WatchAvailability,
} from './tmdb';
import { getOmdbByImdbId, type OmdbData } from './omdb';
import { getFilmLocations, esFormatoActual, type FilmLocations } from './wikidata';
import { createMemo } from './memo';
import { registerCache } from './cache-registry';
import { WATCH_REGIONS } from '../data/countries';
import { titlesFrom, type Titles } from './titles';
import { latinizeMovie, latinNames } from './personnames';
import type { Lang } from '../i18n/ui';

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
  // Reparto y dirección en alfabeto latino («中井朝一» → Asakazu Nakai). Se
  // guarda así también en la caché, de donde leen las listas.
  tmdb = await latinizeMovie(tmdb);

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

  // A la caché va la ficha PODADA (solo lo que la web lee: ver slimMovie); la
  // página recibe la completa que acabamos de pedir. Si TMDB falla y se sirve
  // desde caché, la podada tiene todo lo que la ficha necesita.
  const guardar = slimMovie(tmdb);
  const titles = (await titlesOf(tmdb)) ?? (cached?.titles as Titles | null) ?? null;
  await db
    .insert(filmsCache)
    .values({ tmdbId, tmdb: guardar, omdb, providers, titles, wikidata: locations, wikidataFetchedAt, fetchedAt: new Date() })
    .onConflictDoUpdate({
      target: filmsCache.tmdbId,
      set: { tmdb: guardar, omdb, providers, titles, wikidata: locations, wikidataFetchedAt, fetchedAt: new Date() },
    });

  return { tmdb, omdb, providers, locations };
}

export interface FilmBrief {
  tmdbId: number;
  title: string;
  year: string;
  director: string | null;
  poster: string | null;
  /** 1x/2x: las rejillas de perfil pintan estos carteles a 145 px, y en retina w185 se queda corto. */
  posterSrcset: string | null;
  genreIds: number[];
  decade: number | null;
  runtime: number;
  /** Con id, para «tus directores» y enlazar a su ficha. Varios si la codirigieron. */
  directors: { id: number; name: string }[];
  /** Los cinco primeros del reparto: más abajo ya son papeles de una escena. */
  cast: { id: number; name: string }[];
}

/**
 * Los títulos en los cinco idiomas. Una petición a TMDB, recordada un día
 * (las de gallego, euskera y catalán ya la hacen). Null si TMDB falla: mejor
 * sin títulos que sin ficha.
 */
async function titlesOf(m: TmdbMovie): Promise<Titles | null> {
  try {
    return titlesFrom(m, await getTranslations(m.id));
  } catch {
    return null;
  }
}

function briefFromTmdb(m: TmdbMovie, titles: Titles | null, locale: string): FilmBrief {
  const year = m.release_date ? Number(m.release_date.slice(0, 4)) : null;
  return {
    tmdbId: m.id,
    title: titles?.[locale as Lang] ?? m.title,
    year: year ? String(year) : '',
    director: director(m),
    poster: posterUrl(m.poster_path, 'w185'),
    posterSrcset: posterSrcset(m.poster_path, 'w185', 'w342'),
    genreIds: (m.genres ?? []).map((g) => g.id),
    decade: year ? Math.floor(year / 10) * 10 : null,
    runtime: m.runtime ?? 0,
    directors: (m.credits?.crew ?? []).filter((c) => c.job === 'Director').map((c) => ({ id: c.id, name: c.name })),
    cast: (m.credits?.cast ?? []).slice(0, BRIEF_CAST).map((c) => ({ id: c.id, name: c.name })),
  };
}

const BRIEF_CONCURRENCY = 8;
const BRIEF_CAST = 5;
const TITLES_NOW = 40;

/** Ejecuta fn sobre la lista con BRIEF_CONCURRENCY a la vez. */
async function runLimited<T>(items: T[], fn: (item: T) => Promise<unknown>): Promise<void> {
  let next = 0;
  const worker = async () => {
    while (next < items.length) await fn(items[next++]);
  };
  await Promise.all(Array.from({ length: Math.min(BRIEF_CONCURRENCY, items.length) }, worker));
}

/** Calcula y guarda los títulos de una ficha que ya estaba en caché sin ellos. */
async function fillTitles(m: TmdbMovie): Promise<Titles | null> {
  const titles = await titlesOf(m);
  if (titles) await db.update(filmsCache).set({ titles }).where(eq(filmsCache.tmdbId, m.id));
  return titles;
}

// Como mucho una tanda cada diez minutos: la lanza el sitemap, que los
// rastreadores piden a menudo. 300 por tanda son 300 peticiones a TMDB.
let backfillAt = 0;
const BACKFILL_EVERY_MS = 10 * 60 * 1000;

/**
 * Completa en segundo plano los títulos por idioma de hasta `limit` fichas
 * guardadas sin ellos. El sitemap solo lista las que los tienen (sin ellos no
 * sabe la URL de cada idioma), así que sin esto las fichas viejas que nadie
 * vuelve a abrir no entrarían nunca.
 */
export function backfillTitles(limit = 300): void {
  if (Date.now() - backfillAt < BACKFILL_EVERY_MS) return;
  backfillAt = Date.now();
  void (async () => {
    const rows = await db
      .select({ tmdb: filmsCache.tmdb })
      .from(filmsCache)
      .where(isNull(filmsCache.titles))
      .orderBy(desc(filmsCache.fetchedAt))
      .limit(limit);
    await runLimited(rows.map((r) => r.tmdb as TmdbMovie), fillTitles);
  })().catch(() => {});
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
  for (const row of cached) out.set(row.tmdbId, briefFromTmdb(row.tmdb as TmdbMovie, row.titles as Titles | null, locale));

  // Las fichas cacheadas antes de que se guardaran los títulos por idioma se
  // completan aquí: unas pocas en el momento y el resto en segundo plano, para
  // que el primer perfil con mil películas no tarde medio minuto en abrir.
  const sinTitulos = cached.filter((r) => !r.titles).map((r) => r.tmdb as TmdbMovie);
  if (sinTitulos.length) {
    const ahora = sinTitulos.slice(0, TITLES_NOW);
    await runLimited(ahora, async (m) => {
      const titles = await fillTitles(m);
      if (titles) out.set(m.id, briefFromTmdb(m, titles, locale));
    });
    const luego = sinTitulos.slice(TITLES_NOW);
    if (luego.length) void runLimited(luego, fillTitles).catch(() => {});
  }

  // Para los que falten pedimos SOLO a TMDB (no OMDb ni Wikidata, que son
  // lentos y aquí no se usan) y en paralelo; se cachea el tmdb para la ficha completa.
  // Con tope de peticiones a la vez: tras importar de Letterboxd, el diario o
  // la lista pueden traer cientos de películas sin cachear, y lanzarlas todas
  // de golpe chocaba con el límite de TMDB y llenaba la memoria del contenedor.
  const missing = tmdbIds.filter((id) => !out.has(id));
  let next = 0;
  const worker = async () => {
    while (next < missing.length) {
      const id = missing[next++];
      try {
        const tmdb = await getMovie(id, locale);
        const titles = await titlesOf(tmdb);
        out.set(id, briefFromTmdb(tmdb, titles, locale));
        // El «dónde ver» viene dentro de la misma respuesta: se extrae y se
        // guarda, así el selector de región funciona aunque la ficha completa
        // nunca se haya visitado. Antes el bloque en bruto (45-90 kB) se
        // guardaba entero dentro de tmdb y la columna providers quedaba vacía.
        const providers = extractWatchProviders(tmdb, WATCH_REGIONS);
        const guardar = slimMovie(tmdb);
        await db
          .insert(filmsCache)
          .values({ tmdbId: id, tmdb: guardar, providers, titles, fetchedAt: new Date() })
          .onConflictDoUpdate({ target: filmsCache.tmdbId, set: { tmdb: guardar, providers, titles, fetchedAt: new Date() } });
      } catch {
        /* ignorar IDs no resolubles */
      }
    }
  };
  await Promise.all(Array.from({ length: Math.min(BRIEF_CONCURRENCY, missing.length) }, worker));
  await latinizeBriefs(out);
  return out;
}

/**
 * Nombres latinos en los resúmenes. Las fichas cacheadas antes de que
 * existiera lib/personnames.ts guardan el nombre original; aquí se corrige al
 * leer (las que no se sepan aún, salen bien en la siguiente visita).
 */
async function latinizeBriefs(out: Map<number, FilmBrief>): Promise<void> {
  const people = [...out.values()].flatMap((b) => [...b.directors, ...b.cast]);
  const names = await latinNames(people);
  if (names.size === 0) return;
  const fix = (p: { id: number; name: string }) => (names.has(p.id) ? { ...p, name: names.get(p.id)! } : p);
  for (const [id, b] of out) {
    const directors = b.directors.map(fix);
    out.set(id, { ...b, directors, cast: b.cast.map(fix), director: directors[0]?.name ?? b.director });
  }
}
