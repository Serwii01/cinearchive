/**
 * Funciones puras del diario de visionados (agrupar y rotular por meses). Van
 * aparte de viewings.ts, que habla con la base de datos, para poder probarlas
 * sin ella.
 */

/** Agrupa por mes («2026-03») conservando el orden de entrada. */
export function groupByMonth<T extends { watchedOn: string }>(rows: T[]): { month: string; items: T[] }[] {
  const out: { month: string; items: T[] }[] = [];
  for (const r of rows) {
    const m = r.watchedOn.slice(0, 7);
    const last = out[out.length - 1];
    if (last && last.month === m) last.items.push(r);
    else out.push({ month: m, items: [r] });
  }
  return out;
}

/** «marzo de 2026» en el idioma de la página, a partir de «2026-03». */
export function monthLabel(month: string, lang: string): string {
  const d = new Date(`${month}-15T12:00:00Z`);
  const s = new Intl.DateTimeFormat(lang, { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(d);
  return s.charAt(0).toUpperCase() + s.slice(1);
}
