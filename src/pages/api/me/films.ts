import type { APIRoute } from 'astro';
import { z } from 'zod';
import { and, eq } from 'drizzle-orm';
import { db } from '../../../db/client';
import { userFilms, reviewLikes, userViewings } from '../../../db/schema';
import { invalidateRecommendations } from '../../../lib/recs';
import { invalidateStats } from '../../../lib/stats';
import { aplicarReglas, fechaVista, hoyEnEspana } from '../../../lib/filmstate';
import { ensureFirstViewing, moveOnlyViewing, rateLatestViewing } from '../../../lib/viewings';

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
  // De ½ en ½ estrella, de 0,5 a 5 (ver src/lib/stars.ts).
  rating: z.number().min(0.5).max(5).multipleOf(0.5).nullable().optional(),
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
  } else if (touchesReview && (rating != null || String(note ?? '').trim())) {
    // Solo con algo que fechar: una nota vacía no es una reseña de hoy.
    reviewedAt = now;
  }

  // Nada que guardar (p. ej. «Guardar» con la nota vacía en una película sin
  // tocar): solo se actualiza si ya estaba. Antes se creaba la fila con el
  // estado por defecto y la película aparecía en «Pendientes» sin pedirlo.
  const nadaQueGuardar =
    status === undefined && favorite === undefined && rating == null && !String(note ?? '').trim() && reviewedAt === undefined;
  if (nadaQueGuardar) {
    if (note !== undefined || rating !== undefined) {
      await db
        .update(userFilms)
        .set({ ...(note !== undefined ? { note } : {}), ...(rating !== undefined ? { rating } : {}), updatedAt: now })
        .where(and(eq(userFilms.userId, locals.user.id), eq(userFilms.tmdbId, tmdbId)));
      // Sin texto ya no es una reseña: sus «me gusta» se van con ella.
      if (note !== undefined) await db.delete(reviewLikes).where(and(eq(reviewLikes.authorId, locals.user.id), eq(reviewLikes.tmdbId, tmdbId)));
      if (rating !== undefined) await rateLatestViewing(locals.user.id, tmdbId, null);
    }
    invalidateRecommendations(locals.user.id);
    invalidateStats(locals.user.id);
    return Response.json({ ok: true });
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

  // UNA SOLA REGLA (16-11-2026): si la película queda como vista —por marcarla,
  // puntuarla, reseñarla o hacerla favorita—, tiene un visionado con fecha, y
  // con él sale en el diario, en «Últimos visionados» del perfil y en el
  // resumen del año. La fecha es la de «Cuándo la viste» si se manda, y si no,
  // hoy (en España); cambiarla después mueve ese visionado (moveOnlyViewing).
  // Antes, marcar como vista sin puntuar no lo apuntaba, y la película se
  // quedaba fuera del diario. Si ya tiene algún visionado no se añade otro:
  // volver a verla es «Vista otra vez».
  // ensureFirstViewing mira el estado que ha quedado guardado: con «pendiente», nada.
  await ensureFirstViewing(locals.user.id, tmdbId, typeof parsed.data.reviewedAt === 'string' ? parsed.data.reviewedAt : hoyEnEspana(now));
  // La nota también va al visionado (el último): es la que enseña el diario.
  if (rating !== undefined) await rateLatestViewing(locals.user.id, tmdbId, rating);
  // Con fecha de «Cuándo la viste» (desde la ficha o desde el editor de la
  // reseña): si hay un único visionado apuntado aquí, se mueve a ese día, para
  // que el diario y la reseña digan lo mismo. Con varios no se toca ninguno.
  if (typeof parsed.data.reviewedAt === 'string') await moveOnlyViewing(locals.user.id, tmdbId, parsed.data.reviewedAt);

  // Sin texto ya no es una reseña: sus «me gusta» se van con ella, para que no
  // reaparezcan si algún día escribe otra.
  if (note !== undefined && !String(note ?? '').trim()) {
    await db.delete(reviewLikes).where(and(eq(reviewLikes.authorId, locals.user.id), eq(reviewLikes.tmdbId, tmdbId)));
  }

  invalidateRecommendations(locals.user.id);
  invalidateStats(locals.user.id);
  return Response.json({ ok: true });
};

const deleteSchema = z.object({ tmdbId: z.number().int().positive() });

/**
 * DELETE — quitar la película de tu colección: estado, nota, reseña y también
 * sus visionados (y con ellos, del diario). Si sigue en el diario después de
 * «quitarla», la regla «vista = en el diario» dejaría de cumplirse al revés.
 */
export const DELETE: APIRoute = async ({ locals, request }) => {
  if (!locals.user) return unauthorized();
  const parsed = deleteSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return new Response(JSON.stringify({ error: 'invalid' }), { status: 400 });
  }
  await db
    .delete(userFilms)
    .where(and(eq(userFilms.userId, locals.user.id), eq(userFilms.tmdbId, parsed.data.tmdbId)));
  await db.delete(reviewLikes).where(and(eq(reviewLikes.authorId, locals.user.id), eq(reviewLikes.tmdbId, parsed.data.tmdbId)));
  await db.delete(userViewings).where(and(eq(userViewings.userId, locals.user.id), eq(userViewings.tmdbId, parsed.data.tmdbId)));
  invalidateRecommendations(locals.user.id);
  invalidateStats(locals.user.id);
  return Response.json({ ok: true });
};
