import type { APIRoute } from 'astro';
import { z } from 'zod';
import { createThread, validateThread, BODY_MAX, TITLE_MAX, FORUM_CATEGORIES } from '../../../lib/forum';
import { rateLimit } from '../../../lib/ratelimit';
import { escritor, json } from './_comun';

export const prerender = false;

const schema = z.object({
  category: z.enum(FORUM_CATEGORIES),
  title: z.string().max(TITLE_MAX + 20),
  body: z.string().max(BODY_MAX + 200),
  tmdbId: z.number().int().positive().nullable().optional(),
});

/** POST — abre un hilo. Cinco por hora y persona: frena el spam sin molestar a nadie de verdad. */
export const POST: APIRoute = async ({ locals, request }) => {
  const w = await escritor(locals);
  if (w instanceof Response) return w;
  if (!rateLimit(`forum:thread:${w.userId}`, 5, 60 * 60_000)) return json(429, { error: 'rate_limited' });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return json(400, { error: 'invalid' });
  const motivo = validateThread(parsed.data);
  if (motivo) return json(400, { error: motivo });
  const id = await createThread(w.userId, parsed.data);
  return json(200, { id });
};
