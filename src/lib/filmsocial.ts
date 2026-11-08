/**
 * La parte social de la ficha de una película y los «me gusta» — SOLO SERVIDOR.
 *
 * Privacidad, la misma regla que en los perfiles (canViewActivity en
 * social.ts): de alguien se ve lo que hace si su perfil es público, si eres tú
 * o si le sigues y te ha aceptado. Sin perfil (sin @usuario) no se participa en
 * la red social, así que lo suyo no sale aquí.
 */
import { sql } from 'drizzle-orm';
import { db } from '../db/client';

export interface FilmReview {
  userId: string;
  username: string;
  name: string;
  hasAvatar: boolean;
  isPrivate: boolean;
  rating: number | null;
  note: string;
  reviewedAt: Date | null;
  likes: number;
  likedByMe: boolean;
}

/** Condición SQL: el visor puede ver la actividad del autor (alias de perfil «p»). */
const visible = (viewerId: string | null) =>
  viewerId
    ? sql`(p.is_private = false or p.user_id = ${viewerId} or exists (
        select 1 from follows f where f.follower_id = ${viewerId} and f.following_id = p.user_id and f.status = 'accepted'))`
    : sql`p.is_private = false`;

/** Reseñas con texto de una película que el visor puede ver, de la más reciente a la más antigua. */
export async function filmReviews(tmdbId: number, viewerId: string | null, limit = 30): Promise<FilmReview[]> {
  const { rows } = await db.execute(sql`
    select uf.user_id, p.username, u.name, (p.avatar_type is not null) as has_avatar, p.is_private,
           uf.rating, uf.note, uf.reviewed_at,
           (select count(*)::int from review_likes l where l.author_id = uf.user_id and l.tmdb_id = uf.tmdb_id) as likes,
           ${viewerId ? sql`exists (select 1 from review_likes l where l.user_id = ${viewerId} and l.author_id = uf.user_id and l.tmdb_id = uf.tmdb_id)` : sql`false`} as liked
      from user_films uf
      join profile p on p.user_id = uf.user_id
      join "user" u on u.id = uf.user_id
     where uf.tmdb_id = ${tmdbId}
       and uf.note is not null and length(trim(uf.note)) > 0
       and ${visible(viewerId)}
     order by uf.reviewed_at desc nulls last, uf.updated_at desc
     limit ${limit}`);
  return (rows as Record<string, unknown>[]).map((r) => ({
    userId: String(r.user_id),
    username: String(r.username),
    name: String(r.name ?? r.username),
    hasAvatar: !!r.has_avatar,
    isPrivate: !!r.is_private,
    rating: r.rating == null ? null : Number(r.rating),
    note: String(r.note),
    reviewedAt: r.reviewed_at ? new Date(String(r.reviewed_at)) : null,
    likes: Number(r.likes ?? 0),
    likedByMe: !!r.liked,
  }));
}

export interface FollowedViewer {
  username: string;
  name: string;
  userId: string;
  hasAvatar: boolean;
  rating: number | null;
}

/**
 * Quienes sigue el visor (y le han aceptado) que han visto la película o la han
 * puntuado. Seguir con aceptación ya da permiso para ver su actividad.
 */
export async function followedWhoWatched(tmdbId: number, viewerId: string, limit = 12): Promise<{ people: FollowedViewer[]; total: number }> {
  const { rows } = await db.execute(sql`
    select p.username, u.name, uf.user_id, (p.avatar_type is not null) as has_avatar, uf.rating,
           count(*) over ()::int as total
      from follows f
      join user_films uf on uf.user_id = f.following_id and uf.tmdb_id = ${tmdbId}
      join profile p on p.user_id = f.following_id
      join "user" u on u.id = f.following_id
     where f.follower_id = ${viewerId} and f.status = 'accepted'
       and (uf.status = 'seen' or uf.rating is not null)
     order by uf.rating desc nulls last, uf.updated_at desc
     limit ${limit}`);
  const list = rows as Record<string, unknown>[];
  return {
    total: Number(list[0]?.total ?? 0),
    people: list.map((r) => ({
      username: String(r.username),
      name: String(r.name ?? r.username),
      userId: String(r.user_id),
      hasAvatar: !!r.has_avatar,
      rating: r.rating == null ? null : Number(r.rating),
    })),
  };
}

/* ------------------------------------------------------------------ *
 * «Me gusta»
 * ------------------------------------------------------------------ */

/**
 * Pone o quita el «me gusta» de una reseña. Solo si la reseña existe, el visor
 * puede verla y no es suya. Devuelve el estado nuevo y el total, o null si no se
 * puede.
 */
