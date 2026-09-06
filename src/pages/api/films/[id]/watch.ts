import type { APIRoute } from 'astro';
import { eq } from 'drizzle-orm';
import { db } from '../../../../db/client';
import { filmsCache } from '../../../../db/schema';
import { getFilm } from '../../../../lib/films';
import type { WatchAvailability } from '../../../../lib/tmdb';
import { isWatchRegion } from '../../../../data/countries';
import { rateLimit, clientIp, tooMany } from '../../../../lib/ratelimit';

export const prerender = false;

/**
 * GET /api/films/:id/watch?region=XX — plataformas donde ver la película.
 *
 * Ya no llama a ninguna API externa: el "dónde ver" de TODAS las regiones que
 * ofrecemos viaja dentro de la ficha de TMDB y queda guardado en films_cache, así
 * que cambiar de región es una lectura de base de datos. Antes cada cambio de
 * región costaba 2 peticiones de la cuota de Watchmode (1000/mes).
 */
export const GET: APIRoute = async ({ params, url, request }) => {
  if (!rateLimit(`watch:${clientIp(request)}`, 30, 60_000)) return tooMany(20);

  const tmdbId = Number(params.id);
  const region = (url.searchParams.get('region') || 'ES').toUpperCase();
  if (!Number.isInteger(tmdbId) || tmdbId <= 0 || !isWatchRegion(region)) {
    return new Response(JSON.stringify({ error: 'invalid' }), { status: 400 });
  }

  const [cached] = await db
    .select({ providers: filmsCache.providers })
    .from(filmsCache)
    .where(eq(filmsCache.tmdbId, tmdbId))
    .limit(1);

  let byRegion = (cached?.providers ?? null) as Record<string, WatchAvailability> | null;

  // Película que nunca se ha abierto (o cacheada antes de este cambio): se carga
  // la ficha, que de paso deja los proveedores guardados para la próxima vez.
  if (!byRegion) {
    try {
      byRegion = (await getFilm(tmdbId, 'es')).providers;
    } catch {
      return Response.json({ watch: null });
    }
  }

  // Región sin plataformas: no se guarda entrada, y aquí se responde vacía.
  const watch: WatchAvailability = byRegion[region] ?? { region, link: null, providers: [] };
  return Response.json({ watch });
};
