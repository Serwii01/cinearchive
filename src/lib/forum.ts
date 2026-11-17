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
import { forumCites, forumPosts, forumThreads, forumVotes, profile, user } from '../db/schema';
import { afterWrite } from './forumactivity';
import type { CiteKind } from './forumbody';

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
  editedAt: Date | null;
}

export interface Thread extends ThreadSummary {
  body: string;
  tmdbId: number | null;
  editedAt: Date | null;
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
      editedAt: forumThreads.editedAt,
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
      editedAt: forumPosts.editedAt,
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
    editedAt: t.editedAt,
    lastPostAt: t.lastPostAt,
    author: { userId: t.userId, username: t.username, name: t.name, hasAvatar: !!t.avatarType },
    posts: posts.map((p) => ({
      id: p.id,
      parentId: p.parentId,
      body: p.hidden ? '' : p.body,
      score: p.score,
      hidden: p.hidden,
      createdAt: p.createdAt,
      editedAt: p.hidden ? null : p.editedAt,
      author: p.hidden ? SIN_AUTOR : { userId: p.userId, username: p.username, name: p.name, hasAvatar: !!p.avatarType },
    })),
  };
}

export async function createThread(userId: string, t: { category: ForumCategory; title: string; body: string; tmdbId?: number | null }): Promise<number> {
  const [row] = await db
    .insert(forumThreads)
    .values({ userId, category: t.category, title: cleanText(t.title), body: cleanText(t.body), tmdbId: t.tmdbId ?? null })
    .returning({ id: forumThreads.id });
  await afterWrite({ threadId: row.id, postId: null, actorId: userId, body: cleanText(t.body), repliedTo: null });
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
    .select({ id: forumThreads.id, userId: forumThreads.userId })
    .from(forumThreads)
    .where(and(eq(forumThreads.id, threadId), eq(forumThreads.hidden, false)))
    .limit(1);
  if (!hilo) return 'not_found';
  let contestaA = hilo.userId;
  if (parentId != null) {
    const [padre] = await db
      .select({ id: forumPosts.id, userId: forumPosts.userId })
      .from(forumPosts)
      .where(and(eq(forumPosts.id, parentId), eq(forumPosts.threadId, threadId), eq(forumPosts.hidden, false)))
      .limit(1);
    if (!padre) return 'bad_parent';
    contestaA = padre.userId;
  }
  const limpio = cleanText(body);
  const [row] = await db.insert(forumPosts).values({ threadId, parentId, userId, body: limpio }).returning({ id: forumPosts.id });
  await db
    .update(forumThreads)
    .set({ replies: sql`${forumThreads.replies} + 1`, lastPostAt: new Date() })
    .where(eq(forumThreads.id, threadId));
  await afterWrite({ threadId, postId: row.id, actorId: userId, body: limpio, repliedTo: contestaA });
  return row.id;
}

/**
 * Su autor cambia el texto de una respuesta (no de las ocultas). Queda la
 * fecha de edición, se rehacen sus citas y se avisa solo a los @ nuevos.
 */
export async function editPost(userId: string, postId: number, body: string): Promise<{ threadId: number } | 'not_found'> {
  const [p] = await db
    .select({ threadId: forumPosts.threadId, body: forumPosts.body })
    .from(forumPosts)
    .where(and(eq(forumPosts.id, postId), eq(forumPosts.userId, userId), eq(forumPosts.hidden, false)))
    .limit(1);
  if (!p) return 'not_found';
  const limpio = cleanText(body);
  if (limpio === p.body) return { threadId: p.threadId };
  await db.update(forumPosts).set({ body: limpio, editedAt: new Date() }).where(eq(forumPosts.id, postId));
  await afterWrite({ threadId: p.threadId, postId, actorId: userId, body: limpio, repliedTo: null, previousBody: p.body });
  return { threadId: p.threadId };
}

