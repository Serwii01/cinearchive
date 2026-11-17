import type { APIRoute } from 'astro';
import { threadsCiting } from '../../../lib/forum';
import { isCiteKind, type CiteKind } from '../../../lib/forumbody';
import { threadPath } from '../../../lib/forumpaths';
import { check, clientIp, tooMany } from '../../../lib/ratelimit';
import { localizePath, normalizeLang } from '../../../i18n/ui';

export const prerender = false;

/**
 * GET ?refs=cinema:abc,film:123&lang= — conversaciones del foro que citan
 * algo. Para las páginas que se generan en el build (Cine abierto), que no
 * pueden preguntar a la base de datos al pintarse.
 */
export const GET: APIRoute = async ({ request, url }) => {
  const limit = check(`forum-about:${clientIp(request)}`, 60, 60_000);
  if (!limit.ok) return tooMany(limit.retryAfter);
  const lang = normalizeLang(url.searchParams.get('lang') ?? 'es');
  const refs = (url.searchParams.get('refs') ?? '')
    .split(',')
    .slice(0, 4)
    .map((r) => r.split(':'))
    .filter(([k, id]) => isCiteKind(k) && /^[A-Za-z0-9._-]{1,120}$/.test(id ?? ''))
    .map(([k, id]) => ({ kind: k as CiteKind, ref: id }));
  const hilos = await threadsCiting(refs).catch(() => []);
  return Response.json(
    {
      results: hilos.map((h) => ({
        title: h.title,
        href: localizePath(lang, threadPath(h.id, h.title)),
        replies: h.replies,
        score: h.score,
        username: h.author.username,
      })),
    },
    // Un minuto: una película popular no tiene que ir a la base en cada visita.
    { headers: { 'cache-control': 'public, max-age=60' } },
  );
};
