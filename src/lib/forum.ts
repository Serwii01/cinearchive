/**
 * Foro — SOLO SERVIDOR. Hilos por categoría, respuestas en árbol y votos.
 *
 * Lo que se escribe en el foro es público aunque el perfil sea privado: es una
 * conversación abierta, no actividad personal (la página lo avisa antes de
 * escribir). Para escribir o votar hace falta cuenta con perfil (@usuario),
 * como para dar «me gusta» o seguir: sin nombre no hay a quién responder.
 *
 * Borrar es ocultar (`hidden`): lo puede hacer el autor o un administrador, y
 * así los enlaces a un hilo no se rompen ni las respuestas quedan huérfanas.
 */
import { and, asc, desc, eq, inArray, sql } from 'drizzle-orm';
import { db } from '../db/client';
import { forumPosts, forumThreads, forumVotes, profile, user } from '../db/schema';

export const FORUM_CATEGORIES = ['general', 'peliculas', 'cineclub', 'recomendaciones'] as const;
export type ForumCategory = (typeof FORUM_CATEGORIES)[number];
export const isForumCategory = (c: unknown): c is ForumCategory => FORUM_CATEGORIES.includes(c as ForumCategory);

/** Orden de la lista de hilos: con movimiento reciente, recién abiertos o más votados. */
export const THREAD_SORTS = ['active', 'new', 'top'] as const;
export type ThreadSort = (typeof THREAD_SORTS)[number];
export const isThreadSort = (s: unknown): s is ThreadSort => THREAD_SORTS.includes(s as ThreadSort);

export const TITLE_MIN = 4;
export const TITLE_MAX = 140;
export const BODY_MAX = 5000;
export const THREADS_PAGE = 30;
/** Un hilo enseña hasta aquí: más no se lee, y protege la página de un hilo desbocado. */
export const POSTS_MAX = 800;

