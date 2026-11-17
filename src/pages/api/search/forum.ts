import type { APIRoute } from 'astro';
import { searchForum } from '../../../lib/forum';
import { threadPath } from '../../../lib/forumpaths';
import { check, clientIp, tooMany } from '../../../lib/ratelimit';
import { localizePath, normalizeLang } from '../../../i18n/ui';

export const prerender = false;

/** GET ?q=&lang= — conversaciones del foro para el buscador del sitio. */
export const GET: APIRoute = async ({ request, url }) => {
  const limit = check(`forum-search:${clientIp(request)}`, 60, 60_000);
  if (!limit.ok) return tooMany(limit.retryAfter);
  const q = (url.searchParams.get('q') ?? '').trim().slice(0, 100);
  const lang = normalizeLang(url.searchParams.get('lang') ?? 'es');
  if (q.length < 2) return Response.json({ results: [] });
  const hilos = await searchForum(q).catch(() => []);
  return Response.json({
    results: hilos.map((h) => ({
      title: h.title,
      href: localizePath(lang, threadPath(h.id, h.title)),
      category: h.category,
      replies: h.replies,
      score: h.score,
      snippet: h.snippet,
    })),
  });
};
