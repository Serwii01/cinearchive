import type { APIRoute } from 'astro';
import { searchMovies, posterUrl } from '../../../lib/tmdb';
import { rateLimit, clientIp } from '../../../lib/ratelimit';

export const prerender = false;

export const GET: APIRoute = async ({ request, url }) => {
  if (!rateLimit(`search:${clientIp(request)}`, 30, 60_000)) {
    return new Response(JSON.stringify({ error: 'rate_limited' }), { status: 429 });
  }

  const q = url.searchParams.get('q')?.trim() ?? '';
  const lang = url.searchParams.get('lang') === 'en' ? 'en' : 'es';
  if (q.length < 2) {
    return Response.json({ results: [] });
  }

  try {
    const results = await searchMovies(q, lang);
    const slim = results.map((r) => ({
      tmdbId: r.id,
      title: r.title,
      originalTitle: r.original_title,
      year: r.release_date ? Number(r.release_date.slice(0, 4)) : null,
      poster: posterUrl(r.poster_path, 'w185'),
      overview: r.overview,
    }));
    return Response.json({ results: slim });
  } catch (err) {
    // No filtrar detalles internos (ni la clave) al cliente.
    return new Response(JSON.stringify({ error: 'tmdb_unavailable' }), { status: 502 });
  }
};