/** Texto limpio para guardar: sin espacios de sobra ni más de dos saltos seguidos. Pura. */
export function cleanText(s: string): string {
  return s
    .replace(/\r\n?/g, '\n')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/** null si vale; si no, el motivo ('title' | 'body' | 'category'). Pura. */
export function validateThread(t: { title: string; body: string; category: string }): 'title' | 'body' | 'category' | null {
  if (!isForumCategory(t.category)) return 'category';
  const title = cleanText(t.title);
  if (title.length < TITLE_MIN || title.length > TITLE_MAX || title.includes('\n')) return 'title';
  const body = cleanText(t.body);
  if (!body || body.length > BODY_MAX) return 'body';
  return null;
}

export interface ForumAuthor {
  userId: string;
  username: string;
  name: string;
  hasAvatar: boolean;
}

export interface ThreadSummary {
  id: number;
  category: ForumCategory;
  title: string;
  author: ForumAuthor;
  replies: number;
  score: number;
  createdAt: Date;
  lastPostAt: Date;
}

const autor = {
  userId: forumThreads.userId,
  username: profile.username,
  name: user.name,
  avatarType: profile.avatarType,
};

const ordenHilos = (sort: ThreadSort) =>
  sort === 'new'
    ? [desc(forumThreads.createdAt)]
    : sort === 'top'
      ? [desc(forumThreads.score), desc(forumThreads.lastPostAt)]
      : [desc(forumThreads.lastPostAt)];

/** Hilos visibles, en el orden pedido (por defecto, el de movimiento más reciente primero). */
export async function listThreads(
  opts: { category?: ForumCategory; page?: number; limit?: number; sort?: ThreadSort } = {},
): Promise<ThreadSummary[]> {
  const limit = opts.limit ?? THREADS_PAGE;
  const page = Math.max(1, opts.page ?? 1);
  const rows = await db
    .select({
      id: forumThreads.id,
      category: forumThreads.category,
      title: forumThreads.title,
      replies: forumThreads.replies,
      score: forumThreads.score,
      createdAt: forumThreads.createdAt,
      lastPostAt: forumThreads.lastPostAt,
      ...autor,
    })
    .from(forumThreads)
    .innerJoin(profile, eq(profile.userId, forumThreads.userId))
    .innerJoin(user, eq(user.id, forumThreads.userId))
    .where(and(eq(forumThreads.hidden, false), opts.category ? eq(forumThreads.category, opts.category) : undefined))
    .orderBy(...ordenHilos(opts.sort ?? 'active'), desc(forumThreads.id))
    .limit(limit)
    .offset((page - 1) * limit);
  return rows.map((r) => ({
    id: r.id,
    category: r.category as ForumCategory,
    title: r.title,
    replies: r.replies,
    score: r.score,
    createdAt: r.createdAt,
    lastPostAt: r.lastPostAt,
    author: { userId: r.userId, username: r.username, name: r.name, hasAvatar: !!r.avatarType },
  }));
}

export interface ForumPost {
  id: number;
  parentId: number | null;
  /** Vacío si está oculta: solo se devuelve para mantener el árbol. */
  body: string;
  score: number;
  hidden: boolean;
  author: ForumAuthor;
  createdAt: Date;
}

export interface Thread extends ThreadSummary {
  body: string;
  tmdbId: number | null;
  posts: ForumPost[];
}

const SIN_AUTOR: ForumAuthor = { userId: '', username: '', name: '', hasAvatar: false };

/**
 * Un hilo con todas sus respuestas (también las ocultas, sin texto ni autor,
 * para que lib/forumtree.ts sepa colgar lo que haya debajo); null si el hilo
 * no existe o está oculto.
 */
export async function getThread(id: number): Promise<Thread | null> {
  const [t] = await db
    .select({
      id: forumThreads.id,
      category: forumThreads.category,
      title: forumThreads.title,
      body: forumThreads.body,
      tmdbId: forumThreads.tmdbId,
      replies: forumThreads.replies,
      score: forumThreads.score,
      createdAt: forumThreads.createdAt,
      lastPostAt: forumThreads.lastPostAt,
      ...autor,
    })
    .from(forumThreads)
    .innerJoin(profile, eq(profile.userId, forumThreads.userId))
    .innerJoin(user, eq(user.id, forumThreads.userId))
    .where(and(eq(forumThreads.id, id), eq(forumThreads.hidden, false)))
    .limit(1);
  if (!t) return null;
  const posts = await db
    .select({
      id: forumPosts.id,
      parentId: forumPosts.parentId,
      body: forumPosts.body,
      score: forumPosts.score,
      hidden: forumPosts.hidden,
      createdAt: forumPosts.createdAt,
      userId: forumPosts.userId,
      username: profile.username,
      name: user.name,
      avatarType: profile.avatarType,
    })
    .from(forumPosts)
    .innerJoin(profile, eq(profile.userId, forumPosts.userId))
    .innerJoin(user, eq(user.id, forumPosts.userId))
    .where(eq(forumPosts.threadId, id))
    .orderBy(asc(forumPosts.id))
    .limit(POSTS_MAX);
  return {
    id: t.id,
    category: t.category as ForumCategory,
    title: t.title,
    body: t.body,
    tmdbId: t.tmdbId,
    replies: t.replies,
    score: t.score,
    createdAt: t.createdAt,
    lastPostAt: t.lastPostAt,
    author: { userId: t.userId, username: t.username, name: t.name, hasAvatar: !!t.avatarType },
    posts: posts.map((p) => ({
      id: p.id,
      parentId: p.parentId,
      body: p.hidden ? '' : p.body,
      score: p.score,
      hidden: p.hidden,
      createdAt: p.createdAt,
      author: p.hidden ? SIN_AUTOR : { userId: p.userId, username: p.username, name: p.name, hasAvatar: !!p.avatarType },
    })),
  };
}

export async function createThread(userId: string, t: { category: ForumCategory; title: string; body: string; tmdbId?: number | null }): Promise<number> {
  const [row] = await db
    .insert(forumThreads)
    .values({ userId, category: t.category, title: cleanText(t.title), body: cleanText(t.body), tmdbId: t.tmdbId ?? null })
    .returning({ id: forumThreads.id });
  return row.id;
}

/**
 * Responde a un hilo visible, o a una de sus respuestas si llega `parentId`
 * (tiene que ser del mismo hilo y estar visible: no se contesta a lo retirado).
 * Devuelve el id de la respuesta, 'not_found' si el hilo no existe o
 * 'bad_parent' si la respuesta a la que contesta no vale.
 */
export async function replyToThread(
  userId: string,
  threadId: number,
  body: string,
  parentId: number | null = null,
): Promise<number | 'not_found' | 'bad_parent'> {
  const [hilo] = await db
    .select({ id: forumThreads.id })
    .from(forumThreads)
    .where(and(eq(forumThreads.id, threadId), eq(forumThreads.hidden, false)))
    .limit(1);
  if (!hilo) return 'not_found';
  if (parentId != null) {
    const [padre] = await db
      .select({ id: forumPosts.id })
      .from(forumPosts)
      .where(and(eq(forumPosts.id, parentId), eq(forumPosts.threadId, threadId), eq(forumPosts.hidden, false)))
      .limit(1);
    if (!padre) return 'bad_parent';
  }
  const [row] = await db.insert(forumPosts).values({ threadId, parentId, userId, body: cleanText(body) }).returning({ id: forumPosts.id });
  await db
    .update(forumThreads)
    .set({ replies: sql`${forumThreads.replies} + 1`, lastPostAt: new Date() })
    .where(eq(forumThreads.id, threadId));
  return row.id;
}

/** Oculta un hilo (autor o administrador). */
export async function hideThread(threadId: number, by: { userId: string; admin: boolean }): Promise<boolean> {
  const res = await db
    .update(forumThreads)
    .set({ hidden: true })
    .where(and(eq(forumThreads.id, threadId), by.admin ? undefined : eq(forumThreads.userId, by.userId)))
    .returning({ id: forumThreads.id });
  return res.length > 0;
}

/** Oculta una respuesta (autor o administrador) y descuenta el total del hilo. */
export async function hidePost(postId: number, by: { userId: string; admin: boolean }): Promise<boolean> {
  const res = await db
    .update(forumPosts)
    .set({ hidden: true })
    .where(and(eq(forumPosts.id, postId), eq(forumPosts.hidden, false), by.admin ? undefined : eq(forumPosts.userId, by.userId)))
    .returning({ threadId: forumPosts.threadId });
  if (!res.length) return false;
  await db
    .update(forumThreads)
    .set({ replies: sql`greatest(${forumThreads.replies} - 1, 0)` })
    .where(eq(forumThreads.id, res[0].threadId));
  return true;
}

/* ------------------------------------------------------------------ *
 * Votos
 * ------------------------------------------------------------------ */

export type VoteKind = 'thread' | 'post';
export const voteKey = (kind: VoteKind, id: number): string => `${kind}:${id}`;

/**
 * Pone o quita el voto de una persona (un clic vota, otro lo retira).
 * Devuelve el estado nuevo y la puntuación, 'not_found' si el mensaje no
 * existe o está oculto, y 'own' si es suyo: votarse a uno mismo no dice nada.
 *
 * El contador se mueve en la misma transacción que la fila del voto; si dos
 * clics llegan a la vez, la clave primaria hace que solo cuente uno.
 */
export async function toggleVote(
  userId: string,
  kind: VoteKind,
  targetId: number,
): Promise<{ voted: boolean; score: number } | 'not_found' | 'own'> {
  const tabla = kind === 'thread' ? forumThreads : forumPosts;
  const [obj] = await db
    .select({ userId: tabla.userId })
    .from(tabla)
    .where(and(eq(tabla.id, targetId), eq(tabla.hidden, false)))
    .limit(1);
  if (!obj) return 'not_found';
  if (obj.userId === userId) return 'own';
  return db.transaction(async (tx) => {
    const puesto = await tx
      .insert(forumVotes)
      .values({ userId, kind, targetId })
      .onConflictDoNothing()
      .returning({ t: forumVotes.targetId });
    const voted = puesto.length > 0;
    if (!voted) {
      await tx.delete(forumVotes).where(and(eq(forumVotes.userId, userId), eq(forumVotes.kind, kind), eq(forumVotes.targetId, targetId)));
    }
    const [r] = await tx
      .update(tabla)
      .set({ score: voted ? sql`${tabla.score} + 1` : sql`greatest(${tabla.score} - 1, 0)` })
      .where(eq(tabla.id, targetId))
      .returning({ score: tabla.score });
    return { voted, score: r?.score ?? 0 };
  });
}

/** Qué ha votado alguien en un hilo (el hilo y sus respuestas), como claves voteKey. */
export async function myVotesIn(userId: string, threadId: number, postIds: number[]): Promise<Set<string>> {
  const deHilo = and(eq(forumVotes.kind, 'thread'), eq(forumVotes.targetId, threadId));
  const deRespuestas = postIds.length ? and(eq(forumVotes.kind, 'post'), inArray(forumVotes.targetId, postIds)) : undefined;
  const rows = await db
    .select({ kind: forumVotes.kind, targetId: forumVotes.targetId })
    .from(forumVotes)
    .where(and(eq(forumVotes.userId, userId), deRespuestas ? sql`(${deHilo} or ${deRespuestas})` : deHilo));
  return new Set(rows.map((r) => voteKey(r.kind as VoteKind, r.targetId)));
}

/* ------------------------------------------------------------------ *
 * Avisos: respuestas a mis hilos y a mis mensajes
 * ------------------------------------------------------------------ */

export interface ForumReplyNotification {
  postId: number;
  threadId: number;
  threadTitle: string;
  /** 'thread': contestan a tu hilo; 'post': a un mensaje tuyo. */
  to: 'thread' | 'post';
  at: Date;
  username: string;
  name: string;
  userId: string;
  hasAvatar: boolean;
  excerpt: string;
}

/**
 * Respuestas de otras personas a mis hilos (directas al hilo) o a mis
 * mensajes, visibles. Común al listado y al contador.
 */
const respuestasAMi = (userId: string) => sql`
      from forum_posts r
      join forum_threads t on t.id = r.thread_id
      left join forum_posts padre on padre.id = r.parent_id
     where r.hidden = false and t.hidden = false and r.user_id <> ${userId}
       and ((r.parent_id is null and t.user_id = ${userId}) or padre.user_id = ${userId})`;

/**
 * Lo que otras personas han contestado a tus hilos o a tus mensajes en los
 * últimos 90 días. Sale de las propias respuestas, sin tabla de avisos: lo
 * nuevo es lo posterior a la última visita a Notificaciones.
 */
export async function forumReplyNotifications(userId: string, limit = 60): Promise<ForumReplyNotification[]> {
  const { rows } = await db.execute(sql`
    select x.*, pr.username, u.name, (pr.avatar_type is not null) as has_avatar from (
      select r.id as post_id, r.thread_id, t.title, (r.parent_id is null) as to_thread, r.created_at as at,
             r.user_id, left(r.body, 240) as excerpt
      ${respuestasAMi(userId)}
         and r.created_at > now() - interval '90 days'
       order by r.created_at desc
       limit ${limit}
    ) x
    join profile pr on pr.user_id = x.user_id
    join "user" u on u.id = x.user_id
    order by x.at desc`);
  return (rows as Record<string, unknown>[]).map((r) => ({
    postId: Number(r.post_id),
    threadId: Number(r.thread_id),
    threadTitle: String(r.title),
    to: r.to_thread ? 'thread' : 'post',
    at: new Date(String(r.at)),
    username: String(r.username),
    name: String(r.name ?? r.username),
    userId: String(r.user_id),
    hasAvatar: !!r.has_avatar,
    excerpt: String(r.excerpt ?? ''),
  }));
}

/** Cuántas respuestas nuevas desde la última visita a Notificaciones (o en 90 días si nunca fue). */
export async function newForumReplyCount(userId: string, since: Date | null): Promise<number> {
  const desde = since ?? new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
  const { rows } = await db.execute(sql`select count(*) as n ${respuestasAMi(userId)} and r.created_at > ${desde}`);
  return Number((rows[0] as { n: number | string }).n ?? 0);
}
