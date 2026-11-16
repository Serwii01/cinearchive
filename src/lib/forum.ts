/**
 * Foro — SOLO SERVIDOR. Hilos por categoría y sus respuestas.
 *
 * Lo que se escribe en el foro es público aunque el perfil sea privado: es una
 * conversación abierta, no actividad personal (la página lo avisa antes de
 * escribir). Para escribir hace falta cuenta con perfil (@usuario), como para
 * dar «me gusta» o seguir: sin nombre no hay a quién responder.
 *
 * Borrar es ocultar (`hidden`): lo puede hacer el autor o un administrador, y
 * así los enlaces a un hilo no se rompen ni las respuestas quedan huérfanas.
 */
import { and, asc, desc, eq, sql } from 'drizzle-orm';
import { db } from '../db/client';
import { forumPosts, forumThreads, profile, user } from '../db/schema';

export const FORUM_CATEGORIES = ['general', 'peliculas', 'cineclub', 'recomendaciones'] as const;
export type ForumCategory = (typeof FORUM_CATEGORIES)[number];
export const isForumCategory = (c: unknown): c is ForumCategory => FORUM_CATEGORIES.includes(c as ForumCategory);

export const TITLE_MIN = 4;
export const TITLE_MAX = 140;
export const BODY_MAX = 5000;
export const THREADS_PAGE = 30;

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
  createdAt: Date;
  lastPostAt: Date;
}

const autor = {
  userId: forumThreads.userId,
  username: profile.username,
  name: user.name,
  avatarType: profile.avatarType,
};

/** Hilos visibles, del de movimiento más reciente al más antiguo. */
export async function listThreads(opts: { category?: ForumCategory; page?: number; limit?: number } = {}): Promise<ThreadSummary[]> {
  const limit = opts.limit ?? THREADS_PAGE;
  const page = Math.max(1, opts.page ?? 1);
  const rows = await db
    .select({
      id: forumThreads.id,
      category: forumThreads.category,
      title: forumThreads.title,
      replies: forumThreads.replies,
      createdAt: forumThreads.createdAt,
      lastPostAt: forumThreads.lastPostAt,
      ...autor,
    })
    .from(forumThreads)
    .innerJoin(profile, eq(profile.userId, forumThreads.userId))
    .innerJoin(user, eq(user.id, forumThreads.userId))
    .where(and(eq(forumThreads.hidden, false), opts.category ? eq(forumThreads.category, opts.category) : undefined))
    .orderBy(desc(forumThreads.lastPostAt))
    .limit(limit)
    .offset((page - 1) * limit);
  return rows.map((r) => ({
    id: r.id,
    category: r.category as ForumCategory,
    title: r.title,
    replies: r.replies,
    createdAt: r.createdAt,
    lastPostAt: r.lastPostAt,
    author: { userId: r.userId, username: r.username, name: r.name, hasAvatar: !!r.avatarType },
  }));
}

export interface ForumPost {
  id: number;
  body: string;
  author: ForumAuthor;
  createdAt: Date;
}

export interface Thread extends ThreadSummary {
  body: string;
  tmdbId: number | null;
  posts: ForumPost[];
}

/** Un hilo con sus respuestas visibles; null si no existe o está oculto. */
export async function getThread(id: number): Promise<Thread | null> {
  const [t] = await db
    .select({
      id: forumThreads.id,
      category: forumThreads.category,
      title: forumThreads.title,
      body: forumThreads.body,
      tmdbId: forumThreads.tmdbId,
      replies: forumThreads.replies,
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
      body: forumPosts.body,
      createdAt: forumPosts.createdAt,
      userId: forumPosts.userId,
      username: profile.username,
      name: user.name,
      avatarType: profile.avatarType,
    })
    .from(forumPosts)
    .innerJoin(profile, eq(profile.userId, forumPosts.userId))
    .innerJoin(user, eq(user.id, forumPosts.userId))
    .where(and(eq(forumPosts.threadId, id), eq(forumPosts.hidden, false)))
    .orderBy(asc(forumPosts.id))
    .limit(500);
  return {
    id: t.id,
    category: t.category as ForumCategory,
    title: t.title,
    body: t.body,
    tmdbId: t.tmdbId,
    replies: t.replies,
    createdAt: t.createdAt,
    lastPostAt: t.lastPostAt,
    author: { userId: t.userId, username: t.username, name: t.name, hasAvatar: !!t.avatarType },
    posts: posts.map((p) => ({
      id: p.id,
      body: p.body,
      createdAt: p.createdAt,
      author: { userId: p.userId, username: p.username, name: p.name, hasAvatar: !!p.avatarType },
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

/** Responde a un hilo visible. Devuelve el id de la respuesta, o null si el hilo no existe. */
export async function replyToThread(userId: string, threadId: number, body: string): Promise<number | null> {
  const [hilo] = await db
    .select({ id: forumThreads.id })
    .from(forumThreads)
    .where(and(eq(forumThreads.id, threadId), eq(forumThreads.hidden, false)))
    .limit(1);
  if (!hilo) return null;
  const [row] = await db.insert(forumPosts).values({ threadId, userId, body: cleanText(body) }).returning({ id: forumPosts.id });
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
