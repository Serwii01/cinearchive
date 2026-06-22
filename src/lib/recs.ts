/**
 * Recomendaciones por filtrado de contenido (SOLO SERVIDOR).
 *
 * Construye un "perfil de gusto" a partir de las preferencias del usuario (géneros y
 * directores favoritos) y de las películas que ha valorado alto, y puntúa películas
 * candidatas de TMDB (recomendaciones/similares de las que le gustan + discover por
 * géneros) según el solapamiento de géneros. Excluye lo que ya tiene en su lista.
 */
import { and, eq, gte } from 'drizzle-orm';
import { db } from '../db/client';
import { userFilms, userPreferences } from '../db/schema';
import { getMovie, discoverByGenres, director, posterUrl, type TmdbSearchResult } from './tmdb';
import { genreName } from '../data/genres';

export interface Recommendation {
  tmdbId: number;
  title: string;
  year: string;
  poster: string | null;
  because: string | null;
}

export async function getRecommendations(userId: string, locale: string): Promise<Recommendation[]> {
  const [prefs] = await db
    .select()
    .from(userPreferences)
    .where(eq(userPreferences.userId, userId))
    .limit(1);

  const liked = await db
    .select()
    .from(userFilms)
    .where(and(eq(userFilms.userId, userId), gte(userFilms.rating, 4)));

  const listed = await db
    .select({ tmdbId: userFilms.tmdbId })
    .from(userFilms)
    .where(eq(userFilms.userId, userId));
  const exclude = new Set(listed.map((r) => r.tmdbId));

  // Pesos de género: preferencias explícitas + géneros de lo valorado alto.
  const genreWeights = new Map<number, number>();
  const addWeight = (id: number, w: number) => genreWeights.set(id, (genreWeights.get(id) ?? 0) + w);
  for (const g of prefs?.favoriteGenres ?? []) addWeight(g, 3);

  const candidates = new Map<number, TmdbSearchResult>();
  for (const row of liked.slice(0, 8)) {
    try {
      const m = await getMovie(row.tmdbId, locale);
      for (const g of m.genres) addWeight(g.id, row.rating ?? 4);
      const seeds = [
        ...(m.recommendations?.results ?? []),
        ...(m.similar?.results ?? []),
      ];
      for (const r of seeds) if (!exclude.has(r.id)) candidates.set(r.id, r);
    } catch {
      /* ignorar fallos puntuales de TMDB */
    }
  }

  // Discover por los géneros con más peso.
  const topGenres = [...genreWeights.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([id]) => id);
  if (topGenres.length > 0) {
    try {
      for (const r of await discoverByGenres(topGenres, locale)) {
        if (!exclude.has(r.id)) candidates.set(r.id, r);
      }
    } catch {
      /* ignorar */
    }
  }

  // Puntuar por solapamiento de géneros (+ pequeño empujón por nota media).
  const scored = [...candidates.values()]
    .map((c) => {
      let score = 0;
      let topGenre: number | null = null;
      let topW = 0;
      for (const g of c.genre_ids ?? []) {
        const w = genreWeights.get(g) ?? 0;
        score += w;
        if (w > topW) {
          topW = w;
          topGenre = g;
        }
      }
      score += (c.vote_average ?? 0) * 0.2;
      return { c, score, topGenre };
    })
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 18);

  return scored.map((s) => ({
    tmdbId: s.c.id,
    title: s.c.title,
    year: s.c.release_date ? s.c.release_date.slice(0, 4) : '',
    poster: posterUrl(s.c.poster_path, 'w185'),
    because: s.topGenre ? genreName(s.topGenre, locale as 'es' | 'en') : null,
  }));
}
