import type { APIRoute } from 'astro';
import { z } from 'zod';
import { normalizeLang } from '../../../i18n/ui';
import { todayNumber, secondsToMidnight } from '../../../lib/games';
import { repartoPuzzle, repartoCheck, repartoSameSaga, repartoAnswer, freshRepartoSeed, SEED_MAX, SEEN_MAX, type Ref } from '../../../lib/gamepool';
import { rateLimit, clientIp } from '../../../lib/ratelimit';

export const prerender = false;

/**
 * GET — un reto de Reparto: los seis nombres, del sexto del reparto al
 * protagonista, sin el título. Como en Fotograma, el navegador los va
 * descubriendo con los fallos. Diario (una hora de caché como mucho) o
 * `?endless=1` con `&seen=` para no repetir película.
 */
export const GET: APIRoute = ({ url, request }) => {
  if (url.searchParams.get('endless')) {
    if (!rateLimit(`games:reparto-new:${clientIp(request)}`, 60, 60_000)) return Response.json({ error: 'rate_limited' }, { status: 429 });
    const seen = (url.searchParams.get('seen') ?? '')
      .split(',')
      .slice(-SEEN_MAX)
      .map(Number)
      .filter((s) => Number.isInteger(s) && s >= 1 && s <= SEED_MAX);
    return Response.json(repartoPuzzle({ seed: freshRepartoSeed(seen) }), { headers: { 'Cache-Control': 'no-store' } });
  }
  return Response.json(repartoPuzzle({ day: todayNumber() }), {
    headers: { 'Cache-Control': `public, max-age=${Math.min(3600, secondsToMidnight())}` },
  });
};

const schema = z
  .object({
    day: z.number().int().optional(),
    seed: z.number().int().min(1).max(SEED_MAX).optional(),
    lang: z.string().max(5).optional(),
    guess: z.number().int().positive().optional(),
    reveal: z.literal(true).optional(),
  })
  .refine((b) => (b.day === undefined) !== (b.seed === undefined), 'day o seed');

/** POST — comprueba un intento ({ guess }) o da la solución ({ reveal }); el diario vale hoy y ayer. */
export const POST: APIRoute = async ({ request }) => {
  if (!rateLimit(`games:reparto:${clientIp(request)}`, 90, 60_000)) return Response.json({ error: 'rate_limited' }, { status: 429 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: 'invalid' }, { status: 400 });
  const { day, seed, guess, reveal } = parsed.data;
  let ref: Ref;
  if (day !== undefined) {
    const hoy = todayNumber();
    if (day !== hoy && day !== hoy - 1) return Response.json({ error: 'day' }, { status: 400 });
    ref = { day };
  } else ref = { seed: seed! };
  const lang = normalizeLang(parsed.data.lang);

  if (reveal) return Response.json({ answer: repartoAnswer(ref, lang) });
  if (guess === undefined) return Response.json({ error: 'invalid' }, { status: 400 });
  if (repartoCheck(ref, guess)) return Response.json({ correct: true, answer: repartoAnswer(ref, lang) });
  return Response.json({ correct: false, ...(repartoSameSaga(ref, guess) ? { saga: true } : {}) });
};
