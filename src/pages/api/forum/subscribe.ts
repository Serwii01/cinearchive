import type { APIRoute } from 'astro';
import { z } from 'zod';
import { toggleSubscription } from '../../../lib/forumactivity';
import { escritor, json } from './_comun';

export const prerender = false;

const schema = z.object({ threadId: z.number().int().positive() });

/** POST — sigue o deja de seguir un hilo. Devuelve si queda siguiéndolo. */
export const POST: APIRoute = async ({ locals, request }) => {
  const w = await escritor(locals);
  if (w instanceof Response) return w;
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return json(400, { error: 'invalid' });
  try {
    return json(200, { following: await toggleSubscription(w.userId, parsed.data.threadId) });
  } catch {
    // Hilo que no existe: la clave ajena no deja apuntarse.
    return json(404, { error: 'not_found' });
  }
};
