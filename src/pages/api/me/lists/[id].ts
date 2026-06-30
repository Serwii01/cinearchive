import type { APIRoute } from 'astro';
import { z } from 'zod';
import { and, eq } from 'drizzle-orm';
import { db } from '../../../../db/client';
import { userLists } from '../../../../db/schema';

export const prerender = false;

const unauthorized = () => new Response(JSON.stringify({ error: 'unauthorized' }), { status: 401 });
const notFound = () => new Response(JSON.stringify({ error: 'not_found' }), { status: 404 });

/** Comprueba que la lista existe y es del usuario. */
async function ownedList(userId: string, id: string) {
  const [list] = await db
    .select()
    .from(userLists)
    .where(and(eq(userLists.id, id), eq(userLists.userId, userId)))
    .limit(1);
  return list ?? null;
}

const renameSchema = z.object({ name: z.string().trim().min(1).max(80) });

/** PATCH — renombrar la lista. */
export const PATCH: APIRoute = async ({ locals, request, params }) => {
  if (!locals.user) return unauthorized();
  const id = params.id!;
  if (!(await ownedList(locals.user.id, id))) return notFound();
  const parsed = renameSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return new Response(JSON.stringify({ error: 'invalid' }), { status: 400 });
  await db.update(userLists).set({ name: parsed.data.name }).where(eq(userLists.id, id));
  return Response.json({ ok: true });
};

/** DELETE — borrar la lista (y sus películas en cascada). */
export const DELETE: APIRoute = async ({ locals, params }) => {
  if (!locals.user) return unauthorized();
  const id = params.id!;
  if (!(await ownedList(locals.user.id, id))) return notFound();
  await db.delete(userLists).where(eq(userLists.id, id));
  return Response.json({ ok: true });
};
