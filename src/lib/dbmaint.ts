/**
 * Mantenimiento de films_cache desde el panel de administración — SOLO SERVIDOR.
 *
 * films_cache es una caché: todo lo que hay en ella se vuelve a pedir a TMDB
 * si hace falta. Pero era la tabla que más crecía, por dos motivos que aquí se
 * atacan por separado:
 *
 *  - Cada fila guardaba la respuesta ENTERA de TMDB (equipo técnico completo,
 *    sinopsis de cada similar, 131 regiones de «dónde ver»…). Desde la 1.9 se
 *    guarda podada (slimMovie), pero las filas antiguas siguen gordas hasta
 *    que alguien vuelve a visitar la película. `compactarCache` las reescribe
 *    todas de una vez.
 *
 *  - Cada película que visitó alguien —o un rastreador, que el sitemap las
 *    lista— se queda para siempre. `purgarHuerfanas` borra las que llevan
 *    meses sin visitas y no están en ninguna lista, valoración ni catálogo de
 *    ningún usuario: no hay dato de nadie que dependa de ellas.
 *
 * Postgres no devuelve el disco al sistema al borrar o encoger filas: lo
 * reutiliza. Para que el tamaño baje de verdad hace falta VACUUM FULL, que
 * reescribe la tabla y la bloquea unos segundos; en una tabla de unas decenas
 * de megas es imperceptible. No puede ir dentro de una transacción, así que se
 * lanza suelto al final.
 */
import { sql } from 'drizzle-orm';
import { db } from '../db/client';
import { slimMovie, type TmdbMovie } from './tmdb';

export interface ResultadoMantenimiento {
  /** Filas examinadas. */
  filas: number;
  /** Filas reescritas (compactar) o borradas (purgar). */
  afectadas: number;
  /** Tamaño total de films_cache antes y después, en bytes. */
  bytesAntes: number;
  bytesDespues: number;
}

const LOTE = 200;

/**
 * Serialización con las claves ordenadas, para comparar dos JSON por
 * contenido. Postgres guarda jsonb con las claves en su propio orden (por
 * longitud y luego alfabético), así que un JSON.stringify directo de lo que
 * devuelve la base de datos nunca coincide con el de lo que se escribió, aunque
 * sea el mismo objeto.
 */
function canon(v: unknown): string {
  if (Array.isArray(v)) return `[${v.map(canon).join(',')}]`;
  if (v && typeof v === 'object') {
    const o = v as Record<string, unknown>;
    return `{${Object.keys(o).sort().map((k) => `${JSON.stringify(k)}:${canon(o[k])}`).join(',')}}`;
  }
  return JSON.stringify(v);
}

async function tamanoTabla(): Promise<number> {
  const { rows } = await db.execute(sql`select pg_total_relation_size('films_cache')::bigint as b`);
  return Number((rows[0] as { b: unknown }).b ?? 0);
}

async function vacuumFull(): Promise<void> {
  // VACUUM no admite transacción; drizzle ejecuta esto tal cual, fuera de una.
  await db.execute(sql`vacuum (full, analyze) films_cache`);
}

/**
 * Reescribe cada fila con la ficha podada. Idempotente: una fila ya podada se
 * queda igual y no se toca (se compara el contenido antes de escribir).
 */
export async function compactarCache(): Promise<ResultadoMantenimiento> {
  const bytesAntes = await tamanoTabla();
  let filas = 0;
  let afectadas = 0;
  let desde = -1;

  for (;;) {
    const { rows } = await db.execute(sql`
      select tmdb_id, tmdb from films_cache where tmdb_id > ${desde} order by tmdb_id limit ${LOTE}
    `);
    if (rows.length === 0) break;
    for (const r of rows as { tmdb_id: number; tmdb: TmdbMovie }[]) {
      filas++;
      desde = r.tmdb_id;
      const podada = slimMovie(r.tmdb);
      if (canon(r.tmdb) === canon(podada)) continue;
      await db.execute(sql`update films_cache set tmdb = ${JSON.stringify(podada)}::jsonb where tmdb_id = ${r.tmdb_id}`);
      afectadas++;
    }
  }

  if (afectadas > 0) await vacuumFull();
  return { filas, afectadas, bytesAntes, bytesDespues: await tamanoTabla() };
}

/** Condición de huérfana: sin visitas en `dias` días y sin rastro en tablas de usuario. */
const huerfanas = (dias: number) => sql`
  fetched_at < now() - make_interval(days => ${dias})
  and tmdb_id not in (select tmdb_id from user_films)
  and tmdb_id not in (select tmdb_id from user_list_films)
  and tmdb_id not in (select tmdb_id from extra_films)
`;

/** Cuántas filas borraría `purgarHuerfanas(dias)`, sin tocar nada. */
export async function contarHuerfanas(dias: number): Promise<{ filas: number; total: number }> {
  const { rows } = await db.execute(sql`
    select count(*) filter (where ${huerfanas(dias)})::int as huerfanas, count(*)::int as total from films_cache
  `);
  const r = rows[0] as { huerfanas: number; total: number };
  return { filas: Number(r.huerfanas), total: Number(r.total) };
}

export async function purgarHuerfanas(dias: number): Promise<ResultadoMantenimiento> {
  const bytesAntes = await tamanoTabla();
  const { total } = await contarHuerfanas(dias);
  const { rowCount } = await db.execute(sql`delete from films_cache where ${huerfanas(dias)}`);
  const afectadas = rowCount ?? 0;
  if (afectadas > 0) await vacuumFull();
  return { filas: total, afectadas, bytesAntes, bytesDespues: await tamanoTabla() };
}
