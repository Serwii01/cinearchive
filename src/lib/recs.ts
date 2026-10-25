/**
 * Recomendaciones por filtrado de contenido (SOLO SERVIDOR).
 *
 * Tres fuentes de candidatos, cada una con su MOTIVO, que es lo que el usuario
 * ve debajo de cada cartel:
 *   - lo que ha valorado alto → «Porque viste El padrino» (similares de TMDB);
 *   - sus directores favoritos → «Porque te gusta Agnès Varda» (su filmografía
 *     como directora, no cualquier crédito);
 *   - sus géneros favoritos → «Género favorito · Terror» (discover por género).
 * Sin ninguna señal (usuario nuevo), populares.
 *
 * Lo que había antes puntuaba todo en un mismo saco sumando pesos de género sin
 * tope, y un usuario con cuatro películas de crimen valoradas acababa con 47
 * recomendaciones de crimen y ninguna de sus directores. Ahora la selección va
 * por turnos entre motivos: cada director, cada película valorada y cada género
 * colocan su mejor candidato antes de que ninguno coloque el segundo. Las
 * funciones de puntuar y repartir son puras y tienen tests (tests/recs.test.ts).
 *
 * El resultado se cachea en memoria por usuario unos minutos.
 */
import { and, desc, eq, gte, isNull, lte, or } from 'drizzle-orm';
import { db } from '../db/client';
import { userFilms, userPreferences } from '../db/schema';
import {
  getMovie,
  discoverByGenres,
  findDirector,
  popularMovies,
  backdropUrl,
  posterUrl,
  posterSrcset,
  type TmdbSearchResult,
} from './tmdb';
import { getPersonCached } from './people';
import { genreName } from '../data/genres';
import { collections, collectionTitle } from './collections';
import { getFilmsBrief } from './films';
import { normalizeLang } from '../i18n/ui';
import { registerCache } from './cache-registry';

export type ReasonKind = 'film' | 'director' | 'genre' | 'collection' | 'popular';

export interface Reason {
  kind: ReasonKind;
  /** Título de la película, nombre del director o del género. Vacío en «popular». */
  label: string;
}

export interface Recommendation {
  tmdbId: number;
  title: string;
  year: string;
  overview: string;
  poster: string | null;
  posterSrcset: string | null;
  backdrop: string | null;
  because: Reason;
}

/** Candidato con la fuente que lo trajo. */
export interface Candidate {
  film: TmdbSearchResult;
  reason: Reason;
  /** Fuerza de la fuente: cuánto fía el motor de ese motivo (0–1). */
  strength: number;
}

const MAX_RESULTS = 48;
const MIN_RESULTS = 24;
/** Menos votos que esto y TMDB no sabe si la película es buena o mala. */
const MIN_VOTES = 50;
const CACHE_TTL = 10 * 60_000;
const cache = new Map<string, { at: number; data: Recommendation[] }>();

registerCache({
  id: 'recs',
  label: 'Recomendaciones',
  ttlMs: CACHE_TTL,
  size: () => cache.size,
  clear: () => cache.clear(),
});

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

/* ------------------------------------------------------------------ *
 * Puntuación y reparto: funciones puras.
 * ------------------------------------------------------------------ */

/**
 * Afinidad de género normalizada a [0, 1]: los pesos brutos (preferencias +
 * valoraciones) se dividen por el mayor, así ningún género puede aplastar al
 * resto por mucho que se repita. Los negativos (lo valorado bajo) restan.
 */
export function affinity(genreIds: number[] | undefined, weights: Map<number, number>): number {
  if (!genreIds?.length || weights.size === 0) return 0;
  let max = 0;
  for (const w of weights.values()) if (w > max) max = w;
  if (max <= 0) return 0;
  let sum = 0;
  for (const g of genreIds) sum += (weights.get(g) ?? 0) / max;
  // Media sobre los géneros de la película, para no premiar a las que tienen cinco.
  return Math.max(-1, Math.min(1, sum / Math.min(genreIds.length, 3)));
}

