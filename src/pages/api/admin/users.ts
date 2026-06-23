import type { APIRoute } from 'astro';
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { db } from '../../../db/client';
import { user } from '../../../db/schema';
import { isAdmin } from '../../../lib/admin';

export const prerender = false;

function forbidden() {
  return new Response(JSON.stringify({ error: 'forbidden' }), { status: 403 });
}

const delSchema = z.object({ userId: z.string().min(1) });

/** DELETE — elimina un usuario y, en cascada, todos sus datos (lista, sesiones, etc.). */
export const DELETE: APIRoute = async ({ locals, request }) => {
  if (!isAdmin(locals.user)) return forbidden();
  const parsed = delSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return new Response(JSON.stringify({ error: 'invalid' }), { status: 400 });

  // Salvaguarda: el admin no puede eliminarse a sí mismo desde el panel.
  if (parsed.data.userId === locals.user!.id) {
    return new Response(JSON.stringify({ error: 'cannot_delete_self' }), { status: 400 });
  }

  await db.delete(user).where(eq(user.id, parsed.data.userId));
  return Response.json({ ok: true });
};
