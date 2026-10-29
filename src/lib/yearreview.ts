/**
 * «Tu año en cine»: el resumen de un año a partir del diario de visionados.
 * Pura (tiene tests): recibe los visionados del año y los datos ya cacheados
 * de cada película, y no pide nada a nadie.
 */

export interface YearViewing {
  tmdbId: number;
  /** AAAA-MM-DD. */
  watchedOn: string;
  rewatch: boolean;
  /** La nota de ese visionado o, si no la tiene, la de la película. */
  rating: number | null;
}

export interface YearFilmInfo {
  runtime: number;
  director: string | null;
  genreIds: number[];
  decade: number | null;
  year: string;
}

export interface YearReview {
  year: number;
  viewings: number;
  films: number;
  rewatches: number;
  hours: number;
  /** Visionados por mes, enero = 0. */
  byMonth: number[];
  /** El mes con más visionados (0-11), o null si no hay ninguno. */
  topMonth: number | null;
  /** Visionados por día de la semana, lunes = 0. */
  byWeekday: number[];
  /** Días seguidos con al menos una película. */
  streak: { days: number; from: string; to: string } | null;
  first: YearViewing | null;
  last: YearViewing | null;
  /** Las mejor puntuadas, sin repetir película: la nota más alta que le dio ese año. */
  topRated: { tmdbId: number; rating: number }[];
  topDirectors: { label: string; count: number }[];
  topGenres: { id: number; count: number }[];
  decades: { decade: number; count: number }[];
  /** La película más antigua vista ese año. */
  oldest: { tmdbId: number; year: number } | null;
}

const DAY = 24 * 60 * 60 * 1000;
const dayNum = (iso: string) => Date.UTC(Number(iso.slice(0, 4)), Number(iso.slice(5, 7)) - 1, Number(iso.slice(8, 10))) / DAY;

const top = <K>(m: Map<K, number>, n: number) =>
  [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, n);

export function computeYear(year: number, rows: YearViewing[], info: Map<number, YearFilmInfo>): YearReview {
  const vs = rows
    .filter((v) => v.watchedOn.startsWith(`${year}-`))
    .sort((a, b) => a.watchedOn.localeCompare(b.watchedOn));

  const byMonth = Array(12).fill(0) as number[];
  const byWeekday = Array(7).fill(0) as number[];
  const directors = new Map<string, number>();
  const genres = new Map<number, number>();
  const decades = new Map<number, number>();
  const best = new Map<number, number>();
  const films = new Set<number>();
  let minutes = 0;
  let oldest: YearReview['oldest'] = null;

  for (const v of vs) {
    byMonth[Number(v.watchedOn.slice(5, 7)) - 1]++;
    // getUTCDay da domingo = 0; se pasa a lunes = 0.
    byWeekday[(new Date(dayNum(v.watchedOn) * DAY).getUTCDay() + 6) % 7]++;
    if (v.rating != null && v.rating > (best.get(v.tmdbId) ?? 0)) best.set(v.tmdbId, v.rating);

    const f = info.get(v.tmdbId);
    // Las horas cuentan cada visionado (verla dos veces son dos tardes); el
    // resto cuenta cada película una vez, para que un revisionado no infle.
    if (f) minutes += f.runtime;
    if (films.has(v.tmdbId)) continue;
    films.add(v.tmdbId);
    if (!f) continue;
    if (f.director) directors.set(f.director, (directors.get(f.director) ?? 0) + 1);
    for (const g of f.genreIds) genres.set(g, (genres.get(g) ?? 0) + 1);
    if (f.decade != null) decades.set(f.decade, (decades.get(f.decade) ?? 0) + 1);
    const y = Number(f.year);
    if (y && (!oldest || y < oldest.year)) oldest = { tmdbId: v.tmdbId, year: y };
  }

  // Racha: días distintos consecutivos.
  const days = [...new Set(vs.map((v) => v.watchedOn))];
  let streak: YearReview['streak'] = null;
  let start = 0;
  for (let i = 1; i <= days.length; i++) {
    if (i < days.length && dayNum(days[i]) - dayNum(days[i - 1]) === 1) continue;
    const len = i - start;
    if (len > 0 && (!streak || len > streak.days)) streak = { days: len, from: days[start], to: days[i - 1] };
    start = i;
  }

  const max = Math.max(...byMonth);
  return {
    year,
    viewings: vs.length,
    films: films.size,
    rewatches: vs.filter((v) => v.rewatch).length,
    hours: Math.round(minutes / 60),
    byMonth,
    topMonth: max > 0 ? byMonth.indexOf(max) : null,
    byWeekday,
    streak,
    first: vs[0] ?? null,
    last: vs[vs.length - 1] ?? null,
    topRated: top(best, 6).map(([tmdbId, rating]) => ({ tmdbId, rating })),
    topDirectors: top(directors, 5).map(([label, count]) => ({ label, count })),
    topGenres: top(genres, 5).map(([id, count]) => ({ id, count })),
    decades: [...decades.entries()].sort((a, b) => a[0] - b[0]).map(([decade, count]) => ({ decade, count })),
    oldest,
  };
}