/**
 * Cuánto pesa una valoración según lo reciente que sea. Lo de esta semana dice
 * más de ti que lo de hace año y medio, pero lo viejo no deja de contar: baja
 * de 1 a 0,7 a lo largo del primer año y ahí se queda.
 */
export function recency(updatedAt: Date, now: Date = new Date()): number {
  const dias = (now.getTime() - updatedAt.getTime()) / 86_400_000;
  if (!Number.isFinite(dias) || dias <= 30) return 1;
  return Math.max(0.7, 1 - ((dias - 30) / 365) * 0.3);
}

/**
 * La nota efectiva de una película de la lista. Marcar favorita es una
 * valoración: antes, una favorita sin estrellas no contaba para nada, que es
 * justo al revés de lo que significa el gesto.
 */
export function effectiveRating(row: { rating: number | null; favorite: boolean }): number {
  if (row.rating != null) return row.favorite ? Math.min(5, row.rating + 0.5) : row.rating;
  return row.favorite ? 4.5 : 4;
}

/**
 * Puntuación de un candidato: motivo + afinidad + calidad. La calidad es la
 * nota de TMDB atenuada por cuánta gente ha votado: un corto de estudiante con
 * 60 votos y un 7,8 no debe adelantar a «Sacrificio» con miles.
 */
export function score(c: Candidate, weights: Map<number, number>): number {
  const f = c.film;
  const confianza = Math.min(1, Math.log10(Math.max(1, f.vote_count ?? 0)) / 4);
  const quality = ((f.vote_average ?? 0) / 10) * confianza;
  return c.strength + affinity(f.genre_ids, weights) * 0.8 + quality * 0.6;
}

/**
 * Reparto por turnos entre motivos. Los grupos se ordenan por la fuerza de su
 * mejor candidato; en cada vuelta cada grupo coloca su siguiente mejor. Así
 * ningún motivo copa la lista y todos aparecen desde el principio.
 */
export function selectBalanced(candidates: Candidate[], weights: Map<number, number>, max: number): Candidate[] {
  const grupos = new Map<string, Candidate[]>();
  for (const c of candidates) {
    const key = `${c.reason.kind}:${c.reason.label}`;
    (grupos.get(key) ?? grupos.set(key, []).get(key)!).push(c);
  }
  const listas = [...grupos.values()].map((l) => l.sort((a, b) => score(b, weights) - score(a, weights)));
  listas.sort((a, b) => score(b[0], weights) - score(a[0], weights));

  const out: Candidate[] = [];
  const vistos = new Set<number>();
  let alguno = true;
  while (alguno && out.length < max) {
    alguno = false;
    for (const lista of listas) {
      let next = lista.shift();
      while (next && vistos.has(next.film.id)) next = lista.shift();
      if (!next) continue;
      vistos.add(next.film.id);
      out.push(next);
      alguno = true;
      if (out.length >= max) break;
    }
  }
  return out;
}

/* ------------------------------------------------------------------ *
 * Cálculo.
 * ------------------------------------------------------------------ */

const usable = (f: TmdbSearchResult, exclude: Set<number>) =>
  !exclude.has(f.id) && !!f.poster_path && (f.vote_count ?? 0) >= MIN_VOTES;