/** Su autor cambia el título o el texto con el que abrió un hilo. */
export async function editThread(userId: string, threadId: number, t: { title: string; body: string }): Promise<boolean> {
  const [h] = await db
    .select({ body: forumThreads.body, title: forumThreads.title })
    .from(forumThreads)
    .where(and(eq(forumThreads.id, threadId), eq(forumThreads.userId, userId), eq(forumThreads.hidden, false)))
    .limit(1);
  if (!h) return false;
  const title = cleanText(t.title);
  const body = cleanText(t.body);
  if (title === h.title && body === h.body) return true;
  await db.update(forumThreads).set({ title, body, editedAt: new Date() }).where(eq(forumThreads.id, threadId));
  await afterWrite({ threadId, postId: null, actorId: userId, body, repliedTo: null, previousBody: h.body });
  return true;
}

/* ------------------------------------------------------------------ *
 * Buscar y enlazar desde fuera del foro
 * ------------------------------------------------------------------ */

export interface ForumHit {
  id: number;
  title: string;
  category: ForumCategory;
  replies: number;
  score: number;
  lastPostAt: Date;
  /** Trozo de texto donde sale la búsqueda (vacío si solo está en el título). */
  snippet: string;
}

/** Escapa los comodines de LIKE para buscar el texto tal cual. Pura. */
export const likeLiteral = (s: string): string => `%${s.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;

/** Un trozo de unos 160 caracteres alrededor de la primera aparición de `q`. Pura. */
export function snippetAround(text: string, q: string, ancho = 160): string {
  const plano = text.replace(/\[\[[a-z]+:[^\]]+\]\]/g, '…').replace(/\[\/?spoiler\]/gi, '').replace(/\s+/g, ' ').trim();
  const i = plano.toLowerCase().indexOf(q.toLowerCase());
  if (i < 0) return '';
  const desde = Math.max(0, i - Math.floor((ancho - q.length) / 2));
  const trozo = plano.slice(desde, desde + ancho).trim();
  return `${desde > 0 ? '…' : ''}${trozo}${desde + ancho < plano.length ? '…' : ''}`;
}

/**
 * Hilos visibles en los que sale `q`: en el título, en el mensaje que lo abre
 * o en alguna respuesta. Para un foro de este tamaño basta con ILIKE; si crece,
 * un índice de texto completo.
 */
export async function searchForum(q: string, limit = 20): Promise<ForumHit[]> {
  const patron = likeLiteral(q.trim());
  const { rows } = await db.execute(sql`
    select t.id, t.title, t.category, t.replies, t.score, t.last_post_at,
           case when t.title ilike ${patron} then '' when t.body ilike ${patron} then t.body
                else (select p.body from forum_posts p where p.thread_id = t.id and p.hidden = false and p.body ilike ${patron} order by p.id limit 1) end as texto
      from forum_threads t
     where t.hidden = false
       and (t.title ilike ${patron} or t.body ilike ${patron}
            or exists (select 1 from forum_posts p where p.thread_id = t.id and p.hidden = false and p.body ilike ${patron}))
     order by (t.title ilike ${patron}) desc, t.last_post_at desc
     limit ${limit}`);
  return (rows as Record<string, unknown>[]).map((r) => ({
    id: Number(r.id),
    title: String(r.title),
    category: String(r.category) as ForumCategory,
    replies: Number(r.replies),
    score: Number(r.score),
    lastPostAt: new Date(String(r.last_post_at)),
    snippet: r.texto ? snippetAround(String(r.texto), q.trim()) : '',
  }));
}

/** Hilos visibles que citan alguna de estas cosas (una película, una revista…), los de más movimiento primero. */
export async function threadsCiting(refs: { kind: CiteKind; ref: string }[], limit = 6): Promise<ThreadSummary[]> {
  if (!refs.length) return [];
  const conds = refs.map((r) => and(eq(forumCites.kind, r.kind), eq(forumCites.ref, r.ref)));
  const ids = await db
    .selectDistinct({ id: forumCites.threadId })
    .from(forumCites)
    .where(conds.length === 1 ? conds[0] : sql`(${sql.join(conds, sql` or `)})`)
    .limit(200);
  if (!ids.length) return [];
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
    .where(and(eq(forumThreads.hidden, false), inArray(forumThreads.id, ids.map((i) => i.id))))
    .orderBy(desc(forumThreads.lastPostAt))
    .limit(limit);
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

