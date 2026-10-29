/**
 * La nota de Cine Archive de una película: la media de las estrellas que le
 * han puesto las personas registradas.
 *
 * Existe sobre todo por Google: sus estrellas en los resultados solo se
 * permiten con notas de los usuarios del propio sitio, y antes la ficha
 * declaraba la de TMDB, que es de otra web. Además se enseña en la ficha,
 * porque Google exige que lo marcado se vea en la página.
 */
import { eq, isNotNull, and, sql } from 'drizzle-orm';
import { db } from '../db/client';
import { userFilms } from '../db/schema';

/** Con menos notas, la media dice más de quién votó que de la película. */
export const MIN_RATINGS = 3;

export interface CommunityRating {
  /** De 0,5 a 5, con un decimal. */
  value: number;
  count: number;
}

/** La media redondeada a un decimal, o null si no llega al mínimo de notas. */
export function communityScore(sum: number, count: number): CommunityRating | null {
  if (!Number.isFinite(sum) || count < MIN_RATINGS) return null;
  return { value: Math.round((sum / count) * 10) / 10, count };
}

export async function getCommunityRating(tmdbId: number): Promise<CommunityRating | null> {
  try {
    const [r] = await db
      .select({ sum: sql<number>`coalesce(sum(${userFilms.rating}), 0)::float`, n: sql<number>`count(*)::int` })
      .from(userFilms)
      .where(and(eq(userFilms.tmdbId, tmdbId), isNotNull(userFilms.rating)));
    return r ? communityScore(r.sum, r.n) : null;
  } catch {
    return null;
  }
}
