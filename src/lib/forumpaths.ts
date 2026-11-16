/**
 * Rutas del foro (puras, sin base de datos: las usa también el navegador).
 * Un hilo vive en `foro/{id}-{título}`; el título es decorativo, como en las
 * fichas, y la página redirige al que toca si llega otro.
 */
import { slugify } from './slug';

export const threadPath = (id: number, title: string): string => {
  const s = slugify(title);
  return `foro/${id}${s ? `-${s}` : ''}`;
};

/** El id de `123-titulo` (o `123`), o null. */
export function parseThreadId(param: string): number | null {
  const m = /^(\d+)(?:-|$)/.exec(param);
  if (!m) return null;
  const id = Number(m[1]);
  return Number.isInteger(id) && id > 0 ? id : null;
}
