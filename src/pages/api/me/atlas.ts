import type { APIRoute } from 'astro';
import { and, eq, ne, sql } from 'drizzle-orm';
import { db } from '../../../db/client';
import { filmsCache, userFilms } from '../../../db/schema';
import { countryCounts } from '../../../lib/atlasmath';

export const prerender = false;

/**
 * GET — «tu mapa» del atlas: cuántas películas vistas hay de cada país de
 * producción. Los países salen de la ficha de TMDB ya cacheada (toda película
 * que se marca o se importa pasa por la caché), así que no llama a TMDB.
 */
export const GET: APIRoute = async ({ locals }) => {
  if (!locals.user) return new Response(JSON.stringify({ error: 'unauthorized' }), { status: 401 });
  const rows = await db
    .select({ countries: sql<{ iso_3166_1: string }[] | null>`${filmsCache.tmdb}->'production_countries'` })
    .from(userFilms)
    .innerJoin(filmsCache, eq(filmsCache.tmdbId, userFilms.tmdbId))
    // Todo lo que no es «pendiente» está visto ('favorite' es un estado histórico).
    .where(and(eq(userFilms.userId, locals.user.id), ne(userFilms.status, 'want')));
  const countries = countryCounts(rows.map((r) => (Array.isArray(r.countries) ? r.countries : [])));
  return Response.json({ films: rows.length, countries }, { headers: { 'cache-control': 'private, no-store' } });
};
