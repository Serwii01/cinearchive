/**
 * Actividad de la gente que sigues: visionados y reseñas mezclados en una sola
 * línea de tiempo. Pura (tiene tests); las consultas están en social.ts.
 */

export interface FeedUser {
  userId: string;
  username: string;
  name: string;
  hasAvatar: boolean;
}

export interface FeedViewingRow extends FeedUser {
  tmdbId: number;
  /** AAAA-MM-DD. */
  watchedOn: string;
  rewatch: boolean;
  rating: number | null;
  createdAt: Date;
}

export interface FeedReviewRow extends FeedUser {
  tmdbId: number;
  rating: number | null;
  note: string;
  reviewedAt: Date;
}

export interface FeedItem extends FeedUser {
  kind: 'viewing' | 'review';
  tmdbId: number;
  /** El día al que pertenece (AAAA-MM-DD): agrupa y ordena. */
  day: string;
  rating: number | null;
  rewatch: boolean;
  /** La reseña, si la escribió junto al visionado o es una reseña suelta. */
  note: string | null;
  /** Desempate dentro del mismo día: lo último apuntado, arriba. */
  at: number;
}

const DAY = 24 * 60 * 60 * 1000;
const isoDay = (d: Date) => d.toISOString().slice(0, 10);
const dayNum = (iso: string) => Date.UTC(Number(iso.slice(0, 4)), Number(iso.slice(5, 7)) - 1, Number(iso.slice(8, 10)));

/**
 * Junta visionados y reseñas. Una reseña escrita en los tres días de un
 * visionado de la misma película se pega a él: «vio X y escribió esto» es una
 * cosa, no dos entradas seguidas.
 */
export function buildFeed(viewings: FeedViewingRow[], reviews: FeedReviewRow[]): FeedItem[] {
  const items: FeedItem[] = viewings.map((v) => ({
    kind: 'viewing',
    userId: v.userId,
    username: v.username,
    name: v.name,
    hasAvatar: v.hasAvatar,
    tmdbId: v.tmdbId,
    day: v.watchedOn,
    rating: v.rating,
    rewatch: v.rewatch,
    note: null,
    at: v.createdAt.getTime(),
  }));

  for (const r of reviews) {
    const rDay = isoDay(r.reviewedAt);
    const near = items
      .filter((i) => i.kind === 'viewing' && i.userId === r.userId && i.tmdbId === r.tmdbId && Math.abs(dayNum(i.day) - dayNum(rDay)) <= 3 * DAY)
      .sort((a, b) => Math.abs(dayNum(a.day) - dayNum(rDay)) - Math.abs(dayNum(b.day) - dayNum(rDay)))[0];
    if (near) {
      near.note = r.note;
      near.rating ??= r.rating;
      continue;
    }
    items.push({
      kind: 'review',
      userId: r.userId,
      username: r.username,
      name: r.name,
      hasAvatar: r.hasAvatar,
      tmdbId: r.tmdbId,
      day: rDay,
      rating: r.rating,
      rewatch: false,
      note: r.note,
      at: r.reviewedAt.getTime(),
    });
  }

  return items.sort((a, b) => b.day.localeCompare(a.day) || b.at - a.at);
}

/**
 * Corta la línea de tiempo en una página de `limit` entradas sin partir un
 * día por la mitad, y devuelve desde qué día sigue la siguiente (exclusivo).
 * Si un solo día ya pasa del límite, se enseña entero: no hay otra forma de
 * avanzar.
 */
export function pageFeed(items: FeedItem[], limit: number): { items: FeedItem[]; nextBefore: string | null } {
  if (items.length <= limit) return { items, nextBefore: null };
  const cutDay = items[limit].day;
  let end = items.findIndex((i) => i.day === cutDay);
  if (end === 0) end = items.findIndex((i) => i.day !== cutDay);
  if (end === -1) return { items, nextBefore: null };
  return { items: items.slice(0, end), nextBefore: items[end - 1].day };
}
