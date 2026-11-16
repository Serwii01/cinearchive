/**
 * Sincronía del cineclub en el navegador (pura, con tests). Separada de
 * cineclub.ts porque esa trae la lista de películas y no hace falta en cliente.
 */

/**
 * Segundos de desfase que se toleran antes de recolocar el vídeo. Menos, y se
 * notarían saltos con cada pequeño atasco de red; más, y en el chat se
 * comentaría una escena que a alguien aún no le ha llegado.
 */
export const DERIVA_MAX = 2.5;

/** Segundos de diferencia entre donde va el vídeo y donde va la sala. */
export function driftSeconds(current: number, target: number): number {
  return Math.abs(current - target);
}
