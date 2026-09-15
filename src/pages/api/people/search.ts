import type { APIRoute } from 'astro';
import { searchPeople, profileUrl } from '../../../lib/tmdb';
import { rateLimit, clientIp } from '../../../lib/ratelimit';

export const prerender = false;

/**
 * GET /api/people/search?q= — buscador de personas para elegir directores
 * favoritos. Solo con sesión: es una llamada a TMDB por tecleo y no tiene
 * sentido abrirla a cualquiera.
 */
export const GET: APIRoute = async ({ locals, request, url }) => {
  if (!locals.user) return new Response(JSON.stringify({ error: 'unauthorized' }), { status: 401 });
  if (!rateLimit(`people:${clientIp(request)}`, 30, 60_000)) {
    return new Response(JSON.stringify({ error: 'rate_limited' }), { status: 429 });
  }
  const q = url.searchParams.get('q')?.trim() ?? '';
  const lang = url.searchParams.get('lang') === 'en' ? 'en' : 'es';
  if (q.length < 2) return Response.json({ results: [] });

  try {
    const results = (await searchPeople(q, lang)).map((p) => ({
      id: p.id,
      name: p.name,
      department: p.known_for_department,
      knownFor: p.known_for,
      photo: profileUrl(p.profile_path, 'w185'),
    }));
    return Response.json({ results });
  } catch {
    return new Response(JSON.stringify({ error: 'tmdb_unavailable' }), { status: 502 });
  }
};
