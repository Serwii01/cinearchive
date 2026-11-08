/**
 * Correo de «alguien te sigue» — SOLO SERVIDOR. Solo a quien lo ha pedido en
 * su cuenta (user_preferences.follow_email, apagado por defecto) y con el
 * correo confirmado.
 *
 * Se llama sin esperar desde /api/follow: el que sigue no tiene por qué notar
 * si el correo tarda o falla. Para que seguir y dejar de seguir en bucle no
 * sirva para mandar correos a alguien, como mucho uno al día por pareja.
 */
import { and, eq } from 'drizzle-orm';
import { db } from '../db/client';
import { user, userPreferences } from '../db/schema';
import { sendEmail } from './email';
import { followEmail } from './emails';
import { check } from './ratelimit';
import { localizePath, normalizeLang } from '../i18n/ui';

const DIA_MS = 24 * 60 * 60 * 1000;

export async function avisarSeguidor(
  seguidor: { id: string; name: string; username: string },
  seguidoId: string,
  pide: boolean,
): Promise<boolean> {
  if (!check(`follow-email:${seguidor.id}:${seguidoId}`, 1, DIA_MS).ok) return false;
  const [dest] = await db
    .select({ email: user.email, locale: userPreferences.locale })
    .from(userPreferences)
    .innerJoin(user, eq(user.id, userPreferences.userId))
    .where(and(eq(userPreferences.userId, seguidoId), eq(userPreferences.followEmail, true), eq(user.emailVerified, true)))
    .limit(1);
  if (!dest) return false;
  const lang = normalizeLang(dest.locale);
  const site = process.env.SITE_URL ?? process.env.BETTER_AUTH_URL ?? 'http://localhost:4321';
  const url = new URL(localizePath(lang, 'notifications'), site).href;
  return sendEmail({ to: dest.email, ...followEmail(lang, seguidor, pide, url) });
}
