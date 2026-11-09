import type { APIRoute } from 'astro';
import { z } from 'zod';
import { normalizeLang } from '../../../i18n/ui';
import { todayNumber, secondsToMidnight } from '../../../lib/games';
import { fotoPuzzle, fotoCheck, fotoAnswer, isFotoMode, fotoModeAvailable, newSeed, SEED_MAX, type Ref } from '../../../lib/gamepool';
import { rateLimit, clientIp } from '../../../lib/ratelimit';

export const prerender = false;

const noDisponible = () => Response.json({ error: 'unavailable' }, { status: 503 });

/**
 * GET — un reto de Fotograma sin la solución.
 * - Diario: el de hoy. Es igual todo el día; el navegador lo guarda una hora
 *   como mucho (y nunca pasada la medianoche de Madrid), para que tras un
 *   despliegue que cambie la bolsa nadie se quede con un reto viejo.
 * - `?endless=1`: uno al azar, con su semilla, sin caché.
 */
export const GET: APIRoute = ({ url, request }) => {
  const mode = url.searchParams.get('mode');
  if (!isFotoMode(mode)) return Response.json({ error: 'mode' }, { status: 400 });
  if (!fotoModeAvailable(mode)) return noDisponible();
  const lang = normalizeLang(url.searchParams.get('lang') ?? undefined);
  if (url.searchParams.get('endless')) {
    if (!rateLimit(`games:foto-new:${clientIp(request)}`, 60, 60_000)) return Response.json({ error: 'rate_limited' }, { status: 429 });
    return Response.json(fotoPuzzle(mode, { seed: newSeed() }, lang), { headers: { 'Cache-Control': 'no-store' } });
  }
  return Response.json(fotoPuzzle(mode, { day: todayNumber() }, lang), {
    headers: { 'Cache-Control': `public, max-age=${Math.min(3600, secondsToMidnight())}` },
  });
};

const schema = z
  .object({
    mode: z.enum(['actual', 'clasicos']),
    day: z.number().int().optional(),
    seed: z.number().int().min(1).max(SEED_MAX).optional(),
    lang: z.string().max(5).optional(),
    guess: z.union([z.number().int().positive(), z.string().min(1).max(120)]).optional(),
    /** Al agotar los intentos: la solución. */
    reveal: z.literal(true).optional(),
  })
  .refine((b) => (b.day === undefined) !== (b.seed === undefined), 'day o seed');

/**
 * POST — comprueba un intento ({ guess }) o da la solución ({ reveal }). En el
 * diario vale el reto de hoy y el de ayer: quien empezó a las 23:58 puede
 * terminarlo. En el ilimitado, cualquier semilla.
 */
export const POST: APIRoute = async ({ request }) => {
  if (!rateLimit(`games:foto:${clientIp(request)}`, 90, 60_000)) return Response.json({ error: 'rate_limited' }, { status: 429 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: 'invalid' }, { status: 400 });
  const { mode, day, seed, guess, reveal } = parsed.data;
  if (!fotoModeAvailable(mode)) return noDisponible();
  let ref: Ref;
  if (day !== undefined) {
    const hoy = todayNumber();
    if (day !== hoy && day !== hoy - 1) return Response.json({ error: 'day' }, { status: 400 });
    ref = { day };
  } else ref = { seed: seed! };
  const lang = normalizeLang(parsed.data.lang);

  if (reveal) return Response.json({ answer: fotoAnswer(mode, ref, lang) });
  if (guess === undefined) return Response.json({ error: 'invalid' }, { status: 400 });
  const correct = fotoCheck(mode, ref, guess);
  return Response.json(correct ? { correct, answer: fotoAnswer(mode, ref, lang) } : { correct });
};
