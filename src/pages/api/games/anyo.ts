import type { APIRoute } from 'astro';
import { z } from 'zod';
import { normalizeLang } from '../../../i18n/ui';
import { todayNumber, secondsToMidnight, yearPoints, ANYO_SIZE, ANYO_MIN, ANYO_MAX } from '../../../lib/games';
import { anyoFilms, anyoCard, newSeed, SEED_MAX, type Ref } from '../../../lib/gamepool';
import { rateLimit, clientIp } from '../../../lib/ratelimit';

export const prerender = false;

/**
 * GET — las cinco películas de «¿En qué año?», sin el año. Diario (una hora de
 * caché como mucho) o `?endless=1`, cinco al azar con su semilla.
 */
export const GET: APIRoute = ({ url, request }) => {
  const lang = normalizeLang(url.searchParams.get('lang') ?? undefined);
  if (url.searchParams.get('endless')) {
    if (!rateLimit(`games:anyo-new:${clientIp(request)}`, 60, 60_000)) return Response.json({ error: 'rate_limited' }, { status: 429 });
    const seed = newSeed();
    return Response.json({ seed, cards: anyoFilms({ seed }).map((f, i) => anyoCard(f, lang, i)) }, { headers: { 'Cache-Control': 'no-store' } });
  }
  const day = todayNumber();
  return Response.json(
    { day, cards: anyoFilms({ day }).map((f, i) => anyoCard(f, lang, i)) },
    { headers: { 'Cache-Control': `public, max-age=${Math.min(3600, secondsToMidnight())}` } },
  );
};

const schema = z
  .object({
    day: z.number().int().optional(),
    seed: z.number().int().min(1).max(SEED_MAX).optional(),
    /** Qué película (0..4) y qué año dice el jugador. */
    key: z.number().int().min(0).max(ANYO_SIZE - 1),
    year: z.number().int().min(ANYO_MIN).max(ANYO_MAX),
  })
  .refine((b) => (b.day === undefined) !== (b.seed === undefined), 'day o seed');

/**
 * POST — el año de una película y los puntos que da lo que se ha dicho. Una a
 * una, para que el jugador vea cuánto se ha desviado antes de la siguiente.
 */
export const POST: APIRoute = async ({ request }) => {
  if (!rateLimit(`games:anyo:${clientIp(request)}`, 90, 60_000)) return Response.json({ error: 'rate_limited' }, { status: 429 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: 'invalid' }, { status: 400 });
  const { day, seed, key, year } = parsed.data;
  let ref: Ref;
  if (day !== undefined) {
    const hoy = todayNumber();
    if (day !== hoy && day !== hoy - 1) return Response.json({ error: 'day' }, { status: 400 });
    ref = { day };
  } else ref = { seed: seed! };
  const real = anyoFilms(ref)[key].year;
  return Response.json({ year: real, points: yearPoints(year, real) });
};
