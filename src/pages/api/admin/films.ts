import type { APIRoute } from 'astro';
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { db } from '../../../db/client';
import { extraFilms } from '../../../db/schema';
import { getFilm } from '../../../lib/films';
import { director } from '../../../lib/tmdb';
import { isAdmin } from '../../../lib/admin';

export const prerender = false;

function forbidden() {
  return new Response(JSON.stringify({ error: 'forbidden' }), { status: 403 });
}

const addSchema = z.object({ tmdbId: z.number().int().positive() });

/** POST — añade una película al catálogo por su id de TMDB (rellena los campos solos). */
export const POST: APIRoute = async ({ locals, request }) => {
  if (!isAdmin(locals.user)) return forbidden();
  const parsed = addSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return new Response(JSON.stringify({ error: 'invalid' }), { status: 400 });
  const { tmdbId } = parsed.data;

  let tmdb;
  try {
    ({ tmdb } = await getFilm(tmdbId, 'es'));
  } catch {
    return new Response(JSON.stringify({ error: 'tmdb_not_found' }), { status: 404 });
  }

  const row = {
    tmdbId,
    title: tmdb.title,
    originalTitle: tmdb.original_title ?? '',
    director: director(tmdb),
    year: tmdb.release_date ? Number(tmdb.release_date.slice(0, 4)) : null,
    country: tmdb.production_countries?.[0]?.name ?? null,
    runtimeMin: tmdb.runtime ?? null,
    language: (tmdb as { original_language?: string }).original_language ?? null,
    addedBy: locals.user!.email,
    addedAt: new Date(),
  };

  await db
    .insert(extraFilms)
    .values(row)
    .onConflictDoUpdate({ target: extraFilms.tmdbId, set: row });

  return Response.json({ ok: true, film: { tmdbId, title: row.title, year: row.year } });
};

const delSchema = z.object({ tmdbId: z.number().int().positive() });

/** DELETE — quita una película añadida del catálogo. */
export const DELETE: APIRoute = async ({ locals, request }) => {
  if (!isAdmin(locals.user)) return forbidden();
  const parsed = delSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return new Response(JSON.stringify({ error: 'invalid' }), { status: 400 });
  await db.delete(extraFilms).where(eq(extraFilms.tmdbId, parsed.data.tmdbId));
  return Response.json({ ok: true });
};
