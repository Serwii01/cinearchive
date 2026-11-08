import type { APIRoute } from 'astro';
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { db } from '../../../db/client';
import { profile } from '../../../db/schema';
import { toggleReviewLike, toggleListLike } from '../../../lib/filmsocial';
import { getMyProfile } from '../../../lib/social';
import { rateLimit, clientIp } from '../../../lib/ratelimit';

export const prerender = false;

const schema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('review'), username: z.string().min(1).max(40), tmdbId: z.number().int().positive() }),
  z.object({ kind: z.literal('list'), listId: z.string().min(1).max(64) }),
]);

/**
 * POST — pone o quita un «me gusta» en una reseña o una lista pública.
 * Devuelve { liked, likes }. Solo con sesión, nunca en lo propio y solo en lo
 * que el visor puede ver (ver lib/filmsocial.ts).
 */
export const POST: APIRoute = async ({ locals, request }) => {
  if (!locals.user) return new Response(JSON.stringify({ error: 'unauthorized' }), { status: 401 });
  if (!rateLimit(`likes:${locals.user.id}`, 60, 60_000) || !rateLimit(`likes-ip:${clientIp(request)}`, 120, 60_000)) {
    return new Response(JSON.stringify({ error: 'rate_limited' }), { status: 429 });
  }
  // Sin perfil no se participa en la red social (igual que para seguir).
  if (!(await getMyProfile(locals.user.id))) return new Response(JSON.stringify({ error: 'need_profile' }), { status: 400 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return new Response(JSON.stringify({ error: 'invalid' }), { status: 400 });
  const d = parsed.data;

  let res: { liked: boolean; likes: number } | null = null;
  if (d.kind === 'review') {
    const [autor] = await db.select({ id: profile.userId }).from(profile).where(eq(profile.username, d.username.toLowerCase())).limit(1);
    if (autor) res = await toggleReviewLike(locals.user.id, autor.id, d.tmdbId);
  } else {
    res = await toggleListLike(locals.user.id, d.listId);
  }
  if (!res) return new Response(JSON.stringify({ error: 'not_found' }), { status: 404 });
  return Response.json(res);
};