async function computeRecommendations(userId: string, locale: string): Promise<Recommendation[]> {
  const lang = normalizeLang(locale.slice(0, 2));
  const [prefs] = await db.select().from(userPreferences).where(eq(userPreferences.userId, userId)).limit(1);

  // Gusta: lo valorado con 4 o 5 Y lo marcado como favorito. Una favorita sin
  // estrellas es una recomendación en toda regla y antes no contaba.
  const liked = await db
    .select()
    .from(userFilms)
    .where(and(eq(userFilms.userId, userId), or(gte(userFilms.rating, 4), eq(userFilms.favorite, true))))
    .orderBy(desc(userFilms.favorite), desc(userFilms.updatedAt))
    .limit(10);

  // Vistas sin valorar: no sirven para traer candidatos (no dicen si gustó),
  // pero sí dicen qué géneros frecuentas. Sus géneros salen de la caché de
  // fichas, sin pedirle nada a TMDB.
  const vistas = await db
    .select({ tmdbId: userFilms.tmdbId })
    .from(userFilms)
    .where(and(eq(userFilms.userId, userId), eq(userFilms.status, 'seen'), isNull(userFilms.rating)))
    .orderBy(desc(userFilms.updatedAt))
    .limit(20);
  const disliked = await db
    .select()
    .from(userFilms)
    .where(and(eq(userFilms.userId, userId), lte(userFilms.rating, 2)))
    .limit(8);
  const listed = await db.select({ tmdbId: userFilms.tmdbId }).from(userFilms).where(eq(userFilms.userId, userId));
  const exclude = new Set(listed.map((r) => r.tmdbId));

  const weights = new Map<number, number>();
  const addWeight = (id: number, w: number) => weights.set(id, (weights.get(id) ?? 0) + w);
  for (const g of prefs?.favoriteGenres ?? []) addWeight(g, 3);

  if (vistas.length) {
    try {
      const briefs = await getFilmsBrief(vistas.map((v) => v.tmdbId), lang);
      for (const b of briefs.values()) for (const g of b.genreIds) addWeight(g, 1);
    } catch {
      /* la caché de fichas no está: se sigue sin esta señal */
    }
  }

  const candidates: Candidate[] = [];
  const add = (film: TmdbSearchResult, reason: Reason, strength: number) => {
    if (usable(film, exclude)) candidates.push({ film, reason, strength });
  };

  // 1) Lo valorado alto: similares y recomendaciones de TMDB, con la película
  //    como motivo. Una de 5 estrellas fía más que una de 4.
  for (const row of liked) {
    try {
      const m = await getMovie(row.tmdbId, locale);
      const nota = effectiveRating(row);
      for (const g of m.genres) addWeight(g.id, nota);
      const strength = (0.7 + (nota - 4) * 0.3) * recency(row.updatedAt);
      for (const r of [...(m.recommendations?.results ?? []), ...(m.similar?.results ?? [])]) {
        add(r, { kind: 'film', label: m.title }, strength);
      }
    } catch {
      /* fallo puntual de TMDB: se sigue con el resto */
    }
  }

  // 2) Lo valorado bajo solo resta peso a sus géneros.
  for (const row of disliked) {
    try {
      const m = await getMovie(row.tmdbId, locale);
      for (const g of m.genres) addWeight(g.id, -2);
    } catch {
      /* ignorar */
    }
  }

  // 3) Directores favoritos: su filmografía COMO DIRECTOR. Con el id guardado
  //    desde el buscador no hay que adivinar; para los nombres sueltos de
  //    antes, findDirector prefiere a quien se dedica a dirigir.
  const people: { id: number; name: string }[] = [...(prefs?.favoritePeople ?? [])];
  const conId = new Set(people.map((p) => p.name.toLowerCase()));
  for (const name of prefs?.favoriteDirectors ?? []) {
    if (conId.has(name.toLowerCase())) continue;
    try {
      const d = await findDirector(name, locale);
      if (d && !people.some((p) => p.id === d.id)) people.push(d);
    } catch {
      /* ignorar */
    }
  }
  for (const p of people.slice(0, 10)) {
    try {
      const person = await getPersonCached(p.id, locale);
      for (const c of person.movie_credits.crew) {
        if (c.job !== 'Director' || !c.title) continue;
        add(
          {
            id: c.id,
            title: c.title,
            original_title: c.original_title ?? c.title,
            release_date: c.release_date,
            poster_path: c.poster_path,
            backdrop_path: c.backdrop_path ?? null,
            overview: c.overview ?? '',
            vote_average: c.vote_average ?? 0,
            vote_count: c.vote_count,
            genre_ids: c.genre_ids,
            popularity: c.popularity,
          },
          { kind: 'director', label: person.name },
          1,
        );
      }
    } catch {
      /* ignorar */
    }
  }

  // 3bis) Las colecciones de la casa. Si lo que te gustó está en una de las
  //       doce colecciones, el resto de esa colección es la mejor
  //       recomendación que puede dar esta web: la eligió una persona, no un
  //       algoritmo de TMDB, y además lleva a una página nuestra. Se piden
  //       pocas y con tope, que cada una cuesta una ficha.
  const gustadas = new Set(liked.map((r) => r.tmdbId));
  const yaVistasColecciones = new Set<string>();
  let fichasPedidas = 0;
  for (const row of liked) {
    for (const col of collections) {
      if (fichasPedidas >= 9) break;
      if (!col.tmdbIds.includes(row.tmdbId) || yaVistasColecciones.has(col.slug)) continue;
      yaVistasColecciones.add(col.slug);
      const titulo = collectionTitle(col, lang);
      const pendientes = col.tmdbIds.filter((id) => !exclude.has(id) && !gustadas.has(id)).slice(0, 3);
      for (const id of pendientes) {
        if (fichasPedidas >= 9) break;
        fichasPedidas++;
        try {
          const m = await getMovie(id, locale);
          add(
            {
              id: m.id,
              title: m.title,
              original_title: m.original_title ?? m.title,
              release_date: m.release_date,
              poster_path: m.poster_path,
              backdrop_path: m.backdrop_path ?? null,
              overview: m.overview ?? '',
              vote_average: m.vote_average ?? 0,
              vote_count: m.vote_count,
              genre_ids: m.genres?.map((g) => g.id),
            },
            { kind: 'collection', label: titulo },
            0.9,
          );
        } catch {
          /* una ficha que falla no tumba la lista */
        }
      }
    }
  }

  // 4) Géneros favoritos, uno a uno, para que cada uno aporte y salga como
  //    motivo. Los mejor valorados (con muchos votos) y los populares.
  const favGenres = [...(prefs?.favoriteGenres ?? [])].slice(0, 8);
  for (const genreId of favGenres) {
    for (const sort of ['vote_average.desc', 'popularity.desc'] as const) {
      try {
        for (const r of await discoverByGenres([genreId], locale, sort)) {
          add(r, { kind: 'genre', label: genreName(genreId, locale) }, 0.55);
        }
      } catch {
        /* ignorar */
      }
    }
  }

  // 5) Arranque en frío: lo de casa antes que lo de todo el mundo. Una
  //    película por colección, la mejor valorada que no esté ya en su lista.
  if (candidates.length < MIN_RESULTS) {
    for (const col of collections) {
      if (candidates.length >= MIN_RESULTS) break;
      const id = col.tmdbIds.find((x) => !exclude.has(x));
      if (!id) continue;
      try {
        const m = await getMovie(id, locale);
        add(
          {
            id: m.id,
            title: m.title,
            original_title: m.original_title ?? m.title,
            release_date: m.release_date,
            poster_path: m.poster_path,
            backdrop_path: m.backdrop_path ?? null,
            overview: m.overview ?? '',
            vote_average: m.vote_average ?? 0,
            vote_count: m.vote_count,
            genre_ids: m.genres?.map((g) => g.id),
          },
          { kind: 'collection', label: collectionTitle(col, lang) },
          0.45,
        );
      } catch {
        /* siguiente colección */
      }
    }
  }

  // 6) Si aun así falta, populares de TMDB.
  if (candidates.length < MIN_RESULTS) {
    for (const page of [1, 2]) {
      try {
        for (const r of await popularMovies(locale, page)) add(r, { kind: 'popular', label: '' }, 0.3);
      } catch {
        /* ignorar */
      }
      if (candidates.length >= MIN_RESULTS) break;
    }
  }

  return selectBalanced(candidates, weights, MAX_RESULTS).map(({ film, reason }) => ({
    tmdbId: film.id,
    title: film.title,
    year: film.release_date ? film.release_date.slice(0, 4) : '',
    overview: film.overview ?? '',
    poster: posterUrl(film.poster_path, 'w342'),
    posterSrcset: posterSrcset(film.poster_path, 'w342', 'w500'),
    backdrop: backdropUrl(film.backdrop_path ?? null, 'w1280'),
    because: reason,
  }));
}
