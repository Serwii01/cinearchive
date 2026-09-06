/**
 * Caché en memoria con caducidad (TTL), para no repetir trabajo caro entre
 * peticiones: consultas a BD y llamadas a APIs externas que devuelven lo mismo
 * durante minutos u horas.
 *
 * Igual que el rate limiter, vive en el proceso Node del VPS (una instancia). Si
 * algún día se escalara a varias, migrar a Redis. Por eso se acota el tamaño: la
 * caché nunca debe convertirse en una fuga de memoria.
 */

interface Entry<T> {
  value: T;
  expires: number;
}

export interface Memo<T> {
  /** Devuelve el valor cacheado, o lo calcula con `fn` y lo guarda. */
  get(key: string, fn: () => Promise<T>): Promise<T>;
  /** Invalida una clave (o toda la caché si no se pasa clave). */
  clear(key?: string): void;
  /** Nº de entradas vivas (para diagnóstico). */
  readonly size: number;
}

/**
 * Crea una caché con TTL fijo. `maxKeys` es la cota dura: al alcanzarla se hace
 * una purga de lo caducado y, si aún no baja, se descartan las entradas más
 * antiguas (el Map de JS conserva el orden de inserción).
 *
 * Las promesas en vuelo se cachean también, así que N peticiones simultáneas a
 * la misma clave disparan UNA sola llamada (evita la estampida de caché). Si la
 * promesa falla, la entrada se retira para poder reintentar en la siguiente.
 */
export function createMemo<T>(ttlMs: number, maxKeys = 500): Memo<T> {
  const map = new Map<string, Entry<Promise<T>>>();

  function evict(now: number): void {
    for (const [k, e] of map) {
      if (e.expires <= now) map.delete(k);
    }
    while (map.size >= maxKeys) {
      const oldest = map.keys().next();
      if (oldest.done) break;
      map.delete(oldest.value);
    }
  }

  return {
    get(key, fn) {
      const now = Date.now();
      const hit = map.get(key);
      if (hit && hit.expires > now) return hit.value;

      if (map.size >= maxKeys) evict(now);

      const value = fn().catch((err) => {
        map.delete(key); // no se cachean los fallos: la siguiente petición reintenta
        throw err;
      });
      map.set(key, { value, expires: now + ttlMs });
      return value;
    },
    clear(key) {
      if (key === undefined) map.clear();
      else map.delete(key);
    },
    get size() {
      return map.size;
    },
  };
}
