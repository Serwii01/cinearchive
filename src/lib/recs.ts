/**
 * Recomendaciones por filtrado de contenido (SOLO SERVIDOR).
 *
 * Construye un "perfil de gusto" a partir de las preferencias del usuario (géneros y
 * directores favoritos) y de sus valoraciones, y puntúa películas candidatas de TMDB:
 *   - recomendaciones/similares de lo que le gusta,
 *   - películas de sus directores favoritos,
 *   - discover por sus géneros con más peso (clásicos + populares).
 * Resta peso a los géneros de lo que ha valorado bajo y excluye lo que ya tiene en
 * su lista. Si no hay señal (usuario nuevo), recurre a populares (arranque en frío).
 * El resultado se cachea en memoria por usuario unos minutos.
 */
import { and, eq, gte, lte } from 'drizzle-orm';
import { db } from '../db/client';
import { userFilms, userPreferences } from '../db/schema';
import {
  getMovie,
  discoverByGenres,
  discoverByCrew,
  searchPerson,
  popularMovies,
  backdropUrl,
  posterUrl,
  posterSrcset,
  type TmdbSearchResult,
} from './tmdb';
import { genreName } from '../data/genres';

export interface Recommendation {
  tmdbId: number;
  title: string;
  year: string;
  overview: string;
  poster: string | null;
  posterSrcset: string | null;
  backdrop: string | null;
  because: string | null;
}

const DIRECTOR_BONUS = 10; // empuje fuerte para películas de un director favorito
const MIN_RESULTS = 30; // mínimo garantizado por usuario
const MAX_RESULTS = 48; // tope superior
const CACHE_TTL = 10 * 60_000; // 10 min
const cache = new Map<string, { at: number; data: Recommendation[] }>();

export async function getRecommendations(userId: string, locale: string): Promise<Recommendation[]> {
  const cacheKey = `${userId}:${locale}`;
  const hit = cache.get(cacheKey);
  if (hit && Date.now() - hit.at < CACHE_TTL) return hit.data;

  const data = await computeRecommendations(userId, locale);
  cache.set(cacheKey, { at: Date.now(), data });
  return data;
}

/** Invalida la caché de un usuario (p. ej. tras valorar o cambiar preferencias). */
export function invalidateRecommendations(userId: string): void {
  for (const key of cache.keys()) if (key.startsWith(`${userId}:`)) cache.delete(key);
}

