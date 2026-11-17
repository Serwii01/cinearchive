import type { APIRoute } from 'astro';
import { z } from 'zod';
import { replyToThread, cleanText, BODY_MAX } from '../../../../../lib/forum';
import { rateLimit } from '../../../../../lib/ratelimit';
import { escritor, json } from '../../_comun';

export const prerender = false;

const schema = z.object({
  body: z.string().max(BODY_MAX + 200),
  /** La respuesta a la que se contesta; sin ella, al hilo. */
  parentId: z.number().int().positive().nullable().optional(),
});

/** POST — responde a un hilo o a una de sus respuestas. Una cada diez segundos por persona. */
export const POST: APIRoute = async ({ locals, params, request }) => {
  const w = await escritor(locals);
  if (w instanceof Response) return w;
  if (!rateLimit(`forum:post:${w.userId}`, 1, 10_000)) return json(429, { error: 'rate_limited' });
  const id = Number(params.id);
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!Number.isInteger(id) || id <= 0 || !parsed.success) return json(400, { error: 'invalid' });
  const body = cleanText(parsed.data.body);
  if (!body || body.length > BODY_MAX) return json(400, { error: 'body' });
  const r = await replyToThread(w.userId, id, body, parsed.data.parentId ?? null);
  if (r === 'not_found') return json(404, { error: 'not_found' });
  if (r === 'bad_parent') return json(400, { error: 'bad_parent' });
  return json(200, { id: r });
};
