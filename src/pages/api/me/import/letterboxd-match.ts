import type { APIRoute } from 'astro';
import { z } from 'zod';
import { searchMoviesForMatch } from '../../../../lib/tmdb';
import { pickMatch, type MatchCandidate, type Confidence } from '../../../../lib/letterboxd';
import { mapLimit } from '../../../../lib/recs';
import { check, tooMany } from '../../../../lib/ratelimit';
import { registerCache } from '../../../../lib/cache-registry';

export const prerender = false;

/**
 * POST — empareja una tanda de títulos de Letterboxd con TMDB.
 *
 * El navegador manda las películas de 50 en 50 y va pintando el progreso: un
 * export de 2.000 películas en una sola petición tendría el servidor (512 MB)
 * esperando a TMDB más de un minuto con la conexión abierta.
 */
const BATCH = 50;
const schema = z.object({
  items: z
    .array(z.object({ key: z.string().max(400), name: z.string().min(1).max(300), year: z.number().int().nullable() }))
    .min(1)
    .max(BATCH),
});

// Lo emparejado se recuerda un día: si alguien repite la importación (o dos
// usuarios suben las mismas películas), no se vuelve a preguntar a TMDB.
type Hit = { id: number | null; confidence: Confidence; candidates: MatchCandidate[] };
const memo = new Map<string, { at: number; hit: Hit }>();
const TTL = 24 * 60 * 60_000;
const MAX = 20_000;
registerCache({ id: 'letterboxd-match', label: 'Emparejado de Letterboxd', ttlMs: TTL, size: () => memo.size, clear: () => memo.clear() });

async function match(name: string, year: number | null): Promise<Hit> {
  const k = `${name.toLowerCase()}|${year ?? ''}`;
  const m = memo.get(k);
  if (m && Date.now() - m.at < TTL) return m.hit;

  let results = await searchMoviesForMatch(name, year ?? undefined);
  // El año de Letterboxd y el de TMDB a veces no coinciden (estreno en
  // festival un año, en salas al siguiente): sin resultados, se busca sin año.
  if (results.length === 0 && year) results = await searchMoviesForMatch(name);
  const candidates: MatchCandidate[] = results.slice(0, 5).map((r) => ({
    id: r.id,
    title: r.title,
    original_title: r.original_title,
    release_date: r.release_date,
    poster_path: r.poster_path,
  }));
  const hit = { ...pickMatch(name, year, results), candidates };
  if (memo.size >= MAX) memo.delete(memo.keys().next().value!);
  memo.set(k, { at: Date.now(), hit });
  return hit;
}

export const POST: APIRoute = async ({ locals, request }) => {
  if (!locals.user) return new Response(JSON.stringify({ error: 'unauthorized' }), { status: 401 });
  const rl = check(`lb-match:${locals.user.id}`, 120, 60_000);
  if (!rl.ok) return tooMany(rl.retryAfter);
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return new Response(JSON.stringify({ error: 'invalid' }), { status: 400 });

  const results = await mapLimit(parsed.data.items, 6, async (it) => {
    try {
      return { key: it.key, ...(await match(it.name, it.year)) };
    } catch {
      // Un fallo de TMDB con una película no tumba la tanda: sale como «sin
      // encontrar» y el usuario puede repetir.
      return { key: it.key, id: null, confidence: 'none' as const, candidates: [] };
    }
  });
  return Response.json({ results });
};
