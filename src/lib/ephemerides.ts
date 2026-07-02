import data from '../data/ephemerides.json';
import { contentLang, locales, type Lang } from '../i18n/ui';

/** Efeméride del cine. */
export interface Ephemeris {
  month: number; // 1-12
  day: number; // 1-31
  year: number;
  text_es: string;
  text_en: string;
  tmdbId?: number;
}

export const ephemerides = data.items as Ephemeris[];

export const ephemerisText = (e: Ephemeris, lang: Lang) => (contentLang(lang) === 'es' ? e.text_es : e.text_en);

/** Fecha formateada del evento, p. ej. "13 de agosto de 1899" / "13 August 1899". */
export function ephemerisDate(e: Ephemeris, lang: Lang): string {
  const d = new Date(Date.UTC(e.year, e.month - 1, e.day));
  return new Intl.DateTimeFormat(locales[lang], {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(d);
}

export interface TodayEphemerides {
  /** Eventos cuyo día y mes coinciden con la fecha dada (puede estar vacío). */
  onThisDay: Ephemeris[];
  /** Próxima efeméride por calendario (la más cercana a partir de hoy, con vuelta de año). */
  next: Ephemeris;
}

/** Clave comparable mes/día (mmdd). */
const md = (e: { month: number; day: number }) => e.month * 100 + e.day;

export function getEphemerides(date = new Date()): TodayEphemerides {
  const m = date.getUTCMonth() + 1;
  const d = date.getUTCDate();
  const todayKey = m * 100 + d;
  const onThisDay = ephemerides.filter((e) => e.month === m && e.day === d);

  // La próxima efeméride a partir de hoy; si no queda ninguna este año, la primera del siguiente.
  const sorted = ephemerides.slice().sort((a, b) => md(a) - md(b));
  const upcoming = sorted.find((e) => md(e) >= todayKey);
  const next = upcoming ?? sorted[0];

  return { onThisDay, next };
}
