import type { APIRoute } from 'astro';
import { z } from 'zod';
import { normalizeLang } from '../../../i18n/ui';
import { pickChallenger } from '../../../lib/games';
import { RATED, poolFilm, ratingCard } from '../../../lib/gamepool';
import { rateLimit, clientIp } from '../../../lib/ratelimit';

export const prerender = false;

const noCache = { 'Cache-Control': 'no-store' };

/** GET — la primera pareja de una partida nueva, sin notas. */
export const GET: APIRoute = ({ url }) => {
  const lang = normalizeLang(url.searchParams.get('lang') ?? undefined);
  const a = RATED[Math.floor(Math.random() * RATED.length)];
  const b = pickChallenger(RATED, a, new Set());
  return Response.json({ a: ratingCard(a, lang), b: ratingCard(b, lang) }, { headers: noCache });
};

const schema = z.object({
  a: z.number().int().positive(),
  b: z.number().int().positive(),
  pick: z.number().int().positive(),
  lang: z.string().max(5).optional(),
  /** Las que ya han salido en la partida, para no repetirlas. */
  used: z.array(z.number().int().positive()).max(500).optional(),
});

/**
 * POST — comprueba la elección y, si acierta, trae el siguiente rival para la
 * ganadora. Devuelve las dos notas para enseñarlas.
 */
export const POST: APIRoute = async ({ request }) => {
  if (!rateLimit(`games:nota:${clientIp(request)}`, 90, 60_000)) return Response.json({ error: 'rate_limited' }, { status: 429 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: 'invalid' }, { status: 400 });
  const { a, b, pick, used } = parsed.data;
  const fa = poolFilm(a);
  const fb = poolFilm(b);
  if (!fa || !fb || (pick !== a && pick !== b)) return Response.json({ error: 'invalid' }, { status: 400 });
  const lang = normalizeLang(parsed.data.lang);
  const mejor = fa.rating >= fb.rating ? fa : fb;
  const correct = pick === mejor.id;
  const next = correct ? pickChallenger(RATED, mejor, new Set([...(used ?? []), a, b])) : null;
  return Response.json(
    { correct, ratings: { [a]: fa.rating, [b]: fb.rating }, next: next ? ratingCard(next, lang) : null },
    { headers: noCache },
  );
};
