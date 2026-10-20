import type { APIRoute } from 'astro';
import { totalVisitas } from '../../lib/visits';

export const prerender = false;

/**
 * GET /api/visits — total de visitas del sitio.
 *
 * Lo pide la página de información, que es estática: el número se pinta en el
 * cliente para que no se quede congelado en el valor del último despliegue.
 * Solo devuelve una cifra; no hay nada que proteger, pero sí conviene que no se
 * cachee mucho rato.
 */
export const GET: APIRoute = async () => {
  const total = await totalVisitas();
  return new Response(JSON.stringify({ visits: total }), {
    headers: {
      'content-type': 'application/json',
      'cache-control': 'public, max-age=60',
    },
  });
};
