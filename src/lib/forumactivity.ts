/**
 * Lo que pasa alrededor de un mensaje del foro — SOLO SERVIDOR: qué cita, quién
 * sigue el hilo, quién lo ha leído y a quién hay que avisar.
 *
 * Al publicar (o editar) un mensaje, `afterWrite`:
 *  - guarda sus citas en forum_cites (para «Conversaciones» en las fichas);
 *  - apunta a su autor como seguidor del hilo;
 *  - avisa: a quien contestan ('reply'), a quien nombran con @ ('mention') y a
 *    quien sigue el hilo ('follow'). Un aviso por persona y mensaje, el más
 *    importante (reply > mention > follow), y nunca a uno mismo.
 *  - manda correo a quien lo pidió, solo de respuestas y menciones (lo de los
 *    hilos que sigues, en la web basta).
 */
import { and, desc, eq, gt, inArray, isNull, sql } from 'drizzle-orm';
import { db } from '../db/client';
import { forumCites, forumNotifications, forumPosts, forumReads, forumSubscriptions, forumThreads, profile, user } from '../db/schema';
import { extractCites, extractMentions, plainForumBody } from './forumbody';
import { avisarPorCorreo } from './forummail';

export type ForumNotifKind = 'reply' | 'mention' | 'follow';
const PRIORIDAD: Record<ForumNotifKind, number> = { reply: 3, mention: 2, follow: 1 };

/**
 * A quién avisar de un mensaje nuevo y de qué, sin repetir a nadie ni avisar
 * a quien lo escribe. Pura (tiene tests).
 */
export function recipientsFor(opts: {
  actorId: string;
  /** Autor de lo que se contesta: el mensaje padre o, si va al hilo, quien lo abrió. */
  repliedTo: string | null;
  mentioned: string[];
  followers: string[];
}): Map<string, ForumNotifKind> {
  const out = new Map<string, ForumNotifKind>();
  const poner = (id: string, kind: ForumNotifKind) => {
    if (!id || id === opts.actorId) return;
    const antes = out.get(id);
    if (!antes || PRIORIDAD[kind] > PRIORIDAD[antes]) out.set(id, kind);
  };
  for (const f of opts.followers) poner(f, 'follow');
  for (const m of opts.mentioned) poner(m, 'mention');
  if (opts.repliedTo) poner(opts.repliedTo, 'reply');
  return out;
}

/** Rehace las citas guardadas de un mensaje (postId null: el que abre el hilo). */
export async function syncCites(threadId: number, postId: number | null, body: string): Promise<void> {
  await db
    .delete(forumCites)
    .where(and(eq(forumCites.threadId, threadId), postId == null ? isNull(forumCites.postId) : eq(forumCites.postId, postId)));
  const refs = extractCites(body);
  if (refs.length) await db.insert(forumCites).values(refs.map((r) => ({ threadId, postId, kind: r.kind, ref: r.id })));
}

/** Los ids de cuenta de unos @usuario (los que no existen, fuera). */
export async function usersByName(names: string[]): Promise<Map<string, string>> {
  if (!names.length) return new Map();
  const rows = await db.select({ userId: profile.userId, username: profile.username }).from(profile).where(inArray(profile.username, names));
  return new Map(rows.map((r) => [r.username, r.userId]));
}

/** Los @usuario de unos textos que existen, para enlazarlos al pintar. */
export async function existingMentions(bodies: string[]): Promise<Set<string>> {
  const nombres = [...new Set(bodies.flatMap((b) => extractMentions(b)))];
  return new Set((await usersByName(nombres).catch(() => new Map())).keys());
}

/* ------------------------------------------------------------------ *
 * Seguir hilos y leídos
 * ------------------------------------------------------------------ */

export async function subscribe(userId: string, threadId: number): Promise<void> {
  await db.insert(forumSubscriptions).values({ userId, threadId }).onConflictDoNothing();
}

export async function isSubscribed(userId: string, threadId: number): Promise<boolean> {
  const [r] = await db
    .select({ t: forumSubscriptions.threadId })
    .from(forumSubscriptions)
    .where(and(eq(forumSubscriptions.userId, userId), eq(forumSubscriptions.threadId, threadId)))
    .limit(1);
  return !!r;
}

