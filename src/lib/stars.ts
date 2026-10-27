/**
 * Notas de ½ en ½ estrella (0,5 a 5). Se comparten entre servidor, páginas y
 * la importación de Letterboxd, que puntúa igual.
 */

export const MIN_RATING = 0.5;
export const MAX_RATING = 5;

/** ¿Es una nota válida? Múltiplo de 0,5 entre 0,5 y 5. */
export function isValidRating(r: unknown): r is number {
  return typeof r === 'number' && r >= MIN_RATING && r <= MAX_RATING && Number.isInteger(r * 2);
}

/**
 * Las tres partes con que se pinta una nota: estrellas llenas, la media (si
 * la hay) y las vacías hasta cinco. 3,5 → «★★★» + «½» + «★» apagada.
 */
export function starParts(r: number): { full: string; half: boolean; empty: string } {
  const full = Math.floor(r);
  const half = r - full >= 0.5;
  return { full: '★'.repeat(full), half, empty: '★'.repeat(5 - full - (half ? 1 : 0)) };
}

/** «3,5» o «3.5» según el idioma; las enteras sin decimales. */
export function formatRating(r: number, lang: string): string {
  return Number.isInteger(r) ? String(r) : r.toLocaleString(lang === 'en' ? 'en-GB' : 'es-ES');
}

/**
 * Siguiente nota al pulsar la estrella `n` de la botonera: la primera vez da
 * `n`, la segunda la deja en `n − ½` y la tercera la quita (0). Así se pone
 * media estrella con un dedo, sin zonas de pulsación de 22 px.
 */
export function nextRating(current: number, n: number): number {
  if (current === n) return n - 0.5;
  if (current === n - 0.5) return 0;
  return n;
}

/** Cómo se pinta el botón `n` con la nota `r`: lleno, a medias o vacío. */
export function starFill(r: number, n: number): 'full' | 'half' | 'empty' {
  if (r >= n) return 'full';
  return r === n - 0.5 ? 'half' : 'empty';
}