export async function toggleReviewLike(viewerId: string, authorId: string, tmdbId: number): Promise<{ liked: boolean; likes: number } | null> {
  if (viewerId === authorId) return null;
  const { rows } = await db.execute(sql`
    select 1 from user_films uf join profile p on p.user_id = uf.user_id
     where uf.user_id = ${authorId} and uf.tmdb_id = ${tmdbId}
       and uf.note is not null and length(trim(uf.note)) > 0
       and ${visible(viewerId)}`);
  if (!rows.length) return null;
  const { rowCount } = await db.execute(sql`
    delete from review_likes where user_id = ${viewerId} and author_id = ${authorId} and tmdb_id = ${tmdbId}`);
  if (!rowCount) {
    await db.execute(sql`
      insert into review_likes (user_id, author_id, tmdb_id) values (${viewerId}, ${authorId}, ${tmdbId})
      on conflict do nothing`);
  }
  const { rows: c } = await db.execute(sql`
    select count(*)::int as n from review_likes where author_id = ${authorId} and tmdb_id = ${tmdbId}`);
  return { liked: !rowCount, likes: Number((c[0] as { n: number }).n) };
}

/** Pone o quita el «me gusta» de una lista pública que no es del visor. */
export async function toggleListLike(viewerId: string, listId: string): Promise<{ liked: boolean; likes: number } | null> {
  const { rows } = await db.execute(sql`
    select 1 from user_lists where id = ${listId} and is_public = true and user_id <> ${viewerId}`);
  if (!rows.length) return null;
  const { rowCount } = await db.execute(sql`delete from list_likes where user_id = ${viewerId} and list_id = ${listId}`);
  if (!rowCount) await db.execute(sql`insert into list_likes (user_id, list_id) values (${viewerId}, ${listId}) on conflict do nothing`);
  const { rows: c } = await db.execute(sql`select count(*)::int as n from list_likes where list_id = ${listId}`);
  return { liked: !rowCount, likes: Number((c[0] as { n: number }).n) };
}

/** Total de «me gusta» de una reseña y si el visor ya le ha dado. */
export async function reviewLikeState(authorId: string, tmdbId: number, viewerId: string | null): Promise<{ likes: number; liked: boolean }> {
  const { rows } = await db.execute(sql`
    select count(*)::int as n,
           ${viewerId ? sql`bool_or(user_id = ${viewerId})` : sql`false`} as liked
      from review_likes where author_id = ${authorId} and tmdb_id = ${tmdbId}`);
  const r = rows[0] as { n: number; liked: boolean | null };
  return { likes: Number(r?.n ?? 0), liked: !!r?.liked };
}

/** Lo mismo para una lista. */
export async function listLikeState(listId: string, viewerId: string | null): Promise<{ likes: number; liked: boolean }> {
  const { rows } = await db.execute(sql`
    select count(*)::int as n,
           ${viewerId ? sql`bool_or(user_id = ${viewerId})` : sql`false`} as liked
      from list_likes where list_id = ${listId}`);
  const r = rows[0] as { n: number; liked: boolean | null };
  return { likes: Number(r?.n ?? 0), liked: !!r?.liked };
}

export interface LikeNotification {
  kind: 'review' | 'list';
  at: Date;
  username: string;
  name: string;
  userId: string;
  hasAvatar: boolean;
  /** Reseña: la película. Lista: su id y nombre. */
  tmdbId?: number;
  listId?: string;
  listName?: string;
}

/** «Me gusta» recibidos en tus reseñas y listas (los de los últimos 90 días). */
export async function likeNotifications(userId: string, limit = 60): Promise<LikeNotification[]> {
  const { rows } = await db.execute(sql`
    select * from (
      select 'review' as kind, l.created_at as at, p.username, u.name, l.user_id, (p.avatar_type is not null) as has_avatar,
             l.tmdb_id, null::text as list_id, null::text as list_name
        from review_likes l join profile p on p.user_id = l.user_id join "user" u on u.id = l.user_id
       where l.author_id = ${userId} and l.created_at > now() - interval '90 days'
      union all
      select 'list', l.created_at, p.username, u.name, l.user_id, (p.avatar_type is not null),
             null::int, ul.id, ul.name
        from list_likes l join user_lists ul on ul.id = l.list_id
        join profile p on p.user_id = l.user_id join "user" u on u.id = l.user_id
       where ul.user_id = ${userId} and l.created_at > now() - interval '90 days'
    ) x order by at desc limit ${limit}`);
  return (rows as Record<string, unknown>[]).map((r) => ({
    kind: r.kind === 'list' ? 'list' : 'review',
    at: new Date(String(r.at)),
    username: String(r.username),
    name: String(r.name ?? r.username),
    userId: String(r.user_id),
    hasAvatar: !!r.has_avatar,
    tmdbId: r.tmdb_id == null ? undefined : Number(r.tmdb_id),
    listId: r.list_id == null ? undefined : String(r.list_id),
    listName: r.list_name == null ? undefined : String(r.list_name),
  }));
}

/** Cuántos «me gusta» nuevos (desde que abrió las notificaciones por última vez). */
export async function newLikeCount(userId: string, since: Date | null): Promise<number> {
  const desde = since ?? new Date(0);
  const { rows } = await db.execute(sql`
    select (select count(*) from review_likes where author_id = ${userId} and created_at > ${desde})
         + (select count(*) from list_likes l join user_lists ul on ul.id = l.list_id
             where ul.user_id = ${userId} and l.created_at > ${desde}) as n`);
  return Number((rows[0] as { n: number | string }).n ?? 0);
}
