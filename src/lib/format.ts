/**
 * Formateo de cifras para el panel de administración.
 *
 * Vive aparte porque las mismas cifras se pintan DOS veces: una en el servidor
 * (Astro, al cargar la página) y otra en el navegador (al refrescarse en vivo).
 * Si el formateo se duplicara, las dos versiones acabarían divergiendo.
 *
 * Por eso este módulo es puro: no importa nada del proyecto y no toca `node:*`,
 * así que puede viajar al bundle del cliente sin arrastrar la base de datos ni
 * el sistema de ficheros detrás.
 */

/** Lo que se muestra cuando un dato no está disponible. Uno solo, en todo el panel. */
export const SIN_DATO = '—';

const UNIDADES = ['B', 'KiB', 'MiB', 'GiB', 'TiB', 'PiB'];

/**
 * Bytes en unidades binarias. Se usan KiB/MiB/GiB (1024) y no kB/MB/GB (1000)
 * porque es lo que reportan `/proc/meminfo` y `statfs`, y redondearlo a base
 * 1000 haría que las cifras no cuadraran con las de `free` o `df` en el VPS.
 */
export function formatBytes(bytes: number | null | undefined, decimales = 1): string {
  if (bytes == null || !Number.isFinite(bytes)) return SIN_DATO;
  if (bytes < 1024) return `${Math.round(bytes)} B`;

  let valor = bytes;
  let i = 0;
  while (valor >= 1024 && i < UNIDADES.length - 1) {
    valor /= 1024;
    i++;
  }
  // Por encima de 100 no hacen falta decimales: "234 GiB" se lee mejor que "234,1 GiB".
  const d = valor >= 100 ? 0 : decimales;
  return `${valor.toFixed(d).replace('.', ',')} ${UNIDADES[i]}`;
}

/** Segundos → "45 s", "12 min", "3 h 20 min", "5 d 4 h". */
export function formatDuration(segundos: number | null | undefined): string {
  if (segundos == null || !Number.isFinite(segundos) || segundos < 0) return SIN_DATO;
  const s = Math.floor(segundos);
  if (s < 60) return `${s} s`;

  const min = Math.floor(s / 60);
  if (min < 60) return `${min} min`;

  const h = Math.floor(min / 60);
  if (h < 24) {
    const restoMin = min % 60;
    return restoMin ? `${h} h ${restoMin} min` : `${h} h`;
  }

  const d = Math.floor(h / 24);
  const restoH = h % 24;
  return restoH ? `${d} d ${restoH} h` : `${d} d`;
}

/**
 * Porcentaje acotado a 0-100, pensado para el ancho de las barras.
 * Devuelve 0 —y no NaN— cuando el total es cero: una barra vacía es una
 * respuesta razonable, un NaN en un atributo `style` rompe el diseño.
 */
export function pct(parte: number | null | undefined, total: number | null | undefined): number {
  if (parte == null || total == null || !Number.isFinite(parte) || !Number.isFinite(total)) return 0;
  if (total <= 0) return 0;
  return Math.min(100, Math.max(0, Math.round((parte / total) * 100)));
}

/** Entero con separador de miles. */
export function formatNum(n: number | null | undefined, locale = 'es-ES'): string {
  if (n == null || !Number.isFinite(n)) return SIN_DATO;
  return new Intl.NumberFormat(locale).format(n);
}

/** Latencia: "312 ms" hasta el segundo, "1,4 s" a partir de ahí. */
export function formatMs(ms: number | null | undefined): string {
  if (ms == null || !Number.isFinite(ms) || ms < 0) return SIN_DATO;
  if (ms < 1000) return `${Math.round(ms)} ms`;
  return `${(ms / 1000).toFixed(1).replace('.', ',')} s`;
}

/** Porcentaje con su símbolo, o "—". Acepta decimales para la carga por núcleo. */
export function formatPct(valor: number | null | undefined, decimales = 0): string {
  if (valor == null || !Number.isFinite(valor)) return SIN_DATO;
  return `${valor.toFixed(decimales).replace('.', ',')} %`;
}
