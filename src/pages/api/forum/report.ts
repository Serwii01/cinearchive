import type { APIRoute } from 'astro';
import { z } from 'zod';
import { reportContent, REPORT_REASONS, REPORT_NOTE_MAX } from '../../../lib/forummod';
import { rateLimit } from '../../../lib/ratelimit';
import { escritor, json } from './_comun';

export const prerender = false;

const schema = z.object({
  kind: z.enum(['thread', 'post']),
  id: z.number().int().positive(),
  reason: z.enum(REPORT_REASONS),
  note: z.string().max(REPORT_NOTE_MAX + 50).nullable().optional(),
});

/** POST — denuncia un hilo o una respuesta. Veinte al día por persona. */
export const POST: APIRoute = async ({ locals, request }) => {
  const w = await escritor(locals);
  if (w instanceof Response) return w;
  if (!rateLimit(`forum:report:${w.userId}`, 20, 24 * 60 * 60_000)) return json(429, { error: 'rate_limited' });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return json(400, { error: 'invalid' });
  const d = parsed.data;
  const r = await reportContent(w.userId, d.kind, d.id, d.reason, d.note ?? null);
  if (r === 'not_found') return json(404, { error: 'not_found' });
  if (r === 'own') return json(400, { error: 'own' });
  // Repetida: para quien denuncia es lo mismo, ya está anotada.
  return json(200, { ok: true });
};
