import type { APIRoute } from 'astro';
import { z } from 'zod';
import { and, eq, inArray, sql } from 'drizzle-orm';
import { db } from '../../../../db/client';
import { userFilms, userViewings } from '../../../../db/schema';
import { mergeFilm } from '../../../../lib/letterboxd';
import { invalidateViewer } from '../../../../lib/viewings';
import { check, tooMany } from '../../../../lib/ratelimit';
import { getFilmsBrief } from '../../../../lib/films';

export const prerender = false;

/**
 * POST — guarda una tanda de películas ya emparejadas. Las reglas de qué se
 * escribe están en mergeFilm (src/lib/letterboxd.ts): lo que ya hay aquí gana.
 */
const rating = z.number().min(0.5).max(5).multipleOf(0.5).nullable();
const day = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const schema = z.object({
  likesAsFavorites: z.boolean(),
  // De dónde viene, para la columna source de los visionados.
  source: z.enum(['letterboxd', 'imdb', 'trakt']).default('letterboxd'),
  films: z
    .array(
      z.object({
        tmdbId: z.number().int().positive(),
        watched: z.boolean(),
        watchlist: z.boolean(),
        liked: z.boolean(),
        rating,
        // Se recorta a 2.000 al guardar; esto es solo el tope de lo que se acepta.
        review: z.string().max(50_000).nullable(),
        viewings: z.array(z.object({ date: day, rating, rewatch: z.boolean() })).max(500),
      }),
    )
    .min(1)
    .max(200),
});

export const POST: APIRoute = async ({ locals, request }) => {
  if (!locals.user) return new Response(JSON.stringify({ error: 'unauthorized' }), { status: 401 });
  const userId = locals.user.id;
  const rl = check(`lb-commit:${userId}`, 60, 60_000);
  if (!rl.ok) return tooMany(rl.retryAfter);
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return new Response(JSON.stringify({ error: 'invalid' }), { status: 400 });
  const { films, likesAsFavorites, source } = parsed.data;

  const prevRows = await db
    .select()
    .from(userFilms)
    .where(and(eq(userFilms.userId, userId), inArray(userFilms.tmdbId, films.map((f) => f.tmdbId))));
  const prev = new Map(prevRows.map((r) => [r.tmdbId, r]));

  let written = 0;
  let clipped = 0;
  let viewings = 0;
  const now = new Date();
  await db.transaction(async (tx) => {
    for (const f of films) {
      const patch = mergeFilm(prev.get(f.tmdbId) ?? null, f, { likesAsFavorites });
      if (patch) {
        const { clipped: c, ...values } = patch;
        await tx
          .insert(userFilms)
          .values({ userId, tmdbId: f.tmdbId, ...values, updatedAt: now })
          .onConflictDoUpdate({ target: [userFilms.userId, userFilms.tmdbId], set: { ...values, updatedAt: now } });
        written++;
        if (c) clipped++;
      }
      if (f.viewings.length) {
        const ins = await tx
          .insert(userViewings)
          .values(f.viewings.map((v) => ({ userId, tmdbId: f.tmdbId, watchedOn: v.date, rewatch: v.rewatch, rating: v.rating, source })))
          .onConflictDoNothing()
          .returning({ id: userViewings.id });
        viewings += ins.length;
      }
    }
    // Revisionado = Letterboxd lo dice o hay un visionado anterior aquí. Se
    // recalcula al final porque una tanda puede traer visionados más antiguos
    // que los que ya había.
    await tx.execute(sql`
      UPDATE ${userViewings} v SET rewatch = true
      WHERE v.user_id = ${userId} AND v.rewatch = false AND EXISTS (
        SELECT 1 FROM ${userViewings} w
        WHERE w.user_id = v.user_id AND w.tmdb_id = v.tmdb_id AND w.watched_on < v.watched_on
      )`);
  });

  invalidateViewer(userId);
  // Se calientan en segundo plano los datos de estas películas: si no, la
  // primera visita al diario tras importar esperaría a TMDB por cientos de
  // ellas. No se espera a que acabe.
  void getFilmsBrief(films.map((f) => f.tmdbId), 'es').catch(() => {});
  return Response.json({ ok: true, films: written, viewings, clipped });
};
