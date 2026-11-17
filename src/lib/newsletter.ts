/**
 * Boletín de novedades por correo — SOLO SERVIDOR.
 *
 * A quién: cuentas con el correo confirmado y la casilla «Novedades por
 * correo» encendida (user_preferences.news_email; sin fila de preferencias
 * cuenta como encendida: es el criterio de clientes existentes, art. 21.2
 * LSSI, con baja en un clic). Cada correo lleva un enlace de baja firmado y
 * la cabecera List-Unsubscribe (RFC 8058), para que Gmail y compañía pongan su
 * propio botón de «cancelar suscripción».
 *
 * Cómo: lo lanza un administrador desde /admin. El envío corre en segundo
 * plano, un correo por segundo (para no pasarse del límite de Resend ni
 * parecer una ráfaga de spam), y apunta cada envío en newsletter_sends: si se
 * corta y se vuelve a lanzar, nadie lo recibe dos veces.
 */
import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { and, desc, eq, sql } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '../db/client';
import { newsletterIssues, newsletterSends, user, userPreferences } from '../db/schema';
import { sendEmail } from './email';
import { newsletterEmail } from './emails';
import { CURRENT_ISSUE, ISSUES, type NewsletterIssue } from '../data/newsletter';
import { localizePath, normalizeLang, type Lang } from '../i18n/ui';

const SECRET = process.env.BETTER_AUTH_SECRET || 'cine-archive-boletin';
/** Adónde llegan las respuestas al boletín. */
export const REPLY_TO = 'contacto@cinearchive.es';
const site = () => process.env.SITE_URL || process.env.BETTER_AUTH_URL || 'https://cinearchive.es';

/** Firma de la baja: con ella no hace falta iniciar sesión para darse de baja. */
export function unsubscribeToken(userId: string): string {
  return createHmac('sha256', SECRET).update(`news:${userId}`).digest('base64url').slice(0, 32);
}
export function verifyUnsubscribe(userId: string, token: string): boolean {
  const esperado = unsubscribeToken(userId);
  return token.length === esperado.length && timingSafeEqual(Buffer.from(token), Buffer.from(esperado));
}

export function unsubscribeUrl(userId: string, lang: Lang, base = site()): string {
  const u = new URL(localizePath(lang, 'newsletter/baja'), base);
  u.searchParams.set('u', userId);
  u.searchParams.set('t', unsubscribeToken(userId));
  return u.href;
}
/** URL a la que los clientes de correo hacen el POST de baja en un clic. */
export function oneClickUrl(userId: string, base = site()): string {
  const u = new URL('/api/news/unsubscribe', base);
  u.searchParams.set('u', userId);
  u.searchParams.set('t', unsubscribeToken(userId));
  return u.href;
}

/** Apaga las novedades de una cuenta (crea la fila de preferencias si no la tenía). */
export async function setNewsEmail(userId: string, on: boolean): Promise<void> {
  await db
    .insert(userPreferences)
    .values({ userId, newsEmail: on, updatedAt: new Date() })
    .onConflictDoUpdate({ target: userPreferences.userId, set: { newsEmail: on, updatedAt: new Date() } });
}

