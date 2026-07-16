import type { APIRoute } from 'astro';
import { check, clientIp, tooMany } from '../../lib/ratelimit';
import { suggestPlaces } from '../../lib/cinemas';

export const prerender = false;

/**
 * Autocompletado de lugares para "Encuentra tu cine": recibe `?q=` y devuelve
 * hasta 5 sugerencias (ciudad/CP en España, vía OpenStreetMap/Nominatim). Proxy
 * con rate-limit; los errores externos nunca se propagan como 500 (lista vacía).
 */
export const GET: APIRoute = async ({ request, url }) => {
  const limit = check(`places:${clientIp(request)}`, 30, 60_000);
  if (!limit.ok) return tooMany(limit.retryAfter);

  const q = url.searchParams.get('q')?.trim() ?? '';
  if (q.length < 2) return Response.json({ suggestions: [] });

  const suggestions = await suggestPlaces(q);
  return Response.json({ suggestions });
};
