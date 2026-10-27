import type { APIRoute } from 'astro';
import { searchSite } from '../../../lib/sitesearch';
import { check, clientIp, tooMany } from '../../../lib/ratelimit';
import { normalizeLang } from '../../../i18n/ui';

export const prerender = false;

/**
 * Búsqueda en el contenido propio del archivo (artículos, hemeroteca,
 * glosario…). No sale de la máquina: el índice está en memoria.
 */
export const GET: APIRoute = async ({ request, url }) => {
  const limit = check(`site-search:${clientIp(request)}`, 60, 60_000);
  if (!limit.ok) return tooMany(limit.retryAfter);
  const q = (url.searchParams.get('q') ?? '').trim().slice(0, 100);
  const lang = normalizeLang(url.searchParams.get('lang') ?? 'es');
  return Response.json({ results: q.length >= 2 ? searchSite(q, lang) : [] });
};
