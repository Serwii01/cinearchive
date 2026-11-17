import type { APIRoute } from 'astro';
import { searchCites } from '../../../lib/forumcites';
import { isCiteKind } from '../../../lib/forumbody';
import { rateLimit } from '../../../lib/ratelimit';
import { normalizeLang } from '../../../i18n/ui';
import { json } from './_comun';

export const prerender = false;

/**
 * GET ?q=&lang=&kind= — lo que se puede citar en un mensaje del foro. Solo con
 * sesión: es para quien escribe, y cada búsqueda puede ir a TMDB.
 */
export const GET: APIRoute = async ({ locals, url }) => {
  if (!locals.user) return json(401, { error: 'unauthorized' });
  if (!rateLimit(`forum:cite:${locals.user.id}`, 40, 60_000)) return json(429, { error: 'rate_limited' });
  const q = (url.searchParams.get('q') ?? '').trim().slice(0, 100);
  const kind = url.searchParams.get('kind');
  const lang = normalizeLang(url.searchParams.get('lang') ?? 'es');
  if (q.length < 2) return json(200, { results: [] });
  return json(200, { results: await searchCites(q, lang, isCiteKind(kind) ? kind : undefined) });
};
