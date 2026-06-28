import data from '../data/ephemerides.json';
import type { Lang } from '../i18n/ui';

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

export const ephemerisText = (e: Ephemeris, lang: Lang) => (lang === 'es' ? e.text_es : e.text_en);

/** Fecha formateada del evento, p. ej. "13 de agosto de 1899" / "13 August 1899". */
export function ephemerisDate(e: Ephemeris, lang: Lang): string {
  const d = new Date(Date.UTC(e.year, e.month - 1, e.day));
  return new Intl.DateTimeFormat(lang === 'es' ? 'es-ES' : 'en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(d);
}

export interface TodayEphemerides {
  /** Eventos cuyo día y mes coinciden con la fecha dada (puede estar vacío). */
  onThisDay: Ephemeris[];
  /** Selección rotatoria por día del año, para que la sección nunca quede vacía. */
  pick: Ephemeris;
}

/** Día del año (0-based, UTC) para rotar la selección de reserva. */
function dayOfYear(date: Date): number {
  const start = Date.UTC(date.getUTCFullYear(), 0, 0);
  const now = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
  return Math.floor((now - start) / 86_400_000);
}

export function getEphemerides(date = new Date()): TodayEphemerides {
  const m = date.getUTCMonth() + 1;
  const d = date.getUTCDate();
  const onThisDay = ephemerides.filter((e) => e.month === m && e.day === d);
  const pick = ephemerides[dayOfYear(date) % ephemerides.length];
  return { onThisDay, pick };
}
