/**
 * Cartelera: lo que se estrena en los cines de España esta semana y las
 * próximas, y lo que sigue en cartel. Los datos son de TMDB, por fecha de
 * estreno en España (ver regionReleases en lib/tmdb.ts).
 *
 * En España se estrena en viernes, así que las semanas van de viernes a
 * jueves: el viernes 30 empieza «esta semana» aunque hoy sea miércoles 4 y la
 * semana natural ya vaya por la mitad.
 */
import { regionReleases, worldReleases, posterUrl, posterSrcset, type TmdbSearchResult } from './tmdb';
import { createMemo } from './memo';
import { registerCache } from './cache-registry';

export interface Window {
  from: string;
  to: string;
}

/** Suma días a una fecha YYYY-MM-DD (en UTC, sin sustos con el cambio de hora). */
export function addDays(iso: string, n: number): string {
  const d = new Date(`${iso}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

/** El viernes de la semana de cine en la que cae `today` (el mismo día si es viernes). */
export function cinemaFriday(today: string): string {
  const dow = new Date(`${today}T12:00:00Z`).getUTCDay(); // 0 domingo … 5 viernes
  return addDays(today, -((dow - 5 + 7) % 7));
}

/**
 * Las ventanas de la cartelera: las cuatro semanas anteriores (lo que sigue
 * en cartel), esta semana, la siguiente y las cuatro de después.
 */
export function releaseWindows(today: string): { earlier: Window; thisWeek: Window; nextWeek: Window; later: Window } {
  const fri = cinemaFriday(today);
  return {
    earlier: { from: addDays(fri, -28), to: addDays(fri, -1) },
    thisWeek: { from: fri, to: addDays(fri, 6) },
    nextWeek: { from: addDays(fri, 7), to: addDays(fri, 13) },
    later: { from: addDays(fri, 14), to: addDays(fri, 41) },
  };
}

/**
 * Cada película solo en la primera lista donde aparece. TMDB puede dar la
 * misma en dos ventanas si tiene dos estrenos aquí (limitado y general).
 */
export function dedupeLists<T extends { id: number }>(lists: T[][]): T[][] {
  const seen = new Set<number>();
  return lists.map((list) =>
    list.filter((f) => {
      if (seen.has(f.id)) return false;
      seen.add(f.id);
      return true;
    }),
  );
}

export interface ReleaseFilm {
  id: number;
  title: string;
  /** Fecha de estreno en España. */
  date: string;
  poster: string | null;
  posterSrcset: string | null;
  genreIds: number[];
}

/** Sin cartel no se pinta: suelen ser pases de festival o fichas a medio hacer. */
export function toReleaseFilms(results: TmdbSearchResult[]): ReleaseFilm[] {
  return results
    .filter((r) => r.poster_path && r.release_date)
    .map((r) => ({
      id: r.id,
      title: r.title,
      date: r.release_date!,
      poster: posterUrl(r.poster_path, 'w342'),
      posterSrcset: posterSrcset(r.poster_path),
      genreIds: r.genre_ids ?? [],
    }));
}

export interface Cartelera {
  windows: ReturnType<typeof releaseWindows>;
  thisWeek: ReleaseFilm[];
  nextWeek: ReleaseFilm[];
  /** Por fecha: lo más cercano primero. */
  later: ReleaseFilm[];
  nowPlaying: ReleaseFilm[];
}

// Seis horas: la cartelera cambia una vez por semana y TMDB la va completando
// en los días previos al viernes. La clave lleva la fecha, así que al cambiar
// de día se recalcula sola.
const TTL_MS = 6 * 60 * 60 * 1000;
const memo = createMemo<Cartelera>(TTL_MS, 20);
registerCache({
  id: 'releases',
  label: 'Cartelera de estrenos',
  ttlMs: TTL_MS,
  maxKeys: 20,
  size: () => memo.size,
  clear: () => memo.clear(),
});

const REGION = 'ES';

export function getCartelera(locale: string, today = new Date().toISOString().slice(0, 10)): Promise<Cartelera> {
  return memo.get(`${locale}:${today}`, async () => {
    const windows = releaseWindows(today);
    const [thisWeek, nextWeek, later, earlier] = await Promise.all([
      regionReleases(REGION, windows.thisWeek.from, windows.thisWeek.to, locale, 2),
      regionReleases(REGION, windows.nextWeek.from, windows.nextWeek.to, locale, 2),
      regionReleases(REGION, windows.later.from, windows.later.to, locale, 2),
      regionReleases(REGION, windows.earlier.from, windows.earlier.to, locale, 1),
    ]);
    const laterByDate = toReleaseFilms(later).sort((a, b) => a.date.localeCompare(b.date));
    const [a, b, c, d] = dedupeLists([toReleaseFilms(thisWeek), toReleaseFilms(nextWeek), laterByDate, toReleaseFilms(earlier)]);
    return { windows, thisWeek: a, nextWeek: b, later: c, nowPlaying: d };
  });
}

/* ------------------------------------------------------------------ *
 * ¿Qué echaban en los cines el día que…?
 * ------------------------------------------------------------------ */

/**
 * Lo que había en cartel un día se aproxima con lo que se estrenó en las
 * cuatro semanas anteriores: una película aguantaba en cartel unas semanas, y
 * TMDB no guarda carteleras, solo fechas de estreno.
 */
export const DIAS_EN_CARTEL = 28;
/** Antes de esto TMDB apenas tiene fechas de estreno por país. */
export const PRIMER_DIA = '1920-01-01';

export function ventanaDelDia(dia: string): { from: string; to: string } {
  return { from: addDays(dia, -(DIAS_EN_CARTEL - 1)), to: dia };
}

/** El día pedido, si es una fecha real entre PRIMER_DIA y hoy; si no, null. Pura. */
export function diaValido(dia: string | null | undefined, hoy: string): string | null {
  if (!dia || !/^\d{4}-\d{2}-\d{2}$/.test(dia)) return null;
  const d = new Date(`${dia}T12:00:00Z`);
  if (Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== dia) return null;
  return dia >= PRIMER_DIA && dia <= hoy ? dia : null;
}

export interface CarteleraDelDia {
  dia: string;
  /** 'es': estrenos en España; 'mundo': sin fechas de España, los del mundo esas semanas. */
  ambito: 'es' | 'mundo';
  films: ReleaseFilm[];
}

/** Con menos de esto en España, se completa con lo estrenado en el mundo. */
const MINIMO_ES = 6;
const memoDia = createMemo<CarteleraDelDia>(7 * 24 * 60 * 60 * 1000, 300);
registerCache({
  id: 'releases-day',
  label: '¿Qué echaban el día que…?',
  ttlMs: 7 * 24 * 60 * 60 * 1000,
  maxKeys: 300,
  size: () => memoDia.size,
  clear: () => memoDia.clear(),
});

export function carteleraDelDia(dia: string, locale: string): Promise<CarteleraDelDia> {
  return memoDia.get(`${locale}:${dia}`, async () => {
    const { from, to } = ventanaDelDia(dia);
    const es = toReleaseFilms(await regionReleases(REGION, from, to, locale, 2));
    if (es.length >= MINIMO_ES) return { dia, ambito: 'es', films: es.slice(0, 24) };
    const mundo = toReleaseFilms(await worldReleases(from, to, locale));
    return { dia, ambito: 'mundo', films: mundo.slice(0, 24) };
  });
}
