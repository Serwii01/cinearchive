import type { APIRoute } from 'astro';
import { z } from 'zod';
import { and, eq } from 'drizzle-orm';
import { db } from '../../db/client';
import { follows } from '../../db/schema';
import { getProfileByUsername, getMyProfile } from '../../lib/social';
import { check, tooMany } from '../../lib/ratelimit';

export const prerender = false;

const unauthorized = () => new Response(JSON.stringify({ error: 'unauthorized' }), { status: 401 });
const bad = (error: string) => new Response(JSON.stringify({ error }), { status: 400 });

const schema = z.object({ username: z.string().trim().min(1) });

/** Límite antiabuso por usuario para acciones de seguir/dejar de seguir. */
function limited(userId: string): Response | null {
  const rl = check(`follow:${userId}`, 30, 60_000);
  return rl.ok ? null : tooMany(rl.retryAfter);
}

/** POST — seguir a un usuario (público: aceptado; privado: solicitud pendiente). */
export const POST: APIRoute = async ({ locals, request }) => {
  if (!locals.user) return unauthorized();
  const capped = limited(locals.user.id);
  if (capped) return capped;
  // Para seguir hay que tener perfil (username): así la red social es coherente.
  if (!(await getMyProfile(locals.user.id))) return bad('need_profile');
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return bad('invalid');

  const target = await getProfileByUsername(parsed.data.username);
  if (!target) return new Response(JSON.stringify({ error: 'not_found' }), { status: 404 });
  if (target.userId === locals.user.id) return bad('self');

  const status = target.isPrivate ? 'pending' : 'accepted';
  await db
    .insert(follows)
    .values({ followerId: locals.user.id, followingId: target.userId, status })
    .onConflictDoNothing();

  // Estado real (por si ya existía una relación previa).
  const [row] = await db
    .select({ status: follows.status })
    .from(follows)
    .where(and(eq(follows.followerId, locals.user.id), eq(follows.followingId, target.userId)))
    .limit(1);
  return Response.json({ status: row?.status ?? status });
};

/** DELETE — dejar de seguir o cancelar la solicitud. */
export const DELETE: APIRoute = async ({ locals, request }) => {
  if (!locals.user) return unauthorized();
  const capped = limited(locals.user.id);
  if (capped) return capped;
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return bad('invalid');

  const target = await getProfileByUsername(parsed.data.username);
  if (!target) return new Response(JSON.stringify({ error: 'not_found' }), { status: 404 });

  await db
    .delete(follows)
    .where(and(eq(follows.followerId, locals.user.id), eq(follows.followingId, target.userId)));
  return Response.json({ status: 'none' });
};
