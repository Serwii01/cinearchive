/**
 * Importación desde Letterboxd — la parte pura, sin base de datos ni red, para
 * que la usen a la vez el navegador (leer el ZIP), el servidor (emparejar y
 * fusionar) y los tests.
 *
 * Letterboxd exporta un ZIP con un CSV por cosa: diary.csv (visionados con
 * fecha), ratings.csv, watched.csv, watchlist.csv, reviews.csv y
 * likes/films.csv. No trae el id de TMDB, así que cada película se empareja
 * por título y año.
 *
 * Ojo: en diary.csv y reviews.csv la columna «Letterboxd URI» es la de la
 * ENTRADA del diario, no la de la película. Por eso la clave de una película
 * es título + año y no la URI.
 */

export interface LbViewing {
  /** AAAA-MM-DD. */
  date: string;
  rating: number | null;
  rewatch: boolean;
}

export interface LbFilm {
  /** Título en minúsculas + «|» + año: lo que identifica a la película. */
  key: string;
  /** IMDb y Trakt traen el id: con él no hace falta buscar por el título. */
  tmdbId?: number;
  imdbId?: string;
  name: string;
  year: number | null;
  watched: boolean;
  watchlist: boolean;
  liked: boolean;
  rating: number | null;
  review: string | null;
  viewings: LbViewing[];
}

/* ------------------------------------------------------------------ *
 * CSV
 * ------------------------------------------------------------------ */

/**
 * CSV de RFC 4180: comillas dobles, comillas escapadas ("") y saltos de línea
 * dentro de un campo, que en reviews.csv los hay en casi todas las filas.
 * Devuelve objetos por nombre de columna.
 */
export function parseCsv(text: string): Record<string, string>[] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let quoted = false;
  const s = text.charCodeAt(0) === 0xfeff ? text.slice(1) : text; // BOM
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (quoted) {
      if (c === '"') {
        if (s[i + 1] === '"') { field += '"'; i++; }
        else quoted = false;
      } else field += c;
    } else if (c === '"') quoted = true;
    else if (c === ',') { row.push(field); field = ''; }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && s[i + 1] === '\n') i++;
      row.push(field); field = '';
      rows.push(row); row = [];
    } else field += c;
  }
  if (field !== '' || row.length) { row.push(field); rows.push(row); }

  const [head, ...body] = rows.filter((r) => r.some((f) => f !== ''));
  if (!head) return [];
  return body.map((r) => Object.fromEntries(head.map((h, i) => [h.trim(), r[i] ?? ''])));
}

/* ------------------------------------------------------------------ *
 * De los CSV a una lista de películas
 * ------------------------------------------------------------------ */

export type LbFiles = Partial<Record<'diary' | 'ratings' | 'watched' | 'watchlist' | 'reviews' | 'likes', string>>;

/** Qué fichero del ZIP es cada cosa. Los de deleted/ u orphaned/ no cuentan. */
export function lbFileKind(path: string): keyof LbFiles | null {
  const p = path.toLowerCase();
  if (p.includes('deleted/') || p.includes('orphaned/')) return null;
  if (p.endsWith('likes/films.csv')) return 'likes';
  const name = p.split('/').pop();
  const known = ['diary', 'ratings', 'watched', 'watchlist', 'reviews'] as const;
  return known.find((k) => name === `${k}.csv`) ?? null;
}

const filmKey = (name: string, year: number | null) => `${name.trim().toLowerCase()}|${year ?? ''}`;

const toYear = (s: string | undefined) => {
  const n = Number(s);
  return Number.isInteger(n) && n > 1870 && n < 3000 ? n : null;
};

/** Nota de Letterboxd («3.5») a la de aquí, o null si no vale. */
export function lbRating(s: string | undefined): number | null {
  const n = Number(s);
  return s && n >= 0.5 && n <= 5 && Number.isInteger(n * 2) ? n : null;
}

const isDay = (s: string | undefined): s is string => !!s && /^\d{4}-\d{2}-\d{2}$/.test(s);

/**
 * Junta todos los CSV en una entrada por película. El orden importa poco: cada
 * fichero aporta lo suyo y nada se pisa, salvo la nota, donde ratings.csv (la
 * nota actual) gana a la de un visionado antiguo.
 */
export function collectFilms(files: LbFiles): LbFilm[] {
  const map = new Map<string, LbFilm>();
  const get = (r: Record<string, string>) => {
    const name = (r.Name ?? '').trim();
    if (!name) return null;
    const year = toYear(r.Year);
    const key = filmKey(name, year);
    let f = map.get(key);
    if (!f) {
      f = { key, name, year, watched: false, watchlist: false, liked: false, rating: null, review: null, viewings: [] };
      map.set(key, f);
    }
    return f;
  };

  for (const r of parseCsv(files.watched ?? '')) { const f = get(r); if (f) f.watched = true; }
  for (const r of parseCsv(files.watchlist ?? '')) { const f = get(r); if (f) f.watchlist = true; }
  for (const r of parseCsv(files.likes ?? '')) { const f = get(r); if (f) f.liked = true; }
  for (const r of parseCsv(files.diary ?? '')) {
    const f = get(r);
    if (!f) continue;
    f.watched = true;
    const date = isDay(r['Watched Date']) ? r['Watched Date'] : isDay(r.Date) ? r.Date : null;
    if (date && !f.viewings.some((v) => v.date === date)) {
      f.viewings.push({ date, rating: lbRating(r.Rating), rewatch: r.Rewatch?.toLowerCase() === 'yes' });
    }
  }
  for (const r of parseCsv(files.reviews ?? '')) {
    const f = get(r);
    if (!f) continue;
    f.watched = true;
    const text = (r.Review ?? '').trim();
    // Si hay varias reseñas de la misma película se queda la más reciente.
    if (text) f.review = text;
  }
  for (const r of parseCsv(files.ratings ?? '')) {
    const f = get(r);
    if (!f) continue;
    f.watched = true;
    f.rating = lbRating(r.Rating) ?? f.rating;
  }
  // Sin ratings.csv, la nota del visionado más reciente que la tenga.
  for (const f of map.values()) {
    f.viewings.sort((a, b) => a.date.localeCompare(b.date));
    if (f.rating == null) f.rating = [...f.viewings].reverse().find((v) => v.rating != null)?.rating ?? null;
    // Lo visto no está pendiente, aunque siga en la watchlist de Letterboxd.
    if (f.watched) f.watchlist = false;
  }
  return [...map.values()];
}

