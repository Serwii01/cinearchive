import type { APIRoute } from 'astro';
import { z } from 'zod';
import { toggleVote } from '../../../lib/forum';
import { rateLimit } from '../../../lib/ratelimit';
import { escritor, json } from './_comun';

export const prerender = false;

const schema = z.object({ kind: z.enum(['thread', 'post']), id: z.number().int().positive() });

/**
 * POST — pone o quita un voto a favor en un hilo o una respuesta. Sesenta por
 * minuto y persona: de sobra para leer un hilo votando, poco para un script.
 */
export const POST: APIRoute = async ({ locals, request }) => {
  const w = await escritor(locals);
  if (w instanceof Response) return w;
  if (!rateLimit(`forum:vote:${w.userId}`, 60, 60_000)) return json(429, { error: 'rate_limited' });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return json(400, { error: 'invalid' });
  const r = await toggleVote(w.userId, parsed.data.kind, parsed.data.id);
  if (r === 'not_found') return json(404, { error: 'not_found' });
  if (r === 'own') return json(400, { error: 'own' });
  return json(200, r);
};
