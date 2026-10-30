/**
 * Carteles nítidos en cualquier pantalla. Sirve en el servidor y en el
 * navegador: no importa nada.
 *
 * TMDB sirve cada cartel en varios anchos (w92 … w780). Cada sitio de la web
 * elegía uno a mano, y de tres formas distintas: un tamaño fijo (w185 en la
 * filmografía de una persona, pintado a 170 px: borroso en cualquier pantalla
 * retina), un par 1x/2x o un srcset de anchos. Ahora todos dan al navegador la
 * lista entera con descriptores de ancho, y él elige con el `sizes` de cada
 * sitio y la densidad de la pantalla: ni borroso en un móvil 3x ni 780 px para
 * una miniatura en un portátil normal.
 */

/** Anchos de cartel que ofrece TMDB y que merece la pena ofrecer. */
export const POSTER_WIDTHS = [185, 342, 500, 780] as const;

const SIZE = /\/t\/p\/(?:w\d+|original)\//;

/**
 * srcset con todos los anchos a partir de cualquier URL de cartel de TMDB (el
 * tamaño que traiga da igual). undefined si no es una URL de TMDB: un cartel
 * propio o nada se queda con su `src`.
 */
export function posterSet(url: string | null | undefined): string | undefined {
  if (!url || !SIZE.test(url)) return undefined;
  return POSTER_WIDTHS.map((w) => `${url.replace(SIZE, `/t/p/w${w}/`)} ${w}w`).join(', ');
}

/** La misma URL en otro ancho (para el `src` de reserva). */
export function posterAt(url: string, width: (typeof POSTER_WIDTHS)[number]): string {
  return url.replace(SIZE, `/t/p/w${width}/`);
}
