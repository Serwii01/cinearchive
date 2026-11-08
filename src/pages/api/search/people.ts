import type { APIRoute } from 'astro';
import { searchPeople, profileUrl, profileSrcset } from '../../../lib/tmdb';
import { check, clientIp, tooMany } from '../../../lib/ratelimit';
import { latinNames } from '../../../lib/personnames';
import { normalizeLang } from '../../../i18n/ui';

export const prerender = false;

/**
 * GET /api/search/people?q=&lang= — directores, actores y equipo para la
 * pestaña «Personas» del buscador. Pública, como la de películas, con límite
 * por IP: cada búsqueda es una llamada a TMDB.
 *
 * La de /api/people/search es otra cosa: sirve para elegir directores
 * favoritos en la cuenta, pone la dirección delante y pide sesión.
 */
export const GET: APIRoute = async ({ request, url }) => {
  const limit = check(`people-search:${clientIp(request)}`, 30, 60_000);
  if (!limit.ok) return tooMany(limit.retryAfter);
  const q = (url.searchParams.get('q') ?? '').trim().slice(0, 100);
  const lang = normalizeLang(url.searchParams.get('lang') ?? 'es');
  if (q.length < 2) return Response.json({ results: [] });

  try {
    const hits = await searchPeople(q, lang, 12, false);
    // Solo los nombres latinos ya conocidos: se busca al teclear y no puede
    // esperar a Wikidata. Los demás salen bien la próxima vez.
    const latin = await latinNames(hits, 0);
    return Response.json({
      results: hits.map((p) => ({
        id: p.id,
        name: latin.get(p.id) ?? p.name,
        department: p.known_for_department,
        knownFor: p.known_for,
        photo: profileUrl(p.profile_path, 'w185'),
        // Con srcset: a 185 px se veían blandas en pantallas de alta resolución.
        photoSrcset: profileSrcset(p.profile_path),
      })),
    });
  } catch {
    return new Response(JSON.stringify({ error: 'tmdb_unavailable' }), { status: 502 });
  }
};
