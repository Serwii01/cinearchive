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

type Breakpoint = 'sm' | 'md' | 'lg';

/**
 * Clases de las casillas de relleno de una rejilla cuyas columnas cambian con
 * la pantalla: cada casilla solo se ve donde hace falta para cerrar la fila.
 *
 * Rellenar sin más hasta un múltiplo común (12 para 4, 6 y 12 columnas) dejaba
 * en móvil filas enteras de casillas vacías, que no tienen contenido y miden
 * 0 px de alto: sus dos filetes quedaban pegados y salía una línea del doble de
 * gruesa. Devuelve una cadena de clases por casilla; un array vacío si la
 * rejilla ya cierra en todas las pantallas.
 *
 * Clases que genera (para que Tailwind las vea): block hidden sm:block
 * sm:hidden md:block md:hidden lg:block lg:hidden
 */
export function fillers(n: number, cols: { base: number } & Partial<Record<Breakpoint, number>>): string[] {
  const pads: [Breakpoint | 'base', number][] = [];
  let current = cols.base;
  for (const bp of ['base', 'sm', 'md', 'lg'] as const) {
    if (bp !== 'base' && cols[bp]) current = cols[bp]!;
    pads.push([bp, padTo(n, current) - n]);
  }
  const total = Math.max(...pads.map(([, pad]) => pad));
  return Array.from({ length: total }, (_, i) =>
    pads
      .map(([bp, pad]) => {
        const show = i < pad ? 'block' : 'hidden';
        return bp === 'base' ? show : `${bp}:${show}`;
      })
      .join(' '),
  );
}