/** Sigue o deja de seguir un hilo; devuelve si queda siguiéndolo. */
export async function toggleSubscription(userId: string, threadId: number): Promise<boolean> {
  if (await isSubscribed(userId, threadId)) {
    await db.delete(forumSubscriptions).where(and(eq(forumSubscriptions.userId, userId), eq(forumSubscriptions.threadId, threadId)));
    return false;
  }
  await subscribe(userId, threadId);
  return true;
}

/**
 * Apunta que alguien acaba de abrir un hilo y devuelve cuándo lo abrió la vez
 * anterior (null si nunca): la página marca como nuevo lo posterior.
 */
export async function markRead(userId: string, threadId: number): Promise<Date | null> {
  const [antes] = await db
    .select({ readAt: forumReads.readAt })
    .from(forumReads)
    .where(and(eq(forumReads.userId, userId), eq(forumReads.threadId, threadId)))
    .limit(1);
  await db
    .insert(forumReads)
    .values({ userId, threadId, readAt: new Date() })
    .onConflictDoUpdate({ target: [forumReads.userId, forumReads.threadId], set: { readAt: new Date() } });
  return antes?.readAt ?? null;
}

/**
 * Respuestas de otros que alguien no ha visto en cada hilo (solo los que ya
 * había abierto: los demás no se marcan, si no todo el foro saldría «nuevo»).
 */
export async function unreadCounts(userId: string, threadIds: number[]): Promise<Map<number, number>> {
  if (!threadIds.length) return new Map();
  const rows = await db
    .select({ threadId: forumReads.threadId, n: sql<number>`count(${forumPosts.id})::int` })
    .from(forumReads)
    .leftJoin(
      forumPosts,
      and(
        eq(forumPosts.threadId, forumReads.threadId),
        gt(forumPosts.createdAt, forumReads.readAt),
        eq(forumPosts.hidden, false),
        sql`${forumPosts.userId} <> ${userId}`,
      ),
    )
    .where(and(eq(forumReads.userId, userId), inArray(forumReads.threadId, threadIds)))
    .groupBy(forumReads.threadId);
  return new Map(rows.map((r) => [r.threadId, Number(r.n)]));
}

/* ------------------------------------------------------------------ *
 * Después de escribir: citas, seguir y avisos
 * ------------------------------------------------------------------ */

export async function afterWrite(opts: {
  threadId: number;
  postId: number | null;
  actorId: string;
  body: string;
  /** Autor de lo que se contesta (null: el que abre el hilo, que no contesta a nadie). */
  repliedTo: string | null;
  /** Al editar: solo se avisa a los @ nuevos, y no a quien ya sigue el hilo. */
  previousBody?: string;
}): Promise<void> {
  await syncCites(opts.threadId, opts.postId, opts.body);
  const editando = opts.previousBody !== undefined;
  if (!editando) await subscribe(opts.actorId, opts.threadId);

  const antes = new Set(editando ? extractMentions(opts.previousBody!) : []);
  const nombres = extractMentions(opts.body).filter((n) => !antes.has(n));
  const mencionados = [...(await usersByName(nombres)).values()];
  const seguidores = editando
    ? []
    : (await db.select({ u: forumSubscriptions.userId }).from(forumSubscriptions).where(eq(forumSubscriptions.threadId, opts.threadId))).map((r) => r.u);
  const avisos = recipientsFor({
    actorId: opts.actorId,
    repliedTo: editando ? null : opts.repliedTo,
    mentioned: mencionados,
    followers: seguidores,
  });
  if (!avisos.size) return;

  // Al editar, a quien ya tenía aviso de este mensaje no se le manda otro.
  let ya = new Set<string>();
  if (editando) {
    const previos = await db
      .select({ u: forumNotifications.userId })
      .from(forumNotifications)
      .where(
        and(
          eq(forumNotifications.threadId, opts.threadId),
          opts.postId == null ? isNull(forumNotifications.postId) : eq(forumNotifications.postId, opts.postId),
        ),
      );
    ya = new Set(previos.map((p) => p.u));
  }
  const nuevos = [...avisos].filter(([u]) => !ya.has(u));
  if (!nuevos.length) return;
  await db.insert(forumNotifications).values(
    nuevos.map(([userId, kind]) => ({ userId, kind, threadId: opts.threadId, postId: opts.postId, actorId: opts.actorId })),
  );

  const correo = nuevos.filter(([, k]) => k !== 'follow').map(([userId, k]) => ({ userId, mencion: k === 'mention' }));
  if (correo.length) {
    void (async () => {
      const [actor] = await db
        .select({ name: user.name, username: profile.username })
        .from(user)
        .innerJoin(profile, eq(profile.userId, user.id))
        .where(eq(user.id, opts.actorId))
        .limit(1);
      const [hilo] = await db.select({ title: forumThreads.title }).from(forumThreads).where(eq(forumThreads.id, opts.threadId)).limit(1);
      if (!actor || !hilo) return;
      const texto = plainForumBody(opts.body.split('\n').filter((l) => !/^\s*>/.test(l)).join('\n'), new Map());
      await avisarPorCorreo({
        destinatarios: correo,
        actor,
        threadId: opts.threadId,
        threadTitle: hilo.title,
        postId: opts.postId,
        extracto: texto.length > 280 ? `${texto.slice(0, 280).trimEnd()}…` : texto,
      });
    })().catch((e) => console.warn('[foro] correo de aviso no enviado:', e));
  }
}

