import type { APIRoute } from 'astro';
import { sql } from 'drizzle-orm';
import { db } from '../../db/client';
import { disco } from '../../lib/disk';

export const prerender = false;

/**
 * Sonda de salud del contenedor de la app. Comprueba lo único que puede caerse
 * por su cuenta sin que el proceso muera: la conexión a PostgreSQL.
 *
 * Devuelve 200 solo si la BD responde; 503 en caso contrario, para que Docker (o
 * cualquier supervisor) pueda reiniciar o dejar de enviar tráfico. No expone
 * detalles del error: un fallo de conexión no debe filtrar host, usuario ni
 * versión al exterior; eso queda en los logs del contenedor.
 *
 * También dice si queda poco disco (`disk`: ok, low o unknown), sin cifras. No
 * cambia el código de respuesta: Docker reiniciaría la app por algo que un
 * reinicio no arregla. Lo vigila .github/workflows/vigilancia.yml.
 */
export const GET: APIRoute = async () => {
  const started = Date.now();
  let dbUp = false;
  try {
    await db.execute(sql`select 1`);
    dbUp = true;
  } catch (err) {
    console.error('[health] la base de datos no responde:', err);
  }

  const disk = await disco();

  return new Response(
    JSON.stringify({ status: dbUp ? 'ok' : 'degraded', db: dbUp, disk, ms: Date.now() - started }),
    {
      status: dbUp ? 200 : 503,
      headers: {
        'content-type': 'application/json',
        // Una sonda cacheada no sirve para nada.
        'cache-control': 'no-store',
      },
    },
  );
};
