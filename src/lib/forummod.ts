/**
 * Moderación del foro — SOLO SERVIDOR: denuncias y cuentas bloqueadas.
 *
 * Cualquiera con perfil puede denunciar un hilo o una respuesta (una vez cada
 * uno). Un administrador las ve agrupadas por mensaje en /foro/moderacion y
 * decide: dejarlo ('dismiss'), ocultarlo ('hide') u ocultarlo y bloquear a su
 * autor ('ban'). Bloquear es dejar de poder escribir y votar; leer, sí.
 */
import { and, asc, desc, eq, inArray, isNull, sql } from 'drizzle-orm';
import { db } from '../db/client';
import { forumBans, forumPosts, forumReports, forumThreads, profile, user } from '../db/schema';
import type { VoteKind } from './forum';

export const REPORT_REASONS = ['spam', 'offensive', 'spoiler', 'other'] as const;
export type ReportReason = (typeof REPORT_REASONS)[number];
export const isReportReason = (r: unknown): r is ReportReason => REPORT_REASONS.includes(r as ReportReason);
export const REPORT_NOTE_MAX = 500;

export type ModAction = 'dismiss' | 'hide' | 'ban';

async function autorDe(kind: VoteKind, id: number): Promise<{ userId: string; hidden: boolean } | null> {
  const tabla = kind === 'thread' ? forumThreads : forumPosts;
  const [r] = await db.select({ userId: tabla.userId, hidden: tabla.hidden }).from(tabla).where(eq(tabla.id, id)).limit(1);
  return r ?? null;
}

/** Denuncia un mensaje visible de otra persona. 'duplicate' si ya lo había denunciado. */
export async function reportContent(
  reporterId: string,
  kind: VoteKind,
  targetId: number,
  reason: ReportReason,
  note: string | null,
): Promise<'ok' | 'not_found' | 'own' | 'duplicate'> {
  const a = await autorDe(kind, targetId);
  if (!a || a.hidden) return 'not_found';
  if (a.userId === reporterId) return 'own';
  const r = await db
    .insert(forumReports)
    .values({ reporterId, kind, targetId, reason, note: note?.trim().slice(0, REPORT_NOTE_MAX) || null })
    .onConflictDoNothing()
    .returning({ id: forumReports.id });
  return r.length ? 'ok' : 'duplicate';
}

export interface PendingReport {
  kind: VoteKind;
  targetId: number;
  threadId: number;
  threadTitle: string;
  body: string;
  hidden: boolean;
  author: { userId: string; username: string; name: string; banned: boolean };
  firstAt: Date;
  reports: { reason: ReportReason; note: string | null; reporter: string; at: Date }[];
}

/** Las denuncias sin resolver, agrupadas por mensaje, de la más antigua a la más reciente. */
export async function pendingReports(): Promise<PendingReport[]> {
  const filas = await db
    .select({
      kind: forumReports.kind,
      targetId: forumReports.targetId,
      reason: forumReports.reason,
      note: forumReports.note,
      at: forumReports.createdAt,
      reporter: profile.username,
    })
    .from(forumReports)
    .innerJoin(profile, eq(profile.userId, forumReports.reporterId))
    .where(isNull(forumReports.resolvedAt))
    .orderBy(asc(forumReports.createdAt))
    .limit(500);
  const grupos = new Map<string, PendingReport>();
  const hilos = [...new Set(filas.filter((f) => f.kind === 'thread').map((f) => f.targetId))];
  const posts = [...new Set(filas.filter((f) => f.kind === 'post').map((f) => f.targetId))];
  const datosHilos = hilos.length
    ? await db
        .select({ id: forumThreads.id, threadId: forumThreads.id, title: forumThreads.title, body: forumThreads.body, hidden: forumThreads.hidden, userId: forumThreads.userId })
        .from(forumThreads)
        .where(inArray(forumThreads.id, hilos))
    : [];
  const datosPosts = posts.length
    ? await db
        .select({ id: forumPosts.id, threadId: forumPosts.threadId, title: forumThreads.title, body: forumPosts.body, hidden: forumPosts.hidden, userId: forumPosts.userId })
        .from(forumPosts)
        .innerJoin(forumThreads, eq(forumThreads.id, forumPosts.threadId))
        .where(inArray(forumPosts.id, posts))
    : [];
  const autores = [...new Set([...datosHilos, ...datosPosts].map((d) => d.userId))];
  const infoAutores = autores.length
    ? await db
        .select({ userId: user.id, name: user.name, username: profile.username, banned: forumBans.userId })
        .from(user)
        .innerJoin(profile, eq(profile.userId, user.id))
        .leftJoin(forumBans, eq(forumBans.userId, user.id))
        .where(inArray(user.id, autores))
    : [];
  const autor = new Map(infoAutores.map((a) => [a.userId, a]));
  const datos = new Map<string, (typeof datosPosts)[number]>([
    ...datosHilos.map((d) => [`thread:${d.id}`, d] as const),
    ...datosPosts.map((d) => [`post:${d.id}`, d] as const),
  ]);
  for (const f of filas) {
    const clave = `${f.kind}:${f.targetId}`;
    const d = datos.get(clave);
    if (!d) continue;
    let g = grupos.get(clave);
    if (!g) {
      const a = autor.get(d.userId);
      g = {
        kind: f.kind as VoteKind,
        targetId: f.targetId,
        threadId: d.threadId,
        threadTitle: d.title,
        body: d.body,
        hidden: d.hidden,
        author: { userId: d.userId, username: a?.username ?? '?', name: a?.name ?? '?', banned: !!a?.banned },
        firstAt: f.at,
        reports: [],
      };
      grupos.set(clave, g);
    }
    g.reports.push({ reason: f.reason as ReportReason, note: f.note, reporter: f.reporter, at: f.at });
  }
  return [...grupos.values()];
}

