/**
 * Espacio libre en disco — SOLO SERVIDOR.
 *
 * El 7-11-2026 el disco del VPS estaba al 71 % sin que nadie lo supiera: la
 * caché de películas ocupaba 17 GB y Docker guardaba 12 GB de compilaciones
 * viejas. Si el disco se llena, Postgres se para y la web se cae. /api/health
 * avisa antes, y la vigilancia de GitHub (.github/workflows/vigilancia.yml)
 * lo convierte en un correo.
 *
 * El contenedor ve el mismo disco que el VPS (sus capas viven en él), así que
 * medir la raíz del contenedor es medir el disco de verdad.
 */
import { statfs } from 'node:fs/promises';

/** Por debajo de este porcentaje libre, se avisa. */
export const MIN_LIBRE = 0.15;
const CACHE_MS = 5 * 60 * 1000;

export type EstadoDisco = 'ok' | 'low' | 'unknown';

/** Pura, para poder probarla. */
export function estadoDisco(libres: number, total: number, min = MIN_LIBRE): EstadoDisco {
  if (!(total > 0) || !(libres >= 0)) return 'unknown';
  return libres / total < min ? 'low' : 'ok';
}

let cache: { estado: EstadoDisco; hasta: number } | null = null;

/** Estado del disco, medido como mucho cada cinco minutos. */
export async function disco(): Promise<EstadoDisco> {
  const ahora = Date.now();
  if (cache && ahora < cache.hasta) return cache.estado;
  let estado: EstadoDisco = 'unknown';
  try {
    const s = await statfs('/');
    // bavail: lo que queda para procesos normales (sin la reserva de root).
    estado = estadoDisco(s.bavail * s.bsize, s.blocks * s.bsize);
  } catch {
    estado = 'unknown';
  }
  cache = { estado, hasta: ahora + CACHE_MS };
  return estado;
}
