/**
 * Cálculos del atlas que también hacen falta en el navegador: décadas, países y
 * «tu mapa». Sin datos ni dependencias, para que el script del cliente no
 * arrastre el JSON de movimientos. Pura (tiene tests en movements.test.ts).
 */

interface Span {
  from: number;
  /** null si sigue vivo. */
  to: number | null;
}

/** Década (1950, 1960…) de un año. */
export const decadeOf = (year: number): number => Math.floor(year / 10) * 10;

/** Las décadas que cubren los movimientos, de la primera a la actual. */
export function decadesOf(movements: Span[], now = new Date().getFullYear()): number[] {
  if (!movements.length) return [];
  const first = decadeOf(Math.min(...movements.map((m) => m.from)));
  const last = decadeOf(Math.max(...movements.map((m) => m.to ?? now)));
  const out: number[] = [];
  for (let d = first; d <= last; d += 10) out.push(d);
  return out;
}

/** ¿Estuvo vivo el movimiento en algún año de esa década? */
export function activeIn(m: Span, decade: number, now = new Date().getFullYear()): boolean {
  return m.from <= decade + 9 && (m.to ?? now) >= decade;
}

/** País (ISO) → movimientos que tiene, en el orden recibido. */
export function movementsByCountry<T extends { countries: string[] }>(movements: T[]): Map<string, T[]> {
  const out = new Map<string, T[]>();
  for (const m of movements) for (const iso of m.countries) out.set(iso, [...(out.get(iso) ?? []), m]);
  return out;
}

/**
 * «Tu mapa»: cuántas películas vistas hay de cada país de producción. Una
 * coproducción cuenta para todos sus países, pero una sola vez por película
 * aunque TMDB repita un país.
 */
export function countryCounts(films: { iso_3166_1: string }[][]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const countries of films) {
    for (const iso of new Set(countries.map((c) => c.iso_3166_1).filter(Boolean))) out[iso] = (out[iso] ?? 0) + 1;
  }
  return out;
}

/** Movimientos de los que no has visto nada de ninguno de sus países: «te faltan». */
export function missingMovements<T extends { countries: string[] }>(movements: T[], seen: Record<string, number>): T[] {
  return movements.filter((m) => !m.countries.some((iso) => (seen[iso] ?? 0) > 0));
}

/**
 * Tono de un país en «tu mapa» (0 a 4) según cuántas películas suyas has visto.
 * Escalones y no una escala lineal: con Estados Unidos en cientos, todo lo demás
 * saldría casi en blanco.
 */
export function mineLevel(n: number): 0 | 1 | 2 | 3 | 4 {
  if (n <= 0) return 0;
  if (n === 1) return 1;
  if (n < 5) return 2;
  if (n < 15) return 3;
  return 4;
}
