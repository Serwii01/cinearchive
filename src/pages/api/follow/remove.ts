import type { APIRoute } from 'astro';
import { z } from 'zod';
import { and, eq } from 'drizzle-orm';
import { db } from '../../../db/client';
import { follows } from '../../../db/schema';
import { check, tooMany } from '../../../lib/ratelimit';

export const prerender = false;

const unauthorized = () => new Response(JSON.stringify({ error: 'unauthorized' }), { status: 401 });
const bad = (error: string) => new Response(JSON.stringify({ error }), { status: 400 });

const schema = z.object({ followerId: z.string().trim().min(1) });

/** POST — eliminar a un seguidor (borra la relación en la que otro me sigue a mí). */
export const POST: APIRoute = async ({ locals, request }) => {
  if (!locals.user) return unauthorized();
  const rl = check(`follow:${locals.user.id}`, 30, 60_000);
  if (!rl.ok) return tooMany(rl.retryAfter);
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return bad('invalid');

  await db
    .delete(follows)
    .where(and(eq(follows.followerId, parsed.data.followerId), eq(follows.followingId, locals.user.id)));
  return Response.json({ ok: true });
};
