/**
 * Tus datos (SOLO SERVIDOR): lo que hace falta para que la página de cuenta
 * cumpla lo que dicen la política de privacidad y las condiciones de uso —
 * descargar todo lo que guardamos de ti y saber si la cuenta tiene contraseña
 * (para ofrecer cambiarla o pedirla al borrar).
 */
import { and, eq, inArray, or } from 'drizzle-orm';
import { db } from '../db/client';
import {
  account,
  follows,
  profile,
  user,
  userBadges,
  userFilms,
  userListFilms,
  userLists,
  userPreferences,
  badges,
} from '../db/schema';

/** ¿Entra con correo y contraseña? Las cuentas solo de Google/GitHub no tienen. */
export async function hasPassword(userId: string): Promise<boolean> {
  const rows = await db
    .select({ id: account.id })
    .from(account)
    .where(and(eq(account.userId, userId), eq(account.providerId, 'credential')))
    .limit(1);
  return rows.length > 0;
}

type Row = Record<string, unknown>;

export interface ExportInput {
  user: Row;
  profile: Row | null;
  preferences: Row | null;
  films: Row[];
  lists: Row[];
  listFilms: Row[];
  following: Row[];
  followers: Row[];
  badges: Row[];
  providers: string[];
}

/**
 * Da forma al fichero de exportación. Pura (tiene tests): aquí se decide qué
 * sale y qué no. No salen la contraseña (ni su hash), los tokens de Google o
 * GitHub ni los bytes del avatar; sí todo lo que el usuario ha escrito o elegido.
 */
export function shapeExport(d: ExportInput, now = new Date()) {
  const pick = (r: Row | null, keys: string[]) =>
    r ? Object.fromEntries(keys.filter((k) => k in r).map((k) => [k, r[k]])) : null;
  return {
    exportedAt: now.toISOString(),
    source: 'Cine Archive — https://cinearchive.es',
    account: { ...pick(d.user, ['name', 'email', 'emailVerified', 'createdAt']), signInMethods: d.providers },
    profile: d.profile
      ? { ...pick(d.profile, ['username', 'bio', 'instagram', 'isPrivate', 'createdAt']), hasAvatar: !!d.profile.avatarType }
      : null,
    preferences: pick(d.preferences, ['locale', 'favoriteGenres', 'favoriteDirectors', 'favoritePeople', 'theme', 'privacy']),
    films: d.films.map((f) => pick(f, ['tmdbId', 'status', 'favorite', 'rating', 'note', 'reviewedAt', 'updatedAt'])),
    lists: d.lists.map((l) => ({
      ...pick(l, ['name', 'isPublic', 'createdAt']),
      films: d.listFilms.filter((lf) => lf.listId === l.id).map((lf) => pick(lf, ['tmdbId', 'addedAt'])),
    })),
    following: d.following,
    followers: d.followers,
    badges: d.badges,
  };
}

export async function exportUserData(userId: string) {
  const [u] = await db.select().from(user).where(eq(user.id, userId)).limit(1);
  const [p] = await db.select().from(profile).where(eq(profile.userId, userId)).limit(1);
  const [prefs] = await db.select().from(userPreferences).where(eq(userPreferences.userId, userId)).limit(1);
  const films = await db.select().from(userFilms).where(eq(userFilms.userId, userId));
  const lists = await db.select().from(userLists).where(eq(userLists.userId, userId));
  const listFilms = lists.length
    ? await db.select().from(userListFilms).where(inArray(userListFilms.listId, lists.map((l) => l.id)))
    : [];
  // Seguimientos, con el nombre de usuario del otro lado (no su id interno).
  const rels = await db
    .select()
    .from(follows)
    .where(or(eq(follows.followerId, userId), eq(follows.followingId, userId)));
  const otros = [...new Set(rels.map((r) => (r.followerId === userId ? r.followingId : r.followerId)))];
  const nombres = otros.length
    ? await db.select({ userId: profile.userId, username: profile.username }).from(profile).where(inArray(profile.userId, otros))
    : [];
  const handle = (id: string) => nombres.find((n) => n.userId === id)?.username ?? null;
  const following = rels
    .filter((r) => r.followerId === userId)
    .map((r) => ({ username: handle(r.followingId), status: r.status, since: r.createdAt }));
  const followers = rels
    .filter((r) => r.followingId === userId)
    .map((r) => ({ username: handle(r.followerId), status: r.status, since: r.createdAt }));
  const myBadges = await db
    .select({ name: badges.name, grantedAt: userBadges.grantedAt })
    .from(userBadges)
    .innerJoin(badges, eq(badges.id, userBadges.badgeId))
    .where(eq(userBadges.userId, userId));
  const providers = (
    await db.select({ providerId: account.providerId }).from(account).where(eq(account.userId, userId))
  ).map((a) => (a.providerId === 'credential' ? 'email' : a.providerId));

  return shapeExport({
    user: u as Row,
    profile: (p as Row) ?? null,
    preferences: (prefs as Row) ?? null,
    films: films as Row[],
    lists: lists as Row[],
    listFilms: listFilms as Row[],
    following,
    followers,
    badges: myBadges,
    providers,
  });
}
