import type { APIRoute } from 'astro';
import { getFilm } from '../../../lib/films';
import { director, posterUrl } from '../../../lib/tmdb';
import { rateLimit, clientIp } from '../../../lib/ratelimit';

export const prerender = false;

export const GET: APIRoute = async ({ request, params, url }) => {
  if (!rateLimit(`film:${clientIp(request)}`, 60, 60_000)) {
    return new Response(JSON.stringify({ error: 'rate_limited' }), { status: 429 });
  }

  const tmdbId = Number(params.id);
  if (!Number.isInteger(tmdbId) || tmdbId <= 0) {
    return new Response(JSON.stringify({ error: 'bad_id' }), { status: 400 });
  }
  const lang = url.searchParams.get('lang') === 'en' ? 'en' : 'es';

  try {
    const { tmdb, omdb } = await getFilm(tmdbId, lang);
    return Response.json({
      tmdbId: tmdb.id,
      title: tmdb.title,
      originalTitle: tmdb.original_title,
      overview: tmdb.overview,
      year: tmdb.release_date ? Number(tmdb.release_date.slice(0, 4)) : null,
      runtime: tmdb.runtime,
      director: director(tmdb),
      genres: tmdb.genres,
      countries: tmdb.production_countries.map((c) => c.name),
      poster: posterUrl(tmdb.poster_path, 'w342'),
      backdrop: tmdb.backdrop_path,
      voteAverage: tmdb.vote_average,
      ratings: omdb?.Ratings ?? [],
      imdbRating: omdb?.imdbRating ?? null,
      metascore: omdb?.Metascore ?? null,
    });
  } catch {
    return new Response(JSON.stringify({ error: 'not_found' }), { status: 404 });
  }
};
