/**
 * Estadísticas personales del usuario ("Tu cine en números") — SOLO SERVIDOR.
 *
 * Se calculan a partir de su lista (userFilms) y de los datos de película ya
 * cacheados (getFilmsBrief), sin llamadas nuevas a APIs externas. El resultado se
 * cachea en memoria por usuario unos minutos y se invalida al cambiar la lista.
 */
import { eq } from 'drizzle-orm';
import { db } from '../db/client';
import { userFilms } from '../db/schema';
import { getFilmsBrief } from './films';
import { genreName } from '../data/genres';
import { registerCache } from './cache-registry';
import { isValidRating } from './stars';
import { topPeople, type PersonFilm, type TopPeople } from './toppeople';

export interface CountItem {
  label: string;
  count: number;
}
export interface UserStats {
  total: number;
  want: number;
  seen: number;
  favorite: number;
  hoursWatched: number;
  rated: number;
  avgRating: number | null;
  ratingHistogram: number[]; // índices 0..9 → notas 0,5..5 (índice = nota·2 − 1)
  topGenres: CountItem[];
  /** Directores y actores de lo VISTO (no de lo pendiente), con id para enlazarlos. */
  people: TopPeople;
  byDecade: { decade: number; count: number }[];
}

const CACHE_TTL = 10 * 60_000;
const cache = new Map<string, { at: number; data: UserStats }>();

registerCache({
  id: 'stats',
  label: 'Estadísticas de usuario',
  ttlMs: CACHE_TTL,
  size: () => cache.size,
  clear: () => cache.clear(),
});

export function invalidateStats(userId: string): void {
  for (const key of cache.keys()) if (key.startsWith(`${userId}:`)) cache.delete(key);
}

export async function getUserStats(userId: string, locale: string): Promise<UserStats> {
  const cacheKey = `${userId}:${locale}`;
  const hit = cache.get(cacheKey);
  if (hit && Date.now() - hit.at < CACHE_TTL) return hit.data;

  const rows = await db.select().from(userFilms).where(eq(userFilms.userId, userId));
  const briefs = await getFilmsBrief(
    rows.map((r) => r.tmdbId),
    locale,
  );

  const genres = new Map<number, number>();
  const decades = new Map<number, number>();
  const histogram: number[] = Array(10).fill(0);
  let hoursMin = 0;
  let ratingSum = 0;
  let rated = 0;
  const counts = { want: 0, seen: 0, favorite: 0 };
  const seenFilms: PersonFilm[] = [];

  for (const row of rows) {
    // 'favorite' era un estado histórico; hoy es un flag propio. Se normaliza al
    // vuelo para que las filas antiguas cuenten como vistas + favoritas.
    const seenOrFav = row.status === 'seen' || row.status === 'favorite';
    if (row.status === 'want') counts.want++;
    else counts.seen++;
    if (row.favorite || row.status === 'favorite') counts.favorite++;
    if (isValidRating(row.rating)) {
      histogram[row.rating * 2 - 1]++;
      ratingSum += row.rating;
      rated++;
    }
    const b = briefs.get(row.tmdbId);
    if (!b) continue;
    const watched = seenOrFav;
    if (watched) {
      hoursMin += b.runtime;
      seenFilms.push({ tmdbId: row.tmdbId, rating: isValidRating(row.rating) ? row.rating : null, directors: b.directors, cast: b.cast });
    }
    for (const g of b.genreIds) genres.set(g, (genres.get(g) ?? 0) + 1);
    if (b.decade != null) decades.set(b.decade, (decades.get(b.decade) ?? 0) + 1);
  }

  const topGenres: CountItem[] = [...genres.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([id, count]) => ({ label: genreName(id, locale as 'es' | 'en'), count }));

  const data: UserStats = {
    total: rows.length,
    want: counts.want,
    seen: counts.seen,
    favorite: counts.favorite,
    hoursWatched: Math.round(hoursMin / 60),
    rated,
    avgRating: rated > 0 ? ratingSum / rated : null,
    ratingHistogram: histogram,
    topGenres,
    people: topPeople(seenFilms),
    byDecade: [...decades.entries()]
      .sort((a, b) => a[0] - b[0])
      .map(([decade, count]) => ({ decade, count })),
  };

  cache.set(cacheKey, { at: Date.now(), data });
  return data;
}
