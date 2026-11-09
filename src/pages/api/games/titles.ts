import type { APIRoute } from 'astro';
import { normalizeLang } from '../../../i18n/ui';
import { titleIndex, isFotoMode } from '../../../lib/gamepool';

export const prerender = false;

/**
 * GET — los títulos entre los que se adivina en Fotograma, para que el buscador
 * del juego sugiera al momento sin preguntar a TMDB en cada letra. Son unos
 * 60 kB comprimidos y no cambian hasta que se regenera la bolsa.
 */
export const GET: APIRoute = ({ url }) => {
  const mode = url.searchParams.get('mode');
  if (!isFotoMode(mode)) return Response.json({ error: 'mode' }, { status: 400 });
  const lang = normalizeLang(url.searchParams.get('lang') ?? undefined);
  const rows = titleIndex(mode, lang).map((t) => [t.id, t.title, t.original === t.title ? '' : (t.original ?? ''), t.year]);
  return Response.json(rows, { headers: { 'Cache-Control': 'public, max-age=86400' } });
};
