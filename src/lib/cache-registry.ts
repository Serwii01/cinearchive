/**
 * Registro de las cachés en memoria del servidor.
 *
 * El proyecto tiene una decena de cachés repartidas por `src/lib/` (fichas de
 * película, plataformas, personas, estadísticas, recomendaciones, geocodifi-
 * cación, salas de cine, rate limiting…). Cada una es una `const` privada de su
 * módulo, así que hasta ahora no había forma de saber cuántas entradas tenían ni
 * de vaciar una sin reiniciar el contenedor entero.
 *
 * Cada módulo se apunta aquí al cargarse y el panel de administración las lee
 * todas por igual.
 *
 * Este módulo NO IMPORTA NADA, a propósito: es una hoja del grafo de
 * dependencias. La flecha va siempre en el mismo sentido (`films.ts` →
 * `cache-registry.ts`), nunca al revés, así que no puede haber ciclos.
 */

export interface CacheHandle {
  /** Identificador estable. Se usa en la API y como clave de traducción. */
  id: string;
  /** Etiqueta de respaldo, por si falta la traducción. */
  label: string;
  /** Tiempo de vida de una entrada, si la caché tiene uno fijo. */
  ttlMs?: number;
  /** Tope de entradas, si lo hay. */
  maxKeys?: number;
  /** false para las cachés que NO se deben poder vaciar desde la interfaz. */
  clearable?: boolean;
  size(): number;
  clear(): void;
}

export interface CacheInfo {
  id: string;
  label: string;
  size: number;
  ttlMs: number | null;
  maxKeys: number | null;
  clearable: boolean;
}

const registro = new Map<string, CacheHandle>();

/**
 * Apunta una caché. Es idempotente por id: si un módulo se recarga (Vite en
 * desarrollo lo hace a menudo), sustituye la entrada en vez de duplicar la fila.
 */
export function registerCache(handle: CacheHandle): void {
  registro.set(handle.id, handle);
}

/**
 * Foto del registro, ordenada por id para que las filas del panel no bailen
 * entre un refresco y el siguiente.
 */
export function listCaches(): CacheInfo[] {
  return [...registro.values()]
    .map((c) => ({
      id: c.id,
      label: c.label,
      // Una caché rota no debe tumbar el panel entero.
      size: (() => {
        try {
          return c.size();
        } catch {
          return -1;
        }
      })(),
      ttlMs: c.ttlMs ?? null,
      maxKeys: c.maxKeys ?? null,
      clearable: c.clearable !== false,
    }))
    .sort((a, b) => a.id.localeCompare(b.id));
}

/** Vacía una caché por id. false si no existe o no se puede vaciar. */
export function clearCache(id: string): boolean {
  const c = registro.get(id);
  if (!c || c.clearable === false) return false;
  c.clear();
  return true;
}

/** Vacía todas las vaciables y devuelve cuántas se han vaciado. */
export function clearAllCaches(): number {
  let n = 0;
  for (const c of registro.values()) {
    if (c.clearable === false) continue;
    c.clear();
    n++;
  }
  return n;
}
