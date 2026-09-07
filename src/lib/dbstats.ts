/**
 * Estado de PostgreSQL para el panel de administración — SOLO SERVIDOR.
 *
 * Todo sale de las vistas de estadísticas que Postgres ya mantiene, así que no
 * cuesta nada: no hay contadores propios ni tablas nuevas.
 *
 * Cada consulta va en su propio try/catch a propósito. Si una fallara —por
 * permisos, o porque la tabla de migraciones no existe en un entorno creado con
 * `db:push`— el resto del bloque tiene que seguir mostrándose; ese trozo llega
 * como null y el panel pinta un guion.
 */
import { sql } from 'drizzle-orm';
import { readFile } from 'node:fs/promises';
import { db } from '../db/client';
import { createMemo } from './memo';

export interface DbGeneral {
  nombre: string;
  tamanoBytes: number;
  version: string;
  uptimeS: number;
}

export interface DbTabla {
  tabla: string;
  totalBytes: number;
  heapBytes: number;
  indicesBytes: number;
  filasVivas: number;
  seqScan: number;
  idxScan: number;
}

export interface DbConexiones {
  total: number;
  activas: number;
  ociosas: number;
  ociosasEnTx: number;
  max: number;
  txMasLargaS: number;
}

export interface DbCache {
  hitPct: number | null;
  blksHit: number;
  blksRead: number;
  xactCommit: number;
  xactRollback: number;
  deadlocks: number;
  tempBytes: number;
  statsReset: string | null;
}

export interface DbMigracion {
  aplicadas: number;
  enDisco: number;
  ultimaEn: number | null;
  ultimaEtiqueta: string | null;
  pendientes: number;
}

export interface DbStats {
  general: DbGeneral | null;
  tablas: DbTabla[];
  conexiones: DbConexiones | null;
  cache: DbCache | null;
  migracion: DbMigracion | null;
}

/** Ejecuta una consulta y devuelve null si falla, sin propagar el error. */
async function intentar<T>(fn: () => Promise<T>): Promise<T | null> {
  try {
    return await fn();
  } catch (err) {
    console.error('[dbstats] consulta fallida:', err);
    return null;
  }
}

const num = (v: unknown): number => Number(v ?? 0);

async function general(): Promise<DbGeneral | null> {
  return intentar(async () => {
    const { rows } = await db.execute(sql`
      select current_database()                                            as nombre,
             pg_database_size(current_database())::bigint                  as tamano_bytes,
             version()                                                     as version,
             extract(epoch from now() - pg_postmaster_start_time())::bigint as uptime_s
    `);
    const r = rows[0] as Record<string, unknown>;
    return {
      nombre: String(r.nombre),
      tamanoBytes: num(r.tamano_bytes),
      // "PostgreSQL 16.4 on x86_64…" → nos quedamos con las dos primeras palabras.
      version: String(r.version).split(' ').slice(0, 2).join(' '),
      uptimeS: num(r.uptime_s),
    };
  });
}

/**
 * Las diez tablas más grandes, con su uso de índices en la misma pasada.
 * `films_cache` domina siempre (guarda el JSON de TMDB), que es justo el dato
 * que hasta ahora no se veía y el que dice cuándo toca podar la caché.
 */
async function tablas(): Promise<DbTabla[]> {
  const filas = await intentar(async () => {
    const { rows } = await db.execute(sql`
      select c.relname                             as tabla,
             pg_total_relation_size(c.oid)::bigint as total_bytes,
             pg_relation_size(c.oid)::bigint       as heap_bytes,
             pg_indexes_size(c.oid)::bigint        as indices_bytes,
             -- Las dos son ESTIMACIONES del recolector de estadísticas, no un
             -- recuento: n_live_tup se queda a cero hasta que autovacuum pasa
             -- por la tabla, y reltuples vale -1 si nunca se ha analizado. Se
             -- toma la mayor, y la página muestra un guion si sale cero pero la
             -- tabla ocupa espacio (más honesto que afirmar "0 filas").
             greatest(coalesce(s.n_live_tup, 0), coalesce(nullif(c.reltuples, -1), 0))::bigint
                                                   as filas_vivas,
             coalesce(s.seq_scan, 0)::bigint       as seq_scan,
             coalesce(s.idx_scan, 0)::bigint       as idx_scan
        from pg_class c
        join pg_namespace n on n.oid = c.relnamespace
        left join pg_stat_user_tables s on s.relid = c.oid
       where c.relkind = 'r' and n.nspname = 'public'
       order by pg_total_relation_size(c.oid) desc
       limit 10
    `);
    return rows as Record<string, unknown>[];
  });

  return (filas ?? []).map((r) => ({
    tabla: String(r.tabla),
    totalBytes: num(r.total_bytes),
    heapBytes: num(r.heap_bytes),
    indicesBytes: num(r.indices_bytes),
    filasVivas: num(r.filas_vivas),
    seqScan: num(r.seq_scan),
    idxScan: num(r.idx_scan),
  }));
}

