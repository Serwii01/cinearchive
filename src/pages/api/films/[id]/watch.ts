import type { APIRoute } from 'astro';
import { and, eq } from 'drizzle-orm';
import { db } from '../../../../db/client';
import { watchCache } from '../../../../db/schema';
import { getWatchSources, type WatchAvailability } from '../../../../lib/watchmode';
import { isWatchRegion } from '../../../../data/countries';
import { rateLimit, clientIp, tooMany } from '../../../../lib/ratelimit';

export const prerender = false;

const TTL_MS = 14 * 24 * 60 * 60 * 1000; // 14 días (cuota Watchmode baja)

/** GET /api/films/:id/watch?region=XX — plataformas donde ver, cacheadas por región. */
export const GET: APIRoute = async ({ params, url, request }) => {
  if (!rateLimit(`watch:${clientIp(request)}`, 30, 60_000)) return tooMany(20);

  const tmdbId = Number(params.id);
  const region = (url.searchParams.get('region') || 'ES').toUpperCase();
  if (!Number.isInteger(tmdbId) || tmdbId <= 0 || !isWatchRegion(region)) {
    return new Response(JSON.stringify({ error: 'invalid' }), { status: 400 });
  }

  // 1) Cache persistente por (película, región).
  const [cached] = await db
    .select()
    .from(watchCache)
    .where(and(eq(watchCache.tmdbId, tmdbId), eq(watchCache.region, region)))
    .limit(1);
  if (cached && Date.now() - new Date(cached.fetchedAt).getTime() < TTL_MS) {
    return Response.json({ watchmode: cached.data as WatchAvailability | null });
  }

  // 2) Refrescar desde Watchmode y guardar (también si viene vacío, para no reconsultar).
  const fresh = await getWatchSources(tmdbId, region);
  if (fresh === null && !cached) {
    // Sin clave o error puntual: no cachear para poder reintentar más tarde.
    return Response.json({ watchmode: null });
  }
  const data = fresh ?? (cached?.data as WatchAvailability | null) ?? null;
  await db
    .insert(watchCache)
    .values({ tmdbId, region, data, fetchedAt: new Date() })
    .onConflictDoUpdate({
      target: [watchCache.tmdbId, watchCache.region],
      set: { data, fetchedAt: new Date() },
    });

  return Response.json({ watchmode: data });
};
