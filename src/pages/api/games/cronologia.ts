import type { APIRoute } from 'astro';
import { z } from 'zod';
import { normalizeLang } from '../../../i18n/ui';
import { todayNumber, secondsToMidnight, checkOrder, CHRONO_SIZE } from '../../../lib/games';
import { chronoFilms, chronoCard, newSeed, SEED_MAX, type Ref } from '../../../lib/gamepool';
import { rateLimit, clientIp } from '../../../lib/ratelimit';

export const prerender = false;

/**
 * GET — las cinco películas, desordenadas y sin año. Diario: las de hoy (una
 * hora de caché como mucho, como en Fotograma). `?endless=1`: cinco al azar.
 */
export const GET: APIRoute = ({ url, request }) => {
  const lang = normalizeLang(url.searchParams.get('lang') ?? undefined);
  if (url.searchParams.get('endless')) {
    if (!rateLimit(`games:crono-new:${clientIp(request)}`, 60, 60_000)) return Response.json({ error: 'rate_limited' }, { status: 429 });
    const seed = newSeed();
    return Response.json({ seed, cards: chronoFilms({ seed }).map((f, i) => chronoCard(f, lang, i)) }, { headers: { 'Cache-Control': 'no-store' } });
  }
  const day = todayNumber();
  return Response.json(
    { day, cards: chronoFilms({ day }).map((f, i) => chronoCard(f, lang, i)) },
    { headers: { 'Cache-Control': `public, max-age=${Math.min(3600, secondsToMidnight())}` } },
  );
};

const schema = z
  .object({
    day: z.number().int().optional(),
    seed: z.number().int().min(1).max(SEED_MAX).optional(),
    /** Claves de las tarjetas (0..4) en el orden propuesto, de la más antigua a la más reciente. */
    order: z.array(z.number().int().min(0).max(CHRONO_SIZE - 1)).length(CHRONO_SIZE),
    /** Último intento: devuelve los años aunque falle. */
    final: z.boolean().optional(),
  })
  .refine((b) => (b.day === undefined) !== (b.seed === undefined), 'day o seed');

/** POST — qué posiciones están bien; los años, solo al acertar o en el último intento. */
export const POST: APIRoute = async ({ request }) => {
  if (!rateLimit(`games:crono:${clientIp(request)}`, 60, 60_000)) return Response.json({ error: 'rate_limited' }, { status: 429 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success || new Set(parsed.data.order).size !== CHRONO_SIZE) return Response.json({ error: 'invalid' }, { status: 400 });
  const { day, seed, order, final } = parsed.data;
  let ref: Ref;
  if (day !== undefined) {
    const hoy = todayNumber();
    if (day !== hoy && day !== hoy - 1) return Response.json({ error: 'day' }, { status: 400 });
    ref = { day };
  } else ref = { seed: seed! };
  const films = chronoFilms(ref);
  const marks = checkOrder(order.map((k) => films[k].year));
  const solved = marks.every(Boolean);
  return Response.json({ marks, solved, ...(solved || final ? { years: films.map((f) => f.year) } : {}) });
};