/** Enlace de una novedad: una dirección completa tal cual, o una ruta de la web en el idioma de cada cual. */
export function itemUrl(path: string, lang: Lang, base = site()): string {
  if (/^https?:\/\//i.test(path)) return path;
  const [ruta, ancla] = path.replace(/^\/+/, '').split('#');
  return new URL(localizePath(lang, ruta) + (ancla ? `#${ancla}` : ''), base).href;
}

/** El correo de un número para una persona. */
export function buildIssueEmail(issue: NewsletterIssue, lang: Lang, userId: string, base = site()) {
  const c = issue.copy[lang] ?? issue.copy.es;
  const parts = {
    subject: c.subject,
    preheader: c.preheader,
    title: c.title,
    intro: c.intro,
    outro: c.outro,
    items: c.items.map((i) => ({ title: i.title, text: i.text, url: itemUrl(i.path, lang, base) })),
  };
  const built = newsletterEmail(lang, parts, unsubscribeUrl(userId, lang, base), new URL(localizePath(lang, 'account'), base).href);
  return {
    ...built,
    replyTo: REPLY_TO,
    headers: {
      'List-Unsubscribe': `<${oneClickUrl(userId, base)}>`,
      'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
    },
  };
}

interface Destinatario {
  id: string;
  email: string;
  locale: string | null;
}

/** Quién debería recibir este número y aún no lo ha recibido. */
export async function pendingRecipients(issueId: string): Promise<Destinatario[]> {
  const rows = await db
    .select({ id: user.id, email: user.email, locale: userPreferences.locale })
    .from(user)
    .leftJoin(userPreferences, eq(userPreferences.userId, user.id))
    .where(
      and(
        eq(user.emailVerified, true),
        sql`coalesce(${userPreferences.newsEmail}, true)`,
        sql`not exists (select 1 from ${newsletterSends} s where s.issue = ${issueId} and s.user_id = ${user.id})`,
      ),
    );
  return rows;
}

export async function sentCount(issueId: string): Promise<number> {
  const [r] = await db.select({ n: sql<number>`count(*)::int` }).from(newsletterSends).where(eq(newsletterSends.issue, issueId));
  return Number(r?.n ?? 0);
}

/* ---------------------------- envío en segundo plano ---------------------------- */

export interface SendJob {
  issue: string;
  running: boolean;
  total: number;
  sent: number;
  failed: number;
  startedAt: number;
  finishedAt?: number;
}
let job: SendJob | null = null;
export const currentJob = (): SendJob | null => job;

const PAUSA_MS = 1000;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Arranca el envío de un número a todos los pendientes. No hace nada si ya hay uno en marcha. */
export async function startSend(issue: NewsletterIssue = CURRENT_ISSUE): Promise<SendJob> {
  if (job?.running) return job;
  const lista = await pendingRecipients(issue.id);
  job = { issue: issue.id, running: true, total: lista.length, sent: 0, failed: 0, startedAt: Date.now() };
  const actual = job;
  void (async () => {
    for (const d of lista) {
      const ok = await sendEmail({ to: d.email, ...buildIssueEmail(issue, normalizeLang(d.locale), d.id) }).catch(() => false);
      if (ok) {
        actual.sent++;
        await db.insert(newsletterSends).values({ issue: issue.id, userId: d.id }).onConflictDoNothing();
      } else actual.failed++;
      await sleep(PAUSA_MS);
    }
    actual.running = false;
    actual.finishedAt = Date.now();
    console.log(`[boletín] ${issue.id}: ${actual.sent} enviados, ${actual.failed} fallidos`);
  })();
  return job;
}

/** Prueba: el número entero a una sola persona (el administrador), sin apuntarlo como enviado. */
export async function sendTest(to: { id: string; email: string }, lang: Lang, issue: NewsletterIssue = CURRENT_ISSUE): Promise<boolean> {
  return sendEmail({ to: to.email, ...buildIssueEmail(issue, lang, to.id) });
}

/* ------------------------------ correos propios ------------------------------ */

const corto = (max: number) => z.string().trim().min(1).max(max);
const copia = z.object({
  subject: corto(150),
  preheader: z.string().trim().max(200).default(''),
  title: corto(150),
  intro: z.string().trim().max(3000).default(''),
  items: z
    .array(
      z.object({
        title: corto(150),
        text: z.string().trim().max(1000).default(''),
        // Ruta de la web (`foro`, `articles/…`) o https://…; nada de javascript: ni rutas raras.
        path: z.string().trim().max(400).regex(/^(https?:\/\/[^\s]+|[a-z0-9\-_/#.?=&]+)$/i),
      }),
    )
    .max(12),
  outro: z.string().trim().max(2000).default(''),
});
/** Un borrador: castellano obligatorio, el resto opcional (cae en el castellano). */
export const draftSchema = z.object({
  es: copia,
  en: copia.optional(),
  gl: copia.optional(),
  eu: copia.optional(),
  ca: copia.optional(),
});

/** Un número por id: los fijos de data/newsletter.ts o los escritos en /admin. */
export async function getIssue(id: string): Promise<NewsletterIssue | null> {
  const fijo = ISSUES.find((i) => i.id === id);
  if (fijo) return fijo;
  const [row] = await db.select().from(newsletterIssues).where(eq(newsletterIssues.id, id)).limit(1);
  return row ? { id: row.id, copy: row.copy as NewsletterIssue['copy'] } : null;
}

/** Todos los números, los escritos en /admin primero (del más nuevo al más viejo). */
export async function listIssues(): Promise<{ id: string; subject: string; custom: boolean; updatedAt: Date | null }[]> {
  const propios = await db.select().from(newsletterIssues).orderBy(desc(newsletterIssues.updatedAt));
  return [
    ...propios.map((r) => ({ id: r.id, subject: (r.copy as NewsletterIssue['copy']).es.subject, custom: true, updatedAt: r.updatedAt })),
    ...ISSUES.map((i) => ({ id: i.id, subject: i.copy.es.subject, custom: false, updatedAt: null })),
  ];
}

/**
 * Guarda un borrador (nuevo si no trae id). Uno que ya se ha empezado a enviar
 * no se puede cambiar: los que lo recibieron y los que no leerían cosas distintas.
 */
export async function saveDraft(copy: z.infer<typeof draftSchema>, id?: string): Promise<{ id: string } | { error: 'sent' | 'fixed' }> {
  if (id && ISSUES.some((i) => i.id === id)) return { error: 'fixed' };
  if (id && (await sentCount(id)) > 0) return { error: 'sent' };
  const nuevo = id ?? `correo-${new Date().toISOString().slice(0, 10)}-${randomBytes(3).toString('hex')}`;
  await db
    .insert(newsletterIssues)
    .values({ id: nuevo, copy, updatedAt: new Date() })
    .onConflictDoUpdate({ target: newsletterIssues.id, set: { copy, updatedAt: new Date() } });
  return { id: nuevo };
}

/** Borra un borrador que no se ha enviado a nadie. */
export async function deleteDraft(id: string): Promise<boolean> {
  if ((await sentCount(id)) > 0) return false;
  const res = await db.delete(newsletterIssues).where(eq(newsletterIssues.id, id)).returning({ id: newsletterIssues.id });
  return res.length > 0;
}
