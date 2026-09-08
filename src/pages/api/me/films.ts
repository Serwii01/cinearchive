import type { APIRoute } from 'astro';
import { z } from 'zod';
import { and, eq } from 'drizzle-orm';
import { db } from '../../../db/client';
import { userFilms } from '../../../db/schema';
import { invalidateRecommendations } from '../../../lib/recs';
import { invalidateStats } from '../../../lib/stats';
import { aplicarReglas, fechaVista } from '../../../lib/filmstate';

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
  // 'favorite' ya no es un estado: es un flag propio (campo `favorite`).
  status: z.enum(['want', 'seen']).optional(),
  favorite: z.boolean().optional(),
  rating: z.number().int().min(1).max(5).nullable().optional(),
  note: z.string().max(2000).nullable().optional(),
  /** Cuándo la vio, en YYYY-MM-DD. Es el usuario quien la fija; no puede ser futura. */
  reviewedAt: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .nullable()
    .optional(),
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
  const { tmdbId, rating, note } = parsed.data;
  // Las tres marcas no son independientes: ver src/lib/filmstate.ts.
  const { status, favorite } = aplicarReglas(parsed.data);

  // La fecha de la reseña la puede fijar el usuario («la vi el 3 de mayo»). Si
  // no manda ninguna, se sella con la de hoy al tocar nota o valoración; los
  // cambios de solo estado no la tocan.
  const now = new Date();
  const touchesReview = rating !== undefined || note !== undefined;

  let reviewedAt: Date | null | undefined;
  if (parsed.data.reviewedAt !== undefined) {
    if (parsed.data.reviewedAt === null) {
      reviewedAt = null;
    } else {
      const d = fechaVista(parsed.data.reviewedAt);
      if (!d) return new Response(JSON.stringify({ error: 'fecha_invalida' }), { status: 400 });
      reviewedAt = d;
    }
  } else if (touchesReview && (rating != null || note != null)) {
    reviewedAt = now;
  }

  await db
    .insert(userFilms)
    .values({
      userId: locals.user.id,
      tmdbId,
      status: status ?? 'want',
      favorite: favorite ?? false,
      rating: rating ?? null,
      note: note ?? null,
      reviewedAt: reviewedAt ?? null,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: [userFilms.userId, userFilms.tmdbId],
      // Solo actualiza los campos enviados (los no enviados se mantienen).
      set: {
        ...(status !== undefined ? { status } : {}),
        ...(favorite !== undefined ? { favorite } : {}),
        ...(rating !== undefined ? { rating } : {}),
        ...(note !== undefined ? { note } : {}),
        ...(reviewedAt !== undefined ? { reviewedAt } : {}),
        updatedAt: now,
      },
    });

  invalidateRecommendations(locals.user.id);
  invalidateStats(locals.user.id);
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
  invalidateRecommendations(locals.user.id);
  invalidateStats(locals.user.id);
  return Response.json({ ok: true });
};
