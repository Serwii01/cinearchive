/**
 * Correo de «te han respondido / mencionado en el foro» — SOLO SERVIDOR.
 *
 * Solo a quien lo ha pedido en su cuenta (user_preferences.forum_email,
 * apagado por defecto) y con el correo confirmado. Como mucho uno por persona
 * e hilo cada media hora: una conversación animada no puede llenar un buzón.
 * Se llama sin esperar desde lib/forumactivity.ts: quien escribe no tiene por
 * qué notar si el correo tarda o falla.
 */
import { and, eq, inArray } from 'drizzle-orm';
import { db } from '../db/client';
import { user, userPreferences } from '../db/schema';
import { sendEmail } from './email';
import { forumEmail } from './emails';
import { check } from './ratelimit';
import { threadPath } from './forumpaths';
import { localizePath, normalizeLang } from '../i18n/ui';

const MEDIA_HORA_MS = 30 * 60 * 1000;

export async function avisarPorCorreo(opts: {
  destinatarios: { userId: string; mencion: boolean }[];
  actor: { name: string; username: string };
  threadId: number;
  threadTitle: string;
  postId: number | null;
  extracto: string;
}): Promise<number> {
  if (!opts.destinatarios.length) return 0;
  const filas = await db
    .select({ id: user.id, email: user.email, locale: userPreferences.locale })
    .from(userPreferences)
    .innerJoin(user, eq(user.id, userPreferences.userId))
    .where(
      and(
        inArray(
          userPreferences.userId,
          opts.destinatarios.map((d) => d.userId),
        ),
        eq(userPreferences.forumEmail, true),
        eq(user.emailVerified, true),
      ),
    );
  const site = process.env.SITE_URL ?? process.env.BETTER_AUTH_URL ?? 'http://localhost:4321';
  let enviados = 0;
  for (const f of filas) {
    if (!check(`forum-email:${f.id}:${opts.threadId}`, 1, MEDIA_HORA_MS).ok) continue;
    const lang = normalizeLang(f.locale);
    const ruta = localizePath(lang, threadPath(opts.threadId, opts.threadTitle));
    const url = new URL(`${ruta}${opts.postId ? `#r${opts.postId}` : ''}`, site).href;
    const mencion = opts.destinatarios.find((d) => d.userId === f.id)?.mencion ?? false;
    if (await sendEmail({ to: f.email, ...forumEmail(lang, opts.actor, opts.threadTitle, opts.extracto, mencion, url) })) enviados++;
  }
  return enviados;
}
