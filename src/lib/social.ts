import { and, count, desc, eq, gt, isNotNull, isNull, lt, lte, or, sql } from 'drizzle-orm';
import { db } from '../db/client';
import { profile, follows, user, userFilms, userViewings, streamAlerts } from '../db/schema';
import { buildFeed, pageFeed, type FeedItem } from './feed';
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
  'official', 'cine', 'cinearchive', 'sergio', 'team', 'privacy', 'terms', 'legal',
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
 * Instagram: normalización de handle (se guarda sin @, la URL se arma al mostrar).
 * ------------------------------------------------------------------ */

/** Reglas de Instagram: letras, dígitos, punto y guion bajo; 1–30 caracteres. */
const INSTAGRAM_RE = /^[a-zA-Z0-9._]{1,30}$/;

/**
 * Normaliza un handle de Instagram: acepta @handle o una URL de instagram.com y
 * devuelve solo el username en minúsculas. Devuelve null si queda vacío; lanza
 * error de rango si no cumple el formato (para responder 'bad_instagram').
 */
export function normalizeInstagram(raw: string): string | null {
  let v = raw.trim();
  if (!v) return null;
  // Si pegan una URL, quedarse con el primer segmento del path.
  const urlMatch = v.match(/instagram\.com\/([^/?#]+)/i);
  if (urlMatch) v = urlMatch[1];
  v = v.replace(/^@+/, '').replace(/\/+$/, '').toLowerCase();
  if (!v) return null;
  if (!INSTAGRAM_RE.test(v)) throw new RangeError('bad_instagram');
  return v;
}

/** URL pública de un handle de Instagram (para mostrar en el perfil). */
export function instagramUrl(handle: string): string {
  return `https://instagram.com/${handle}`;
}

/* ------------------------------------------------------------------ *
 * Consultas de perfil y seguimiento.
 * ------------------------------------------------------------------ */

export interface PublicProfile {
  userId: string;
  username: string;
  name: string;
  bio: string | null;
  instagram: string | null;
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
      instagram: profile.instagram,
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
  instagram: string | null;
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
      instagram: profile.instagram,
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

/**
 * Nº de notificaciones sin ver: solicitudes pendientes (siempre) + seguidores
 * nuevos aceptados desde la última vez que abrió las notificaciones + avisos de
 * «ya está en tu plataforma» sin ver.
 */
export async function notificationCount(userId: string): Promise<number> {
  const [p] = await db
    .select({ seen: profile.notificationsSeenAt })
    .from(profile)
    .where(eq(profile.userId, userId))
    .limit(1);
  const [al] = await db
    .select({ c: count() })
    .from(streamAlerts)
    .where(and(eq(streamAlerts.userId, userId), isNull(streamAlerts.seenAt)));
  const alerts = Number(al?.c ?? 0);
  if (!p) return alerts; // sin perfil no participa en la red social, pero los avisos sí le llegan

  const [pend] = await db
    .select({ c: count() })
    .from(follows)
    .where(and(eq(follows.followingId, userId), eq(follows.status, 'pending')));

  const conds = [eq(follows.followingId, userId), eq(follows.status, 'accepted')];
  if (p.seen) conds.push(gt(follows.createdAt, p.seen));
  const [nf] = await db
    .select({ c: count() })
    .from(follows)
    .where(and(...conds));

  return Number(pend?.c ?? 0) + Number(nf?.c ?? 0) + alerts;
}

/** Marca las notificaciones como vistas (limpia el "nuevo" de los seguidores). */
export async function markNotificationsSeen(userId: string): Promise<void> {
  await db.update(profile).set({ notificationsSeenAt: new Date() }).where(eq(profile.userId, userId));
  await db.update(streamAlerts).set({ seenAt: new Date() }).where(and(eq(streamAlerts.userId, userId), isNull(streamAlerts.seenAt)));
}

/* ------------------------------------------------------------------ *
 * Actividad de la gente que sigues (la mezcla y el corte, en feed.ts).
 * ------------------------------------------------------------------ */

const FEED_PAGE = 40;

/**
 * Visionados y reseñas de quienes sigue el usuario (seguimiento aceptado:
 * eso ya le da permiso para ver su actividad aunque el perfil sea privado),
 * anteriores al día `before` si se da. Se piden el doble de lo que cabe en
 * una página para poder cortar sin partir un día.
 */
export async function loadActivity(viewerId: string, before: string | null): Promise<{ items: FeedItem[]; nextBefore: string | null }> {
  const fetchN = FEED_PAGE * 2;
  const followed = and(eq(follows.followerId, viewerId), eq(follows.status, 'accepted'));
  const who = {
    userId: profile.userId,
    username: profile.username,
    name: user.name,
    hasAvatar: profile.avatarType,
  };

  const [vs, rs] = await Promise.all([
    db
      .select({
        ...who,
        tmdbId: userViewings.tmdbId,
        watchedOn: userViewings.watchedOn,
        rewatch: userViewings.rewatch,
        vRating: userViewings.rating,
        fRating: userFilms.rating,
        createdAt: userViewings.createdAt,
      })
      .from(follows)
      .innerJoin(profile, eq(profile.userId, follows.followingId))
      .innerJoin(user, eq(user.id, follows.followingId))
      .innerJoin(userViewings, eq(userViewings.userId, follows.followingId))
      .leftJoin(userFilms, and(eq(userFilms.userId, userViewings.userId), eq(userFilms.tmdbId, userViewings.tmdbId)))
      // Nada del futuro (un visionado mal fechado no se queda arriba para siempre).
      .where(and(followed, lte(userViewings.watchedOn, new Date().toISOString().slice(0, 10)), before ? lt(userViewings.watchedOn, before) : undefined))
      .orderBy(desc(userViewings.watchedOn), desc(userViewings.createdAt))
      .limit(fetchN),
    db
      .select({ ...who, tmdbId: userFilms.tmdbId, rating: userFilms.rating, note: userFilms.note, reviewedAt: userFilms.reviewedAt })
      .from(follows)
      .innerJoin(profile, eq(profile.userId, follows.followingId))
      .innerJoin(user, eq(user.id, follows.followingId))
      .innerJoin(userFilms, eq(userFilms.userId, follows.followingId))
      // Solo reseñas con texto: una nota suelta ya sale como estrellas del visionado.
      .where(and(followed, isNotNull(userFilms.reviewedAt), sql`length(trim(${userFilms.note})) > 0`, before ? lt(userFilms.reviewedAt, new Date(`${before}T00:00:00Z`)) : undefined))
      .orderBy(desc(userFilms.reviewedAt))
      .limit(fetchN),
  ]);

  const items = buildFeed(
    vs.map((v) => ({ ...v, hasAvatar: !!v.hasAvatar, rating: v.vRating ?? v.fRating ?? null })),
    rs.map((r) => ({ ...r, hasAvatar: !!r.hasAvatar, note: r.note ?? '', reviewedAt: r.reviewedAt! })),
  );
  return pageFeed(items, FEED_PAGE);
}