/* ------------------------------------------------------------------ *
 * Avisos para Notificaciones
 * ------------------------------------------------------------------ */

export interface ForumNotification {
  kind: ForumNotifKind;
  threadId: number;
  threadTitle: string;
  postId: number | null;
  at: Date;
  username: string;
  name: string;
  userId: string;
  hasAvatar: boolean;
  /** Comienzo del mensaje, en bruto (la página lo limpia con plainForumBody). */
  body: string;
}

/** Los avisos del foro de los últimos 90 días, lo más reciente primero (sin lo oculto). */
export async function forumNotificationsFor(userId: string, limit = 60): Promise<ForumNotification[]> {
  const rows = await db
    .select({
      kind: forumNotifications.kind,
      threadId: forumNotifications.threadId,
      threadTitle: forumThreads.title,
      postId: forumNotifications.postId,
      at: forumNotifications.createdAt,
      userId: forumNotifications.actorId,
      username: profile.username,
      name: user.name,
      avatarType: profile.avatarType,
      postBody: forumPosts.body,
      postHidden: forumPosts.hidden,
      threadBody: forumThreads.body,
    })
    .from(forumNotifications)
    .innerJoin(forumThreads, eq(forumThreads.id, forumNotifications.threadId))
    .leftJoin(forumPosts, eq(forumPosts.id, forumNotifications.postId))
    .innerJoin(profile, eq(profile.userId, forumNotifications.actorId))
    .innerJoin(user, eq(user.id, forumNotifications.actorId))
    .where(
      and(
        eq(forumNotifications.userId, userId),
        eq(forumThreads.hidden, false),
        sql`${forumNotifications.createdAt} > now() - interval '90 days'`,
      ),
    )
    .orderBy(desc(forumNotifications.createdAt))
    .limit(limit);
  return rows
    .filter((r) => !r.postHidden)
    .map((r) => ({
      kind: r.kind as ForumNotifKind,
      threadId: r.threadId,
      threadTitle: r.threadTitle,
      postId: r.postId,
      at: r.at,
      username: r.username,
      name: r.name,
      userId: r.userId,
      hasAvatar: !!r.avatarType,
      body: (r.postId ? r.postBody : r.threadBody) ?? '',
    }));
}

/** Cuántos avisos del foro nuevos (desde la última visita a Notificaciones). */
export async function newForumNotificationCount(userId: string, since: Date | null): Promise<number> {
  const [r] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(forumNotifications)
    .where(
      and(
        eq(forumNotifications.userId, userId),
        since ? gt(forumNotifications.createdAt, since) : sql`${forumNotifications.createdAt} > now() - interval '90 days'`,
      ),
    );
  return Number(r?.n ?? 0);
}
