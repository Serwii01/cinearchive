import type { APIRoute } from 'astro';
import { z } from 'zod';
import { and, eq } from 'drizzle-orm';
import { db } from '../../../db/client';
import { userFilms } from '../../../db/schema';

export const prerender = false;

function unauthorized() {
  return new Response(JSON.stringify({ error: 'unauthorized' }), { status: 401 });
}

/** GET — lista de películas guardadas por el usuario. */
export const GET: APIRoute = async ({ locals }) => {
  if (!locals.user) return unauthorized();
  const rows = await db.select().from(userFilms).where(eq(userFilms.userId, locals.user.id));
  return Response.json({ films: rows });
};

const upsertSchema = z.object({
  tmdbId: z.number().int().positive(),
  status: z.enum(['want', 'seen', 'favorite']).optional(),
  rating: z.number().int().min(1).max(5).nullable().optional(),
  note: z.string().max(2000).nullable().optional(),
});

/** POST — añadir o actualizar (status / rating / note). */
export const POST: APIRoute = async ({ locals, request }) => {
  if (!locals.user) return unauthorized();
  const parsed = upsertSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return new Response(JSON.stringify({ error: 'invalid', issues: parsed.error.issues }), {
      status: 400,
    });
  }
  const { tmdbId, status, rating, note } = parsed.data;

  await db
    .insert(userFilms)
    .values({
      userId: locals.user.id,
      tmdbId,
      status: status ?? 'want',
      rating: rating ?? null,
      note: note ?? null,
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: [userFilms.userId, userFilms.tmdbId],
      // Solo actualiza los campos enviados (los no enviados se mantienen).
      set: {
        ...(status !== undefined ? { status } : {}),
        ...(rating !== undefined ? { rating } : {}),
        ...(note !== undefined ? { note } : {}),
        updatedAt: new Date(),
      },
    });

  return Response.json({ ok: true });
};

const deleteSchema = z.object({ tmdbId: z.number().int().positive() });

/** DELETE — quitar una película de la lista. */
export const DELETE: APIRoute = async ({ locals, request }) => {
  if (!locals.user) return unauthorized();
  const parsed = deleteSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return new Response(JSON.stringify({ error: 'invalid' }), { status: 400 });
  }
  await db
    .delete(userFilms)
    .where(and(eq(userFilms.userId, locals.user.id), eq(userFilms.tmdbId, parsed.data.tmdbId)));
  return Response.json({ ok: true });
};
