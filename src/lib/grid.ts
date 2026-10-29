/**
 * Cuántas casillas necesita una rejilla para cerrar en rectángulo: `n` subido
 * al siguiente múltiplo de `of`. Con of = 12 vale para rejillas de 4, 6 y 12
 * columnas a la vez. Cero se queda en cero: una rejilla vacía no se pinta.
 */
export function padTo(n: number, of: number): number {
  if (n <= 0 || of <= 0) return Math.max(0, n);
  return Math.ceil(n / of) * of;
}

/**
 * Columnas de la rejilla de reseñas según cuántas hay, para que nunca quede
 * una fila a medias: 1 → una columna, 2 y 4 → dos, 3 y 6 → tres, 5 → se
 * rellena hasta 6. Devuelve las columnas en tableta y escritorio y las
 * casillas vacías que hacen falta.
 */
export function reviewGrid(n: number): { sm: 1 | 2 | 3; lg: 1 | 2 | 3; pad: number } {
  if (n <= 1) return { sm: 1, lg: 1, pad: 0 };
  if (n === 2) return { sm: 2, lg: 2, pad: 0 };
  if (n === 3) return { sm: 3, lg: 3, pad: 0 };
  if (n === 4) return { sm: 2, lg: 2, pad: 0 };
  return { sm: 2, lg: 3, pad: padTo(n, 6) - n };
}
