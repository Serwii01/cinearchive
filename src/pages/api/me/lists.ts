import type { APIRoute } from 'astro';
import { z } from 'zod';
import { and, count, eq, inArray } from 'drizzle-orm';
import { db } from '../../../db/client';
import { userLists, userListFilms } from '../../../db/schema';

export const prerender = false;

const unauthorized = () => new Response(JSON.stringify({ error: 'unauthorized' }), { status: 401 });
const MAX_LISTS = 50;

/** GET — listas del usuario (con nº de películas). Con ?tmdbId, marca cuáles la contienen. */
export const GET: APIRoute = async ({ locals, url }) => {
  if (!locals.user) return unauthorized();
  const lists = await db
    .select()
    .from(userLists)
    .where(eq(userLists.userId, locals.user.id))
    .orderBy(userLists.createdAt);

  const ids = lists.map((l) => l.id);
  const countMap = new Map<string, number>();
  const contains = new Set<string>();
  if (ids.length) {
    const counts = await db
      .select({ listId: userListFilms.listId, c: count() })
      .from(userListFilms)
      .where(inArray(userListFilms.listId, ids))
      .groupBy(userListFilms.listId);
    for (const r of counts) countMap.set(r.listId, Number(r.c));

    const tmdbId = Number(url.searchParams.get('tmdbId')) || 0;
    if (tmdbId > 0) {
      const rows = await db
        .select({ listId: userListFilms.listId })
        .from(userListFilms)
        .where(and(inArray(userListFilms.listId, ids), eq(userListFilms.tmdbId, tmdbId)));
      for (const r of rows) contains.add(r.listId);
    }
  }

  return Response.json({
    lists: lists.map((l) => ({
      id: l.id,
      name: l.name,
      count: countMap.get(l.id) ?? 0,
      contains: contains.has(l.id),
    })),
  });
};

const createSchema = z.object({ name: z.string().trim().min(1).max(80) });

/** POST — crear una lista. */
export const POST: APIRoute = async ({ locals, request }) => {
  if (!locals.user) return unauthorized();
  const parsed = createSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return new Response(JSON.stringify({ error: 'invalid' }), { status: 400 });

  const [{ c }] = await db
    .select({ c: count() })
    .from(userLists)
    .where(eq(userLists.userId, locals.user.id));
  if (Number(c) >= MAX_LISTS) return new Response(JSON.stringify({ error: 'limit' }), { status: 400 });

  const id = crypto.randomUUID();
  await db.insert(userLists).values({ id, userId: locals.user.id, name: parsed.data.name });
  return Response.json({ id, name: parsed.data.name, count: 0, contains: false });
};
