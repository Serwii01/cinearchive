import type { APIRoute } from 'astro';
import { z } from 'zod';
import { resolveReports, unbanUser } from '../../../lib/forummod';
import { admin, json } from './_comun';

export const prerender = false;

const schema = z.discriminatedUnion('action', [
  z.object({ action: z.enum(['dismiss', 'hide', 'ban']), kind: z.enum(['thread', 'post']), id: z.number().int().positive() }),
  z.object({ action: z.literal('unban'), userId: z.string().min(1).max(100) }),
]);

/** POST — decide sobre las denuncias de un mensaje, o levanta un bloqueo. Solo administradores. */
export const POST: APIRoute = async ({ locals, request }) => {
  const a = admin(locals);
  if (a instanceof Response) return a;
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return json(400, { error: 'invalid' });
  const d = parsed.data;
  const ok = d.action === 'unban' ? await unbanUser(d.userId) : await resolveReports(d.kind, d.id, d.action, a.userId);
  return ok ? json(200, { ok: true }) : json(404, { error: 'not_found' });
};
