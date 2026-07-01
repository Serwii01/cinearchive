import type { APIRoute } from 'astro';
import { z } from 'zod';
import { and, eq } from 'drizzle-orm';
import { db } from '../../../db/client';
import { follows } from '../../../db/schema';

export const prerender = false;

const unauthorized = () => new Response(JSON.stringify({ error: 'unauthorized' }), { status: 401 });
const bad = (error: string) => new Response(JSON.stringify({ error }), { status: 400 });

const schema = z.object({
  requesterId: z.string().trim().min(1),
  action: z.enum(['accept', 'reject']),
});

/** POST — aceptar o rechazar una solicitud de seguimiento recibida. */
export const POST: APIRoute = async ({ locals, request }) => {
  if (!locals.user) return unauthorized();
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return bad('invalid');

  const where = and(
    eq(follows.followerId, parsed.data.requesterId),
    eq(follows.followingId, locals.user.id),
    eq(follows.status, 'pending'),
  );

  if (parsed.data.action === 'accept') {
    await db.update(follows).set({ status: 'accepted' }).where(where);
  } else {
    await db.delete(follows).where(where);
  }
  return Response.json({ ok: true });
};
