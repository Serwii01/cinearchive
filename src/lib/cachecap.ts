/**
 * Tope de films_cache — SOLO SERVIDOR.
 *
 * films_cache guarda la ficha de TMDB de cada película que alguien abre. Nadie
 * la vaciaba, y los rastreadores la llenaron: el 7-11-2026 tenía 1.016.576
 * películas y 17 GB (el disco del VPS es de 58). Cada ficha enlaza a sus
 * similares y a su reparto, así que un rastreador puede recorrer el catálogo
 * entero de TMDB a través de la web y dejarlo todo guardado.
 *
 * Qué se queda siempre: las películas que están en el perfil, las listas o el
 * diario de alguien, y las del catálogo del panel. De las demás, solo las
 * MAX_SUELTAS abiertas más recientemente. Lo que se borra se vuelve a pedir a
 * TMDB si alguien lo abre (unos cientos de milisegundos la primera vez).
 *
 * Dos formas de borrar, porque Postgres no devuelve el disco al borrar filas
 * (solo lo reutiliza):
 *  - Poda normal (lo de cada noche): borra lo que sobra en lotes pequeños. El
 *    hueco lo reaprovechan las fichas nuevas, así que la tabla deja de crecer.
 *  - A fondo (cuando la tabla es enorme, como la primera vez): aparta lo que se
 *    queda, vacía la tabla con TRUNCATE y lo vuelve a meter. Así el disco se
 *    recupera en el momento y sin necesitar espacio libre del tamaño de la
 *    tabla, que es lo que pediría un VACUUM FULL. Mientras se vuelven a meter
 *    las filas, la tabla queda bloqueada unos segundos.
 *
 * Corre dentro del proceso de Node, como los avisos de plataformas (ver
 * streamjob.ts): un contenedor de cron costaría más memoria que la tarea.
 */
import { sql } from 'drizzle-orm';
import { db } from '../db/client';

/** Películas sin dueño que se conservan (las más recientes). Unos 300 MB. */
export const MAX_SUELTAS = 20_000;
/** Por encima de tantas filas, la poda se hace a fondo. */
export const UMBRAL_A_FONDO = 100_000;
/** Filas por lote en la poda normal: cada lote bloquea poco. */
const LOTE = 2_000;

const CADA_MS = 24 * 60 * 60 * 1000;
// No en mitad del arranque ni a la vez que la primera vuelta de los avisos (2 min).
const PRIMERA_MS = 10 * 60 * 1000;

export type Modo = 'nada' | 'normal' | 'a-fondo';

/**
 * Qué hacer según cuántas filas hay. Pura, para poder probarla.
 * `conDueno`: películas que hay que conservar porque las usa alguien.
 */
export function decidirPoda(total: number, conDueno: number, max = MAX_SUELTAS, umbral = UMBRAL_A_FONDO): Modo {
  if (total > umbral) return 'a-fondo';
  if (total - conDueno > max) return 'normal';
  return 'nada';
}

/** Películas que usa alguien: nunca se borran. */
const conDueno = sql`(
  select tmdb_id from user_films
  union select tmdb_id from user_list_films
  union select tmdb_id from user_viewings
  union select tmdb_id from extra_films
)`;

export interface ResultadoPoda {
  modo: Modo;
  antes: number;
  despues: number;
  ms: number;
}

async function contar(): Promise<{ total: number; dueno: number }> {
  const { rows } = await db.execute(sql`
    select (select count(*) from films_cache)::int as total,
           (select count(*) from films_cache where tmdb_id in ${conDueno})::int as dueno`);
  const r = rows[0] as { total: number; dueno: number };
  return { total: Number(r.total), dueno: Number(r.dueno) };
}

async function podarAFondo(max: number): Promise<void> {
  await db.transaction(async (tx) => {
    // EXCLUSIVE deja leer mientras se copia lo que se queda; las escrituras
    // esperan, para que no se pierda ninguna ficha entre la copia y el TRUNCATE.
    await tx.execute(sql`lock table films_cache in exclusive mode`);
    await tx.execute(sql`
      create temp table poda_films on commit drop as
      select * from films_cache where tmdb_id in ${conDueno}
      union all
      select * from (
        select * from films_cache where tmdb_id not in ${conDueno}
        order by fetched_at desc limit ${max}
      ) sueltas`);
    await tx.execute(sql`truncate films_cache`);
    await tx.execute(sql`insert into films_cache select * from poda_films`);
  });
  await db.execute(sql`analyze films_cache`);
}

async function podarNormal(max: number): Promise<void> {
  for (;;) {
    const { rowCount } = await db.execute(sql`
      delete from films_cache where tmdb_id in (
        select tmdb_id from films_cache where tmdb_id not in ${conDueno}
        order by fetched_at desc offset ${max} limit ${LOTE}
      )`);
    if (!rowCount || rowCount < LOTE) break;
  }
}

let podando = false;

/** Una vuelta de poda. Devuelve null si ya había otra en marcha. */
export async function podarCache(max = MAX_SUELTAS, umbral = UMBRAL_A_FONDO): Promise<ResultadoPoda | null> {
  if (podando) return null;
  podando = true;
  const t0 = Date.now();
  try {
    const { total, dueno } = await contar();
    const modo = decidirPoda(total, dueno, max, umbral);
    if (modo === 'a-fondo') await podarAFondo(max);
    else if (modo === 'normal') await podarNormal(max);
    const despues = modo === 'nada' ? total : (await contar()).total;
    return { modo, antes: total, despues, ms: Date.now() - t0 };
  } finally {
    podando = false;
  }
}

let arrancada = false;

/** Arranca la poda: a los diez minutos de arrancar y luego una vez al día. */
export function startCacheCap(): void {
  if (arrancada || process.env.CACHE_CAP === 'off') return;
  arrancada = true;
  const vuelta = () =>
    podarCache()
      .then((r) => {
        if (r && r.modo !== 'nada') console.log(`[caché] poda ${r.modo}: ${r.antes} → ${r.despues} películas (${r.ms} ms)`);
      })
      .catch((e) => console.error('[caché] error en la poda:', e));
  setTimeout(vuelta, PRIMERA_MS).unref();
  setInterval(vuelta, CADA_MS).unref();
}
