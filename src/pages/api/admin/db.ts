import type { APIRoute } from 'astro';
import { z } from 'zod';
import { isAdmin } from '../../../lib/admin';
import { compactarCache, contarHuerfanas, purgarHuerfanas } from '../../../lib/dbmaint';

export const prerender = false;

const forbidden = () => new Response(JSON.stringify({ error: 'forbidden' }), { status: 403 });

const schema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('compact') }),
  // dryRun: solo cuenta, para enseñar «se borrarían N» antes de confirmar.
  z.object({ action: z.literal('purge'), days: z.number().int().min(30).max(3650), dryRun: z.boolean().optional() }),
]);

/**
 * POST /api/admin/db — mantenimiento de films_cache (ver src/lib/dbmaint.ts).
 *
 * Las dos operaciones reescriben la tabla y acaban en VACUUM FULL, que la
 * bloquea unos segundos: por eso son un botón que pulsa el administrador y no
 * una tarea que salte sola en mitad de una visita.
 */
export const POST: APIRoute = async ({ locals, request }) => {
  if (!isAdmin(locals.user)) return forbidden();
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return new Response(JSON.stringify({ error: 'invalid' }), { status: 400 });

  const p = parsed.data;
  try {
    if (p.action === 'compact') return Response.json({ ok: true, ...(await compactarCache()) });
    if (p.dryRun) return Response.json({ ok: true, ...(await contarHuerfanas(p.days)) });
    return Response.json({ ok: true, ...(await purgarHuerfanas(p.days)) });
  } catch (e) {
    console.error('[admin/db]', e);
    return new Response(JSON.stringify({ error: 'failed' }), { status: 500 });
  }
};
