import type { APIRoute } from 'astro';
import { isAdmin } from '../../../lib/admin';
import { runStreamAlerts } from '../../../lib/streamjob';

export const prerender = false;

/**
 * POST — lanza ya una vuelta de los avisos de «ya está en tu plataforma», sin
 * esperar al temporizador. Para comprobar que funciona tras desplegar (y en
 * local, donde el temporizador no arranca).
 */
export const POST: APIRoute = async ({ locals }) => {
  if (!isAdmin(locals.user)) return new Response(JSON.stringify({ error: 'forbidden' }), { status: 403 });
  return Response.json({ ok: true, ...(await runStreamAlerts()) });
};
