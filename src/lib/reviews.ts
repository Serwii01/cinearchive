/**
 * Utilidades puras de reseñas (tienen tests).
 */

/**
 * El principio de una reseña para enseñarla en la ficha: hasta `max`
 * caracteres, cortando en el último espacio para no partir una palabra, sin
 * dejar saltos de línea de más. `cortada` dice si había más texto.
 */
export function extracto(texto: string, max = 280): { texto: string; cortada: boolean } {
  const limpio = texto.replace(/\r\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
  if (limpio.length <= max) return { texto: limpio, cortada: false };
  const corte = limpio.slice(0, max);
  const espacio = corte.lastIndexOf(' ');
  const base = (espacio > max * 0.6 ? corte.slice(0, espacio) : corte).replace(/[\s.,;:—–-]+$/, '');
  return { texto: `${base}…`, cortada: true };
}