/* ------------------------------------------------------------------ *
 * Emparejar con TMDB
 * ------------------------------------------------------------------ */

export interface MatchCandidate {
  id: number;
  title: string;
  original_title: string;
  release_date?: string;
  poster_path: string | null;
}

export type Confidence = 'exact' | 'likely' | 'none';

/** Minúsculas, sin acentos ni signos: «Amélie» y «amelie» son la misma. */
export function normTitle(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

const yearOf = (c: MatchCandidate) => (c.release_date ? Number(c.release_date.slice(0, 4)) : null);

/**
 * Elige la película de TMDB que corresponde a un título y año de Letterboxd.
 *
 *   exact   título igual (el traducido o el original) y año igual o ±1, que
 *           es lo que bailan los estrenos de diciembre entre bases de datos
 *   likely  el primer resultado tiene el año a ±1 pero el título no cuadra
 *           del todo: probable, pero se enseña para confirmar
 *   none    nada que se le parezca
 */
export function pickMatch(
  name: string,
  year: number | null,
  results: MatchCandidate[],
): { id: number | null; confidence: Confidence } {
  const n = normTitle(name);
  const near = (c: MatchCandidate) => year == null || (yearOf(c) != null && Math.abs(yearOf(c)! - year) <= 1);
  const same = (c: MatchCandidate) => normTitle(c.title) === n || normTitle(c.original_title) === n;

  // Con el título exacto, primero el año exacto y luego ±1.
  const exact =
    results.find((c) => same(c) && (year == null || yearOf(c) === year)) ?? results.find((c) => same(c) && near(c));
  if (exact) return { id: exact.id, confidence: 'exact' };
  const first = results[0];
  if (first && near(first)) return { id: first.id, confidence: 'likely' };
  return { id: null, confidence: 'none' };
}

/* ------------------------------------------------------------------ *
 * Fusionar con lo que ya hay
 * ------------------------------------------------------------------ */

/** Lo que manda el navegador por cada película ya emparejada. */
export interface ImportFilm {
  tmdbId: number;
  watched: boolean;
  watchlist: boolean;
  liked: boolean;
  rating: number | null;
  review: string | null;
  viewings: LbViewing[];
}

export interface ExistingFilm {
  status: 'want' | 'seen' | 'favorite';
  favorite: boolean;
  rating: number | null;
  note: string | null;
  reviewedAt: Date | null;
}

export const MAX_NOTE = 2000;

/** Recorta una reseña larga por la última palabra entera y avisa con «…». */
export function clipNote(s: string): { text: string; clipped: boolean } {
  if (s.length <= MAX_NOTE) return { text: s, clipped: false };
  const cut = s.slice(0, MAX_NOTE - 1);
  const sp = cut.lastIndexOf(' ');
  return { text: `${(sp > MAX_NOTE * 0.8 ? cut.slice(0, sp) : cut).trimEnd()}…`, clipped: true };
}

export interface FilmPatch {
  status: 'want' | 'seen';
  favorite: boolean;
  rating: number | null;
  note: string | null;
  reviewedAt: Date | null;
  clipped: boolean;
}

/**
 * Lo que queda de una película tras importar. Regla: lo que ya hay en Cine
 * Archive gana siempre, y Letterboxd solo rellena huecos. La única subida es
 * de «pendiente» a «vista», porque haberla visto en Letterboxd es un hecho, no
 * una opinión que pisar.
 *
 * Devuelve null si no hay nada que escribir (ni estaba ni Letterboxd dice
 * nada útil).
 */
export function mergeFilm(prev: ExistingFilm | null, inc: ImportFilm, opts: { likesAsFavorites: boolean }): FilmPatch | null {
  const seenInc = inc.watched || inc.rating != null || inc.viewings.length > 0;
  if (!prev && !seenInc && !inc.watchlist) return null;

  const wasSeen = prev ? prev.status !== 'want' : false;
  const status: 'want' | 'seen' = wasSeen || seenInc ? 'seen' : 'want';
  const favorite = (prev?.favorite || prev?.status === 'favorite' || (opts.likesAsFavorites && inc.liked && status === 'seen')) ?? false;
  const rating = prev?.rating ?? inc.rating;
  const clip = !prev?.note && inc.review ? clipNote(inc.review) : null;
  const note = prev?.note ?? clip?.text ?? null;
  const last = inc.viewings.length ? inc.viewings[inc.viewings.length - 1].date : null;
  const reviewedAt = prev?.reviewedAt ?? (last ? new Date(`${last}T12:00:00.000Z`) : null);

  return { status, favorite: !!favorite, rating, note, reviewedAt, clipped: !!clip?.clipped };
}