/**
 * Conexiones abiertas contra esta base de datos.
 *
 * Nota de permisos para el futuro: un usuario que no sea superusuario ve las
 * filas de pg_stat_activity de otros, pero con `state` a NULL, y entonces estos
 * `filter` mentirían. Hoy no aplica —la app entra con el POSTGRES_USER que crea
 * la imagen, que es superusuario— pero si algún día se le da un rol propio, hay
 * que revisar esto.
 */
async function conexiones(): Promise<DbConexiones | null> {
  return intentar(async () => {
    const { rows } = await db.execute(sql`
      select count(*)::int                                              as total,
             count(*) filter (where state = 'active')::int              as activas,
             count(*) filter (where state = 'idle')::int                as ociosas,
             count(*) filter (where state = 'idle in transaction')::int as ociosas_en_tx,
             (select setting::int from pg_settings where name = 'max_connections') as max,
             coalesce(max(extract(epoch from now() - xact_start)), 0)::int as tx_mas_larga_s
        from pg_stat_activity
       where datname = current_database()
    `);
    const r = rows[0] as Record<string, unknown>;
    return {
      total: num(r.total),
      activas: num(r.activas),
      ociosas: num(r.ociosas),
      ociosasEnTx: num(r.ociosas_en_tx),
      max: num(r.max),
      txMasLargaS: num(r.tx_mas_larga_s),
    };
  });
}

/**
 * Aciertos de caché y contadores de la base de datos.
 *
 * OJO al interpretarlo: son acumulados desde `stats_reset`, no una tasa de
 * ahora mismo. Un 99 % acumulado puede convivir perfectamente con un mal rato
 * en este instante. Por eso el panel muestra al lado desde cuándo se cuenta.
 */
async function cacheStats(): Promise<DbCache | null> {
  return intentar(async () => {
    const { rows } = await db.execute(sql`
      select blks_hit::bigint   as blks_hit,
             blks_read::bigint  as blks_read,
             case when blks_hit + blks_read > 0
                  then round(100.0 * blks_hit / (blks_hit + blks_read), 2)
                  else null end as hit_pct,
             xact_commit::bigint   as xact_commit,
             xact_rollback::bigint as xact_rollback,
             deadlocks::bigint     as deadlocks,
             temp_bytes::bigint    as temp_bytes,
             stats_reset
        from pg_stat_database
       where datname = current_database()
    `);
    const r = rows[0] as Record<string, unknown>;
    return {
      hitPct: r.hit_pct == null ? null : Number(r.hit_pct),
      blksHit: num(r.blks_hit),
      blksRead: num(r.blks_read),
      xactCommit: num(r.xact_commit),
      xactRollback: num(r.xact_rollback),
      deadlocks: num(r.deadlocks),
      tempBytes: num(r.temp_bytes),
      statsReset: r.stats_reset ? new Date(r.stats_reset as string).toISOString() : null,
    };
  });
}

/**
 * Migraciones aplicadas frente a las que hay en disco.
 *
 * Drizzle guarda en `drizzle.__drizzle_migrations` un hash del SQL, que no es
 * legible; el nombre bonito sale del journal, que el Dockerfile ya copia a la
 * imagen. Si `pendientes` sale mayor que cero es que la imagen se desplegó pero
 * `migrate.mjs` no llegó a aplicar algo: justo el fallo silencioso que uno
 * quiere ver en un panel.
 */
async function migracion(): Promise<DbMigracion | null> {
  const aplicadasRow = await intentar(async () => {
    const { rows } = await db.execute(sql`
      select count(*)::int as aplicadas, max(created_at)::bigint as ultima_ms
        from drizzle.__drizzle_migrations
    `);
    return rows[0] as Record<string, unknown>;
  });

  let enDisco = 0;
  let ultimaEtiqueta: string | null = null;
  try {
    // Ruta relativa al directorio de trabajo: /app en el contenedor, la raíz
    // del repositorio en desarrollo.
    const journal = JSON.parse(await readFile('drizzle/meta/_journal.json', 'utf8')) as {
      entries?: { tag: string }[];
    };
    enDisco = journal.entries?.length ?? 0;
    ultimaEtiqueta = journal.entries?.at(-1)?.tag ?? null;
  } catch {
    /* sin journal a mano: se informa solo de lo aplicado */
  }

  if (!aplicadasRow && enDisco === 0) return null;

  const aplicadas = num(aplicadasRow?.aplicadas);
  return {
    aplicadas,
    enDisco,
    ultimaEn: aplicadasRow?.ultima_ms ? num(aplicadasRow.ultima_ms) : null,
    ultimaEtiqueta,
    pendientes: Math.max(0, enDisco - aplicadas),
  };
}

// El panel se refresca cada pocos segundos; estas consultas no cambian tan
// deprisa como para pagarlas en cada visita.
const memo = createMemo<DbStats>(20_000, 1);

export function getDbStats(): Promise<DbStats> {
  return memo.get('todo', async () => {
    const [g, t, c, ca, m] = await Promise.all([
      general(),
      tablas(),
      conexiones(),
      cacheStats(),
      migracion(),
    ]);
    return { general: g, tablas: t, conexiones: c, cache: ca, migracion: m };
  });
}
