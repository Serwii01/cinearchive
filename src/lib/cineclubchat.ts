/**
 * Chat de las sesiones del cineclub — SOLO SERVIDOR.
 *
 * Sin WebSockets: el navegador pregunta cada pocos segundos por «lo nuevo
 * desde el último id» (índice session + id). Para una sala de cineclub basta,
 * y no deja conexiones abiertas en un VPS de 1,8 GB.
 */
import { and, asc, eq, gt } from 'drizzle-orm';
import { db } from '../db/client';
import { cineclubMessages, profile, user } from '../db/schema';

export const CHAT_MAX = 500;
/** Lo que se carga al entrar: lo último, no la sesión entera. */
const AL_ENTRAR = 80;

export interface ChatMessage {
  id: number;
  username: string;
  name: string;
  body: string;
  at: string;
}

/** Mensajes de una sesión con id mayor que `after`, en orden. */
export async function chatMessages(session: string, after = 0): Promise<ChatMessage[]> {
  const rows = await db
    .select({ id: cineclubMessages.id, body: cineclubMessages.body, at: cineclubMessages.createdAt, username: profile.username, name: user.name })
    .from(cineclubMessages)
    .innerJoin(profile, eq(profile.userId, cineclubMessages.userId))
    .innerJoin(user, eq(user.id, cineclubMessages.userId))
    .where(and(eq(cineclubMessages.session, session), eq(cineclubMessages.hidden, false), gt(cineclubMessages.id, after)))
    .orderBy(asc(cineclubMessages.id))
    .limit(after ? 200 : 2000);
  const out = rows.map((r) => ({ id: r.id, username: r.username, name: r.name, body: r.body, at: r.at.toISOString() }));
  return after ? out : out.slice(-AL_ENTRAR);
}

export async function postChatMessage(session: string, userId: string, body: string): Promise<number> {
  const [row] = await db.insert(cineclubMessages).values({ session, userId, body }).returning({ id: cineclubMessages.id });
  return row.id;
}

/** Oculta un mensaje (su autor o un administrador). */
export async function hideChatMessage(id: number, by: { userId: string; admin: boolean }): Promise<boolean> {
  const res = await db
    .update(cineclubMessages)
    .set({ hidden: true })
    .where(and(eq(cineclubMessages.id, id), by.admin ? undefined : eq(cineclubMessages.userId, by.userId)))
    .returning({ id: cineclubMessages.id });
  return res.length > 0;
}