/** Cuántas denuncias hay sin resolver (para el aviso en /admin). */
export async function pendingReportCount(): Promise<number> {
  const [r] = await db
    .select({ n: sql<number>`count(distinct (${forumReports.kind}, ${forumReports.targetId}))::int` })
    .from(forumReports)
    .where(isNull(forumReports.resolvedAt));
  return Number(r?.n ?? 0);
}

/** Resuelve todas las denuncias de un mensaje con la misma decisión. */
export async function resolveReports(kind: VoteKind, targetId: number, action: ModAction, adminId: string): Promise<boolean> {
  const a = await autorDe(kind, targetId);
  if (!a) return false;
  if (action !== 'dismiss') {
    const tabla = kind === 'thread' ? forumThreads : forumPosts;
    if (!a.hidden) {
      await db.update(tabla).set({ hidden: true }).where(eq(tabla.id, targetId));
      if (kind === 'post') {
        const [p] = await db.select({ t: forumPosts.threadId }).from(forumPosts).where(eq(forumPosts.id, targetId)).limit(1);
        if (p) await db.update(forumThreads).set({ replies: sql`greatest(${forumThreads.replies} - 1, 0)` }).where(eq(forumThreads.id, p.t));
      }
    }
    if (action === 'ban') await banUser(a.userId, adminId, null);
  }
  await db
    .update(forumReports)
    .set({ resolvedAt: new Date(), resolvedBy: adminId, resolution: action === 'dismiss' ? 'dismissed' : action === 'hide' ? 'hidden' : 'banned' })
    .where(and(eq(forumReports.kind, kind), eq(forumReports.targetId, targetId), isNull(forumReports.resolvedAt)));
  return true;
}

/* ------------------------------------------------------------------ *
 * Bloqueos
 * ------------------------------------------------------------------ */

export async function isBanned(userId: string): Promise<boolean> {
  const [r] = await db.select({ u: forumBans.userId }).from(forumBans).where(eq(forumBans.userId, userId)).limit(1);
  return !!r;
}

export async function banUser(userId: string, byId: string, reason: string | null): Promise<void> {
  await db.insert(forumBans).values({ userId, byId, reason }).onConflictDoNothing();
}

export async function unbanUser(userId: string): Promise<boolean> {
  const r = await db.delete(forumBans).where(eq(forumBans.userId, userId)).returning({ u: forumBans.userId });
  return r.length > 0;
}

export async function listBans(): Promise<{ userId: string; username: string; name: string; at: Date }[]> {
  return db
    .select({ userId: forumBans.userId, username: profile.username, name: user.name, at: forumBans.createdAt })
    .from(forumBans)
    .innerJoin(user, eq(user.id, forumBans.userId))
    .innerJoin(profile, eq(profile.userId, forumBans.userId))
    .orderBy(desc(forumBans.createdAt));
}
