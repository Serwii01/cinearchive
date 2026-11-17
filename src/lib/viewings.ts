/**
 * Diario de visionados — SOLO SERVIDOR. Las funciones puras del diario están
 * en diary.ts.
 *
 * Un visionado es «vi esta película este día». user_films sigue siendo la
 * ficha de la película para el usuario (estado, nota, reseña); esto es el
 * registro de cuándo, que es lo que hace falta para el diario y para «Tu año
 * en cine».
 */
import { and, desc, eq, gte, lt, sql } from 'drizzle-orm';
import { db } from '../db/client';
import { userFilms, userGoals, userViewings } from '../db/schema';
import { invalidateRecommendations } from './recs';
import { invalidateStats } from './stats';
import { getFilmsBrief } from './films';
import { computeYear, type YearReview } from './yearreview';
import { goalProgress, type GoalProgress } from './goal';

export interface Viewing {
  id: number;
  tmdbId: number;
  /** AAAA-MM-DD. */
  watchedOn: string;
  rewatch: boolean;
  rating: number | null;
  source: string;
}

const cols = {
  id: userViewings.id,
  tmdbId: userViewings.tmdbId,
  watchedOn: userViewings.watchedOn,
  rewatch: userViewings.rewatch,
  rating: userViewings.rating,
  source: userViewings.source,
};

/** Visionados del usuario, del más reciente al más antiguo. `year` filtra por año. */
export async function listViewings(userId: string, year?: number): Promise<Viewing[]> {
  const where = year
    ? and(eq(userViewings.userId, userId), gte(userViewings.watchedOn, `${year}-01-01`), lt(userViewings.watchedOn, `${year + 1}-01-01`))
    : eq(userViewings.userId, userId);
  return db.select(cols).from(userViewings).where(where).orderBy(desc(userViewings.watchedOn), desc(userViewings.id));
}

/** Visionados de una película, para su ficha. */
export async function filmViewings(userId: string, tmdbId: number): Promise<Viewing[]> {
  return db
    .select(cols)
    .from(userViewings)
    .where(and(eq(userViewings.userId, userId), eq(userViewings.tmdbId, tmdbId)))
    .orderBy(desc(userViewings.watchedOn));
}

/** Años en los que el usuario tiene algún visionado, del más reciente al más antiguo. */
export async function viewingYears(userId: string): Promise<number[]> {
  const rows = await db
    .selectDistinct({ y: sql<number>`extract(year from ${userViewings.watchedOn})::int` })
    .from(userViewings)
    .where(eq(userViewings.userId, userId));
  return rows.map((r) => Number(r.y)).sort((a, b) => b - a);
}

/**
 * Apunta un visionado. Si ya había uno de esa película ese día no hace nada
 * (devuelve false). Es revisionado si hay otro anterior. Además deja la
 * película como vista en user_films si no lo estaba: haberla visto es lo que
 * dice un visionado, y no se toca nada más de su ficha.
 */
export async function addViewing(
  userId: string,
  tmdbId: number,
  watchedOn: string,
  opts: { rating?: number | null; source?: string } = {},
): Promise<boolean> {
  const [prev] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(userViewings)
    .where(and(eq(userViewings.userId, userId), eq(userViewings.tmdbId, tmdbId), lt(userViewings.watchedOn, watchedOn)));
  const inserted = await db
    .insert(userViewings)
    .values({
      userId,
      tmdbId,
      watchedOn,
      rewatch: Number(prev?.n ?? 0) > 0,
      rating: opts.rating ?? null,
      source: opts.source ?? 'manual',
    })
    .onConflictDoNothing()
    .returning({ id: userViewings.id });

  await db
    .insert(userFilms)
    .values({ userId, tmdbId, status: 'seen' })
    .onConflictDoUpdate({
      target: [userFilms.userId, userFilms.tmdbId],
      set: { status: 'seen' },
      // Solo sube de «pendiente» a «vista»; una vista o favorita se queda igual.
      setWhere: eq(userFilms.status, 'want'),
    });

  invalidateViewer(userId);
  return inserted.length > 0;
}

/**
 * Si el usuario fija «cuándo la vi» en una película vista que aún no tiene
 * ningún visionado, ese día pasa a ser el primero. Así el diario se llena
 * solo con el gesto de siempre; si ya tiene visionados no se toca nada,
 * porque cambiar la fecha no es haberla vuelto a ver.
 */
export async function ensureFirstViewing(userId: string, tmdbId: number, watchedOn: string): Promise<void> {
  const [film] = await db
    .select({ status: userFilms.status })
    .from(userFilms)
    .where(and(eq(userFilms.userId, userId), eq(userFilms.tmdbId, tmdbId)));
  if (!film || film.status === 'want') return;
  const [any] = await db
    .select({ id: userViewings.id })
    .from(userViewings)
    .where(and(eq(userViewings.userId, userId), eq(userViewings.tmdbId, tmdbId)))
    .limit(1);
  if (!any) await addViewing(userId, tmdbId, watchedOn);
}

