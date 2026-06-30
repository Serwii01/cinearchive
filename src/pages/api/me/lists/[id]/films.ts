import type { APIRoute } from 'astro';
import { z } from 'zod';
import { and, eq } from 'drizzle-orm';
import { db } from '../../../../../db/client';
import { userLists, userListFilms } from '../../../../../db/schema';

export const prerender = false;

const unauthorized = () => new Response(JSON.stringify({ error: 'unauthorized' }), { status: 401 });
const notFound = () => new Response(JSON.stringify({ error: 'not_found' }), { status: 404 });

async function ownsList(userId: string, id: string): Promise<boolean> {
  const [list] = await db
    .select({ id: userLists.id })
    .from(userLists)
    .where(and(eq(userLists.id, id), eq(userLists.userId, userId)))
    .limit(1);
  return !!list;
}

const filmSchema = z.object({ tmdbId: z.number().int().positive() });

/** POST — añadir una película a la lista. */
export const POST: APIRoute = async ({ locals, request, params }) => {
  if (!locals.user) return unauthorized();
  const id = params.id!;
  if (!(await ownsList(locals.user.id, id))) return notFound();
  const parsed = filmSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return new Response(JSON.stringify({ error: 'invalid' }), { status: 400 });
  await db
    .insert(userListFilms)
    .values({ listId: id, tmdbId: parsed.data.tmdbId })
    .onConflictDoNothing();
  return Response.json({ ok: true });
};

/** DELETE — quitar una película de la lista. */
export const DELETE: APIRoute = async ({ locals, request, params }) => {
  if (!locals.user) return unauthorized();
  const id = params.id!;
  if (!(await ownsList(locals.user.id, id))) return notFound();
  const parsed = filmSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return new Response(JSON.stringify({ error: 'invalid' }), { status: 400 });
  await db
    .delete(userListFilms)
    .where(and(eq(userListFilms.listId, id), eq(userListFilms.tmdbId, parsed.data.tmdbId)));
  return Response.json({ ok: true });
};
