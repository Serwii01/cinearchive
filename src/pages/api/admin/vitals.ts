import type { APIRoute } from 'astro';
import { isAdmin } from '../../../lib/admin';
import { readVitals } from '../../../lib/vitals';
import { getDbStats } from '../../../lib/dbstats';
import { getActividad } from '../../../lib/growth';
import { listCaches } from '../../../lib/caches';
import { probeAll } from '../../../lib/probes';

export const prerender = false;

const forbidden = () =>
  new Response(JSON.stringify({ error: 'forbidden' }), { status: 403 });

/**
 * GET /api/admin/vitals — todo lo que el panel refresca en vivo.
 *
 * El middleware ya bloquea /api/admin/*, pero el guard se repite aquí como en
 * el resto de endpoints de administración: dos cerraduras en la misma puerta.
 *
 * Coste por llamada: la lectura de /proc no toca disco de verdad (procfs es
 * memoria), las estadísticas de Postgres van con memo de 20 s, la actividad de
 * 60 s y las sondas externas de 5 a 30 min. Es decir, refrescar cada pocos
 * segundos NO machaca ni la base de datos ni a terceros: casi siempre se sirve
 * de memoria.
 *
 * `probes=0` permite pedir el resto sin las sondas.
 */
export const GET: APIRoute = async ({ locals, url }) => {
  if (!isAdmin(locals.user)) return forbidden();

  const conSondas = url.searchParams.get('probes') !== '0';

  const [vitals, db, actividad, sondas] = await Promise.all([
    readVitals(),
    getDbStats(),
    getActividad(),
    conSondas ? probeAll() : Promise.resolve([]),
  ]);

  return new Response(
    JSON.stringify({ en: Date.now(), vitals, db, actividad, caches: listCaches(), sondas }),
    {
      headers: {
        'content-type': 'application/json',
        // Una foto de recursos cacheada no sirve para nada.
        'cache-control': 'no-store',
      },
    },
  );
};
