/**
 * Crecimiento y actividad para el panel de administración — SOLO SERVIDOR.
 *
 * Cuatro series semanales (altas, reseñas, fichas cacheadas y seguimientos) y un
 * resumen de actividad. Una consulta agregada por métrica —una pasada, doce
 * filas de salida— y el relleno de las semanas sin datos se hace en JavaScript
 * con una función pura, que además se puede probar. La alternativa,
 * `generate_series` con subconsultas correlacionadas, serían 48 escaneos para
 * pintar lo mismo.
 *
 * SOBRE LOS ÍNDICES, sin fingir que está todo optimizado:
 *   - `films_cache.fetched_at` tiene índice propio y el filtro por rango lo usa.
 *   - `user.created_at` y `follows.created_at` no lo tienen: recorrido completo
 *     de tablas de cientos de filas, irrelevante.
 *   - `user_films.reviewed_at` tiene índice, pero es `(user_id, reviewed_at)`:
 *     con el usuario delante NO sirve para filtrar por fecha a secas, así que
 *     también es un recorrido completo. Aceptable hoy; si esa tabla llegara al
 *     millón de filas, tocaría añadir un índice solo por `reviewed_at`.
 */
import { sql } from 'drizzle-orm';
import { db } from '../db/client';
import { createMemo } from './memo';

export interface PuntoSemana {
  /** Lunes de la semana, en formato YYYY-MM-DD y en UTC. */
  semana: string;
  n: number;
}

export interface Crecimiento {
  usuarios: PuntoSemana[];
  resenas: PuntoSemana[];
  fichas: PuntoSemana[];
  seguimientos: PuntoSemana[];
}

export interface Actividad {
  d1: number;
  d7: number;
  d30: number;
  nunca: number;
  total: number;
  sesionesVivas: number;
  sesionesUsuarios: number;
}

/** Lunes (UTC) de la semana a la que pertenece una fecha, como YYYY-MM-DD. */
function lunesUTC(d: Date): string {
  const x = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  // getUTCDay: domingo = 0. Para que la semana empiece en lunes, el domingo
  // retrocede 6 días y no 0, que es el error clásico de este cálculo.
  const dia = x.getUTCDay();
  x.setUTCDate(x.getUTCDate() - (dia === 0 ? 6 : dia - 1));
  return x.toISOString().slice(0, 10);
}

/**
 * Devuelve `semanas` puntos consecutivos hasta la semana de `ahora`, poniendo 0
 * donde la consulta no trajo fila. Sin esto, una semana sin altas se comería su
 * hueco y la gráfica mentiría sobre el ritmo.
 *
 * Los lunes se calculan en UTC, igual que hace `date_trunc('week', …)` en el
 * contenedor de Postgres, que corre en UTC. Si algún día se fijara otra zona
 * horaria en la conexión, ambos cálculos se desincronizarían.
 */
export function rellenarSemanas(
  filas: { semana: string; n: number }[],
  semanas = 12,
  ahora = new Date(),
): PuntoSemana[] {
  const porSemana = new Map(filas.map((f) => [f.semana, f.n]));
  const base = new Date(`${lunesUTC(ahora)}T00:00:00.000Z`);

  const salida: PuntoSemana[] = [];
  for (let i = semanas - 1; i >= 0; i--) {
    const d = new Date(base);
    d.setUTCDate(d.getUTCDate() - i * 7);
    const clave = d.toISOString().slice(0, 10);
    salida.push({ semana: clave, n: porSemana.get(clave) ?? 0 });
  }
  return salida;
}

/** Ejecuta una serie semanal; ante un fallo devuelve la serie a cero. */
async function serie(consulta: ReturnType<typeof sql>): Promise<PuntoSemana[]> {
  try {
    const { rows } = await db.execute(consulta);
    return rellenarSemanas(
      (rows as Record<string, unknown>[]).map((r) => ({
        semana: String(r.semana),
        n: Number(r.n ?? 0),
      })),
    );
  } catch (err) {
    console.error('[growth] serie fallida:', err);
    return rellenarSemanas([]);
  }
}

const memoCrecimiento = createMemo<Crecimiento>(5 * 60_000, 1);

export function getCrecimiento(): Promise<Crecimiento> {
  return memoCrecimiento.get('todo', async () => {
    // Las cuatro consultas son el mismo patrón. `"user"` va entrecomillado
    // porque es palabra reservada en SQL.
    const [usuarios, resenas, fichas, seguimientos] = await Promise.all([
      serie(sql`
        select to_char(date_trunc('week', created_at), 'YYYY-MM-DD') as semana,
               count(*)::int                                          as n
          from "user"
         where created_at >= date_trunc('week', now()) - interval '11 weeks'
         group by 1 order by 1
      `),
      serie(sql`
        select to_char(date_trunc('week', reviewed_at), 'YYYY-MM-DD') as semana,
               count(*)::int                                           as n
          from user_films
         where reviewed_at >= date_trunc('week', now()) - interval '11 weeks'
         group by 1 order by 1
      `),
      serie(sql`
        select to_char(date_trunc('week', fetched_at), 'YYYY-MM-DD') as semana,
               count(*)::int                                          as n
          from films_cache
         where fetched_at >= date_trunc('week', now()) - interval '11 weeks'
         group by 1 order by 1
      `),
      serie(sql`
        select to_char(date_trunc('week', created_at), 'YYYY-MM-DD') as semana,
               count(*)::int                                          as n
          from follows
         where created_at >= date_trunc('week', now()) - interval '11 weeks'
         group by 1 order by 1
      `),
    ]);
    return { usuarios, resenas, fichas, seguimientos };
  });
}

const memoActividad = createMemo<Actividad>(60_000, 1);

/**
 * Usuarios vistos en las últimas 24 h / 7 d / 30 d, y sesiones vivas.
 *
 * `last_seen_at` lo mantiene el middleware con un throttle de 10 minutos, así
 * que "activos en 24 h" es fiable con ese margen.
 */
export function getActividad(): Promise<Actividad> {
  return memoActividad.get('todo', async () => {
    const vacio: Actividad = {
      d1: 0,
      d7: 0,
      d30: 0,
      nunca: 0,
      total: 0,
      sesionesVivas: 0,
      sesionesUsuarios: 0,
    };
    try {
      const [u, s] = await Promise.all([
        db.execute(sql`
          select count(*) filter (where last_seen_at >= now() - interval '24 hours')::int as d1,
                 count(*) filter (where last_seen_at >= now() - interval '7 days')::int   as d7,
                 count(*) filter (where last_seen_at >= now() - interval '30 days')::int  as d30,
                 count(*) filter (where last_seen_at is null)::int                        as nunca,
                 count(*)::int                                                            as total
            from "user"
        `),
        db.execute(sql`
          select count(*)::int                as vivas,
                 count(distinct user_id)::int as usuarios
            from session
           where expires_at > now()
        `),
      ]);
      const a = u.rows[0] as Record<string, unknown>;
      const b = s.rows[0] as Record<string, unknown>;
      return {
        d1: Number(a.d1 ?? 0),
        d7: Number(a.d7 ?? 0),
        d30: Number(a.d30 ?? 0),
        nunca: Number(a.nunca ?? 0),
        total: Number(a.total ?? 0),
        sesionesVivas: Number(b.vivas ?? 0),
        sesionesUsuarios: Number(b.usuarios ?? 0),
      };
    } catch (err) {
      console.error('[growth] actividad fallida:', err);
      return vacio;
    }
  });
}