async function computeRecommendations(userId: string, locale: string): Promise<Recommendation[]> {
  const [prefs] = await db
    .select()
    .from(userPreferences)
    .where(eq(userPreferences.userId, userId))
    .limit(1);

  const liked = await db
    .select()
    .from(userFilms)
    .where(and(eq(userFilms.userId, userId), gte(userFilms.rating, 4)));

  const disliked = await db
    .select()
    .from(userFilms)
    .where(and(eq(userFilms.userId, userId), lte(userFilms.rating, 2)));

  const listed = await db
    .select({ tmdbId: userFilms.tmdbId })
    .from(userFilms)
    .where(eq(userFilms.userId, userId));
  const exclude = new Set(listed.map((r) => r.tmdbId));

  // --- Pesos de género: preferencias + valoraciones (positivas y negativas). ---
  const genreWeights = new Map<number, number>();
  const addWeight = (id: number, w: number) => genreWeights.set(id, (genreWeights.get(id) ?? 0) + w);
  for (const g of prefs?.favoriteGenres ?? []) addWeight(g, 3);

  const candidates = new Map<number, TmdbSearchResult>();
  const fromDirector = new Map<number, string>(); // tmdbId -> nombre del director

  // Candidatos a partir de lo valorado alto (recomendaciones + similares de TMDB).
  for (const row of liked.slice(0, 8)) {
    try {
      const m = await getMovie(row.tmdbId, locale);
      for (const g of m.genres) addWeight(g.id, row.rating ?? 4);
      for (const r of [...(m.recommendations?.results ?? []), ...(m.similar?.results ?? [])]) {
        if (!exclude.has(r.id)) candidates.set(r.id, r);
      }
    } catch {
      /* ignorar fallos puntuales de TMDB */
    }
  }

  // Señal negativa: restar peso a los géneros de lo valorado bajo.
  for (const row of disliked.slice(0, 8)) {
    try {
      const m = await getMovie(row.tmdbId, locale);
      for (const g of m.genres) addWeight(g.id, -2);
    } catch {
      /* ignorar */
    }
  }

  // --- Candidatos de los directores favoritos (señal que antes no se usaba). ---
  for (const name of (prefs?.favoriteDirectors ?? []).slice(0, 3)) {
    try {
      const personId = await searchPerson(name, locale);
      if (!personId) continue;
      for (const r of await discoverByCrew(personId, locale)) {
        if (exclude.has(r.id)) continue;
        candidates.set(r.id, r);
        if (!fromDirector.has(r.id)) fromDirector.set(r.id, name);
      }
    } catch {
      /* ignorar */
    }
  }

  // --- Discover por los géneros con más peso (clásicos + populares, 2 páginas). ---
  const topGenres = [...genreWeights.entries()]
    .filter(([, w]) => w > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([id]) => id);
  if (topGenres.length > 0) {
    for (const sort of ['vote_average.desc', 'popularity.desc'] as const) {
      for (const page of [1, 2]) {
        try {
          for (const r of await discoverByGenres(topGenres, locale, sort, page)) {
            if (!exclude.has(r.id)) candidates.set(r.id, r);
          }
        } catch {
          /* ignorar */
        }
      }
    }
  }

  // --- Arranque en frío: sin ninguna señal, recurrir a populares. ---
  if (candidates.size === 0) {
    try {
      for (const r of await popularMovies(locale)) {
        if (!exclude.has(r.id)) candidates.set(r.id, r);
      }
    } catch {
      /* ignorar */
    }
  }

  // Construye una recomendación a partir de un candidato (motivo = director o género).
  const toRec = (c: TmdbSearchResult, directorName?: string): Recommendation => {
    let topGenre: number | null = null;
    let topW = 0;
    for (const g of c.genre_ids ?? []) {
      const w = genreWeights.get(g) ?? 0;
      if (w > topW) {
        topW = w;
        topGenre = g;
      }
    }
    return {
      tmdbId: c.id,
      title: c.title,
      year: c.release_date ? c.release_date.slice(0, 4) : '',
      overview: c.overview ?? '',
      poster: posterUrl(c.poster_path, 'w342'),
      posterSrcset: posterSrcset(c.poster_path, 'w342', 'w500'),
      backdrop: backdropUrl(c.backdrop_path ?? null, 'w1280'),
      because: directorName ?? (topGenre ? genreName(topGenre, locale as 'es' | 'en') : null),
    };
  };

  // --- Puntuar: solapamiento de géneros + bonus de director + nota + popularidad. ---
  const scored = [...candidates.values()]
    .map((c) => {
      let score = 0;
      for (const g of c.genre_ids ?? []) score += genreWeights.get(g) ?? 0;
      const directorName = fromDirector.get(c.id);
      if (directorName) score += DIRECTOR_BONUS;
      score += (c.vote_average ?? 0) * 0.2;
      score += Math.min(c.popularity ?? 0, 100) * 0.01;
      return { c, score, directorName };
    })
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, MAX_RESULTS);

  const recs = scored.map((s) => toRec(s.c, s.directorName));

  // --- Mínimo garantizado: rellenar con populares hasta MIN_RESULTS. ---
  if (recs.length < MIN_RESULTS) {
    const chosen = new Set(recs.map((r) => r.tmdbId));
    for (const page of [1, 2, 3]) {
      if (recs.length >= MIN_RESULTS) break;
      try {
        for (const r of await popularMovies(locale, page)) {
          if (recs.length >= MIN_RESULTS) break;
          if (exclude.has(r.id) || chosen.has(r.id)) continue;
          chosen.add(r.id);
          recs.push(toRec(r));
        }
      } catch {
        /* ignorar */
      }
    }
  }

  return recs;
}
