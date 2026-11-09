import type { APIRoute } from 'astro';
import { z } from 'zod';
import { normalizeLang } from '../../../i18n/ui';
import { pickChallenger } from '../../../lib/games';
import { RATED, poolFilm, ratingCard, notaToken, notaVerify } from '../../../lib/gamepool';
import { rateLimit, clientIp } from '../../../lib/ratelimit';

export const prerender = false;

const noCache = { 'Cache-Control': 'no-store' };

/** GET — la primera pareja de una partida nueva, sin notas, con su vale de racha 0. */
export const GET: APIRoute = ({ url }) => {
  const lang = normalizeLang(url.searchParams.get('lang') ?? undefined);
  const a = RATED[Math.floor(Math.random() * RATED.length)];
  const b = pickChallenger(RATED, a, new Set());
  return Response.json({ a: ratingCard(a, lang), b: ratingCard(b, lang), token: notaToken(a.id, b.id, 0) }, { headers: noCache });
};

const schema = z.object({
  a: z.number().int().positive(),
  b: z.number().int().positive(),
  pick: z.number().int().positive(),
  lang: z.string().max(5).optional(),
  /** Las que ya han salido en la partida, para no repetirlas. */
  used: z.array(z.number().int().positive()).max(500).optional(),
  /**
   * Vale firmado de la pareja (lib/gamepool.ts, notaToken): de ahí sale la
   * racha. Opcional solo para no romper la partida de quien tenga abierta la
   * página de antes del cambio: sin vale, la racha cuenta desde 0.
   */
  token: z.string().max(200).optional(),
});

/**
 * POST — comprueba la elección y, si acierta, trae el siguiente rival para la
 * ganadora con un vale nuevo (racha + 1). Devuelve las dos notas para enseñarlas.
 */
export const POST: APIRoute = async ({ request }) => {
  if (!rateLimit(`games:nota:${clientIp(request)}`, 90, 60_000)) return Response.json({ error: 'rate_limited' }, { status: 429 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: 'invalid' }, { status: 400 });
  const { a, b, pick, used, token } = parsed.data;
  const fa = poolFilm(a);
  const fb = poolFilm(b);
  if (!fa || !fb || (pick !== a && pick !== b)) return Response.json({ error: 'invalid' }, { status: 400 });
  const streak = token === undefined ? 0 : notaVerify(token, a, b);
  // Vale falso, de otra pareja o caducado: la partida no sigue.
  if (streak === null) return Response.json({ error: 'token' }, { status: 400 });
  const lang = normalizeLang(parsed.data.lang);
  const mejor = fa.rating >= fb.rating ? fa : fb;
  const correct = pick === mejor.id;
  const next = correct ? pickChallenger(RATED, mejor, new Set([...(used ?? []), a, b]), Math.random, streak + 1) : null;
  return Response.json(
    {
      correct,
      ratings: { [a]: fa.rating, [b]: fb.rating },
      streak: correct ? streak + 1 : streak,
      next: next ? ratingCard(next, lang) : null,
      ...(next ? { token: notaToken(mejor.id, next.id, streak + 1) } : {}),
    },
    { headers: noCache },
  );
};
