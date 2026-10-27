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
import { userFilms, userViewings } from '../db/schema';
import { invalidateRecommendations } from './recs';
import { invalidateStats } from './stats';

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
