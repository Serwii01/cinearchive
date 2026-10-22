import type { APIRoute } from 'astro';
import { totalVisitas, contarVisitaEstatica } from '../../lib/visits';
import { check, clientIp, tooMany } from '../../lib/ratelimit';
import { isKnownRoute } from '../../lib/routes';
import { languages } from '../../i18n/ui';

export const prerender = false;

const LANGS = Object.keys(languages);

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
  if (total === null) {
    return new Response(JSON.stringify({ error: 'unavailable' }), {
      status: 503,
      headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
    });
  }
  return new Response(JSON.stringify({ visits: total }), {
    headers: {
      'content-type': 'application/json',
      'cache-control': 'public, max-age=60',
    },
  });
};

/**
 * POST /api/visits — aviso de visita desde una página prerenderizada.
 *
 * Esas páginas no pasan por el middleware, que es donde se cuentan las demás
 * (ver src/lib/visits.ts). El cuerpo es `{ path }`, la ruta que se está
 * viendo (lo manda BaseLayout). Responde siempre 204: el navegador
 * no espera nada y no hay por qué decirle a nadie si contó o no.
 */
export const POST: APIRoute = async ({ request }) => {
  const { ok, retryAfter } = check(`visits:${clientIp(request)}`, 30, 60_000);
  if (!ok) return tooMany(retryAfter);

  const body = (await request.json().catch(() => null)) as { path?: unknown } | null;
  const path = typeof body?.path === 'string' ? body.path.slice(0, 512) : '';
  if (path && isKnownRoute(path, LANGS)) contarVisitaEstatica(request, path);
  return new Response(null, { status: 204 });
};