/**
 * La nota que se acaba de dar va al último visionado que se apuntó de esa
 * película: el diario enseña la nota de cada visionado, y sin esto el que se
 * apuntaba al puntuar se quedaba sin estrellas. Si se ha vuelto a ver («Vista
 * otra vez»), el último apuntado es ese, y la nota nueva es la de ese
 * revisionado; la de la primera vez se queda como estaba. Por orden de
 * apunte (id) y no de fecha: un revisionado puede llevar una fecha anterior
 * (se apunta tarde lo que se vio el sábado) y la nota seguía yendo al otro.
 */
export async function rateLatestViewing(userId: string, tmdbId: number, rating: number | null): Promise<void> {
  const [ultimo] = await db
    .select({ id: userViewings.id })
    .from(userViewings)
    .where(and(eq(userViewings.userId, userId), eq(userViewings.tmdbId, tmdbId)))
    .orderBy(desc(userViewings.id))
    .limit(1);
  if (!ultimo) return;
  await db.update(userViewings).set({ rating }).where(eq(userViewings.id, ultimo.id));
  invalidateViewer(userId);
}

/**
 * Cambiar «Cuándo la vi» cuando la película tiene UN solo visionado, apuntado
 * desde la web: es ese mismo día el que se corrige (se puntuó hoy y se vio el
 * sábado). Con más de uno no se toca nada, porque no se sabe cuál es, ni con
 * uno importado de Letterboxd, que trae su fecha de verdad. Los completados por
 * la migración 0028 ('auto') sí, que su fecha es una aproximación.
 */
export async function moveOnlyViewing(userId: string, tmdbId: number, watchedOn: string): Promise<void> {
  const vs = await db
    .select({ id: userViewings.id, source: userViewings.source, watchedOn: userViewings.watchedOn })
    .from(userViewings)
    .where(and(eq(userViewings.userId, userId), eq(userViewings.tmdbId, tmdbId)))
    .limit(2);
  if (vs.length !== 1 || vs[0].source === 'letterboxd' || vs[0].watchedOn === watchedOn) return;
  await db.update(userViewings).set({ watchedOn }).where(eq(userViewings.id, vs[0].id));
  invalidateViewer(userId);
}

/** Borra un visionado del usuario. Devuelve false si no era suyo o no existía. */
export async function deleteViewing(userId: string, id: number): Promise<boolean> {
  const del = await db
    .delete(userViewings)
    .where(and(eq(userViewings.id, id), eq(userViewings.userId, userId)))
    .returning({ id: userViewings.id });
  if (del.length) invalidateViewer(userId);
  return del.length > 0;
}

/** Lo que depende de los visionados y hay que recalcular al cambiarlos. */
export function invalidateViewer(userId: string): void {
  invalidateStats(userId);
  invalidateRecommendations(userId);
}

/**
 * El resumen de un año del usuario, más los datos de las películas que salen
 * en él (título y cartel) para pintarlo.
 */
export async function loadYearReview(userId: string, year: number, locale: string) {
  const vs = await listViewings(userId, year);
  const ratings = await db
    .select({ tmdbId: userFilms.tmdbId, rating: userFilms.rating })
    .from(userFilms)
    .where(eq(userFilms.userId, userId));
  const filmRating = new Map(ratings.map((r) => [r.tmdbId, r.rating]));
  const briefs = await getFilmsBrief([...new Set(vs.map((v) => v.tmdbId))], locale);
  const review: YearReview = computeYear(
    year,
    vs.map((v) => ({ tmdbId: v.tmdbId, watchedOn: v.watchedOn, rewatch: v.rewatch, rating: v.rating ?? filmRating.get(v.tmdbId) ?? null })),
    briefs,
  );
  return { review, briefs };
}

/* ------------------------------------------------------------------ *
 * Reto anual (las cuentas están en goal.ts)
 * ------------------------------------------------------------------ */

/** Visionados del usuario en un año. */
export async function countViewings(userId: string, year: number): Promise<number> {
  const [r] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(userViewings)
    .where(and(eq(userViewings.userId, userId), gte(userViewings.watchedOn, `${year}-01-01`), lt(userViewings.watchedOn, `${year + 1}-01-01`)));
  return Number(r?.n ?? 0);
}

/** El reto de ese año con su progreso, o null si no se puso ninguno. */
export async function yearGoal(userId: string, year: number, today = new Date()): Promise<GoalProgress | null> {
  const [g] = await db
    .select({ target: userGoals.target })
    .from(userGoals)
    .where(and(eq(userGoals.userId, userId), eq(userGoals.year, year)));
  if (!g) return null;
  return goalProgress(g.target, await countViewings(userId, year), year, today);
}

/** Pone o cambia el reto de un año; con target null lo quita. */
export async function setGoal(userId: string, year: number, target: number | null): Promise<void> {
  if (target == null) {
    await db.delete(userGoals).where(and(eq(userGoals.userId, userId), eq(userGoals.year, year)));
    return;
  }
  await db
    .insert(userGoals)
    .values({ userId, year, target, updatedAt: new Date() })
    .onConflictDoUpdate({ target: [userGoals.userId, userGoals.year], set: { target, updatedAt: new Date() } });
}
