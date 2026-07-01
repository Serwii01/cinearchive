import { and, count, desc, eq, or } from 'drizzle-orm';
import { db } from '../db/client';
import { profile, follows, user } from '../db/schema';
import type { Profile } from '../db/schema';

/* ------------------------------------------------------------------ *
 * Usernames: reglas de validación y normalización.
 * ------------------------------------------------------------------ */

/** 3–20 caracteres: minúsculas, dígitos y guion bajo. Sin @ (se muestra aparte). */
export const USERNAME_RE = /^[a-z0-9_]{3,20}$/;

/** Nombres reservados (rutas, roles, marcas) que nadie puede registrar. */
const RESERVED = new Set([
  'admin', 'administrator', 'api', 'auth', 'login', 'logout', 'register',
  'account', 'accounts', 'settings', 'search', 'watchlist', 'lists', 'stats',
  'recommendations', 'discover', 'films', 'film', 'archive', 'about', 'help',
  'support', 'contact', 'root', 'system', 'null', 'undefined', 'me', 'my',
  'user', 'users', 'profile', 'profiles', 'u', 'moderator', 'mod', 'staff',
  'official', 'cine', 'cinearchive', 'sergio', 'privacy', 'terms', 'legal',
]);

export type UsernameError = 'format' | 'reserved';

/** Quita @ y espacios y pasa a minúsculas. No valida. */
export function normalizeUsername(raw: string): string {
  return raw.trim().replace(/^@+/, '').toLowerCase();
}

/** Devuelve el motivo de rechazo, o null si el username es válido. */
export function usernameError(raw: string): UsernameError | null {
  const u = normalizeUsername(raw);
  if (!USERNAME_RE.test(u)) return 'format';
  if (u.startsWith('_') || u.endsWith('_') || u.includes('__')) return 'format';
  if (RESERVED.has(u)) return 'reserved';
  return null;
}

/* ------------------------------------------------------------------ *
 * Consultas de perfil y seguimiento.
 * ------------------------------------------------------------------ */

export interface PublicProfile {
  userId: string;
  username: string;
  name: string;
  bio: string | null;
  isPrivate: boolean;
  avatarType: string | null;
}

/** Perfil por username canónico (sin los bytes del avatar; solo metadatos). */
export async function getProfileByUsername(username: string): Promise<PublicProfile | null> {
  const u = normalizeUsername(username);
  const [row] = await db
    .select({
      userId: profile.userId,
      username: profile.username,
      name: user.name,
      bio: profile.bio,
      isPrivate: profile.isPrivate,
      avatarType: profile.avatarType,
    })
    .from(profile)
    .innerJoin(user, eq(user.id, profile.userId))
    .where(eq(profile.username, u))
    .limit(1);
  return row ?? null;
}

export interface MyProfile {
  userId: string;
  username: string;
  bio: string | null;
  isPrivate: boolean;
  avatarType: string | null;
}

/** Perfil del propio usuario por id (sin bytes del avatar; puede no existir aún). */
export async function getMyProfile(userId: string): Promise<MyProfile | null> {
  const [row] = await db
    .select({
      userId: profile.userId,
      username: profile.username,
      bio: profile.bio,
      isPrivate: profile.isPrivate,
      avatarType: profile.avatarType,
    })
    .from(profile)
    .where(eq(profile.userId, userId))
    .limit(1);
  return row ?? null;
}

/** Estado de seguimiento de `viewerId` hacia `targetId`. */
export async function followState(
  viewerId: string | null,
  targetId: string,
): Promise<'self' | 'none' | 'pending' | 'accepted'> {
  if (!viewerId) return 'none';
  if (viewerId === targetId) return 'self';
  const [row] = await db
    .select({ status: follows.status })
    .from(follows)
    .where(and(eq(follows.followerId, viewerId), eq(follows.followingId, targetId)))
    .limit(1);
  return row ? row.status : 'none';
}

/** ¿Puede el visor ver la actividad (reseñas, listas, seguidores) del objetivo? */
export function canViewActivity(
  viewerId: string | null,
  target: Pick<Profile, 'userId' | 'isPrivate'>,
  state: 'self' | 'none' | 'pending' | 'accepted',
): boolean {
  if (viewerId && viewerId === target.userId) return true;
  if (!target.isPrivate) return true;
  return state === 'accepted';
}

/** Nº de seguidores (aceptados) y seguidos (aceptados) de un usuario. */
export async function followCounts(userId: string): Promise<{ followers: number; following: number }> {
  const [[f1], [f2]] = await Promise.all([
    db
      .select({ c: count() })
      .from(follows)
      .where(and(eq(follows.followingId, userId), eq(follows.status, 'accepted'))),
    db
      .select({ c: count() })
      .from(follows)
      .where(and(eq(follows.followerId, userId), eq(follows.status, 'accepted'))),
  ]);
  return { followers: Number(f1?.c ?? 0), following: Number(f2?.c ?? 0) };
}

export interface Connection {
  id: string;
  username: string;
  name: string;
  isPrivate: boolean;
  hasAvatar: boolean;
}

/**
 * Lista de seguidores (quienes le siguen) o seguidos (a quienes sigue), aceptados.
 * Solo incluye usuarios con perfil público (username); ordenados por más reciente.
 */
export async function getConnections(
  userId: string,
  type: 'followers' | 'following',
  limit = 100,
): Promise<Connection[]> {
  // followers: la otra persona es el follower; following: la otra persona es el followed.
  const otherCol = type === 'followers' ? follows.followerId : follows.followingId;
  const selfCol = type === 'followers' ? follows.followingId : follows.followerId;

  const rows = await db
    .select({
      id: profile.userId,
      username: profile.username,
      name: user.name,
      isPrivate: profile.isPrivate,
      hasAvatar: profile.avatarType,
    })
    .from(follows)
    .innerJoin(profile, eq(profile.userId, otherCol))
    .innerJoin(user, eq(user.id, otherCol))
    .where(and(eq(selfCol, userId), eq(follows.status, 'accepted')))
    .orderBy(desc(follows.createdAt))
    .limit(limit);

  return rows.map((r) => ({ ...r, hasAvatar: !!r.hasAvatar }));
}

/** Nº de solicitudes de seguimiento pendientes que ha recibido el usuario. */
export async function pendingRequestCount(userId: string): Promise<number> {
  const [row] = await db
    .select({ c: count() })
    .from(follows)
    .where(and(eq(follows.followingId, userId), eq(follows.status, 'pending')));
  return Number(row?.c ?? 0);
}
