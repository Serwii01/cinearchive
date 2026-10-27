import type { APIRoute } from 'astro';
import { exportUserData } from '../../../lib/account';
import { check, tooMany } from '../../../lib/ratelimit';

export const prerender = false;

/**
 * GET — descarga en JSON todo lo que Cine Archive guarda de ti: cuenta,
 * perfil, preferencias, lista, valoraciones y notas, listas, seguimientos y
 * etiquetas. Es el «solicitar su portabilidad» de la política de privacidad,
 * sin tener que escribir a nadie.
 */
export const GET: APIRoute = async ({ locals }) => {
  if (!locals.user) return new Response(JSON.stringify({ error: 'unauthorized' }), { status: 401 });
  const rl = check(`export:${locals.user.id}`, 5, 60_000);
  if (!rl.ok) return tooMany(rl.retryAfter);

  const data = await exportUserData(locals.user.id);
  const fecha = new Date().toISOString().slice(0, 10);
  return new Response(JSON.stringify(data, null, 2), {
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'content-disposition': `attachment; filename="cine-archive-${fecha}.json"`,
      'cache-control': 'no-store',
    },
  });
};
