/**
 * Etiquetas de usuario — SOLO SERVIDOR.
 *
 * El administrador las crea con el texto que quiera y se las pone a quien
 * quiera desde el panel. No hay catálogo fijo: «Fundador», «Crítica invitada»,
 * «Beta» o lo que se le ocurra. Se enseñan como pastillas junto al nombre.
 */
import { and, eq, inArray } from 'drizzle-orm';
import { db } from '../db/client';
import { badges, userBadges } from '../db/schema';

export const BADGE_COLORS = ['ochre', 'ink', 'outline'] as const;
export type BadgeColor = (typeof BADGE_COLORS)[number];

export interface Badge {
  id: number;
  name: string;
  color: BadgeColor;
  description: string | null;
}

export const BADGE_NAME_MAX = 24;
export const BADGE_DESC_MAX = 120;

export type BadgeInputError = 'name_required' | 'name_too_long' | 'bad_color' | 'desc_too_long';

/**
 * Limpia y valida lo que llega del formulario. Devuelve la etiqueta lista para
 * guardar o el motivo del rechazo. Pura, para poder probarla.
 */
export function parseBadgeInput(raw: {
  name?: unknown;
  color?: unknown;
  description?: unknown;
}): { ok: true; badge: Omit<Badge, 'id'> } | { ok: false; error: BadgeInputError } {
  const name = typeof raw.name === 'string' ? raw.name.trim().replace(/\s+/g, ' ') : '';
  if (!name) return { ok: false, error: 'name_required' };
  if (name.length > BADGE_NAME_MAX) return { ok: false, error: 'name_too_long' };
  const color = raw.color ?? 'ochre';
  if (!BADGE_COLORS.includes(color as BadgeColor)) return { ok: false, error: 'bad_color' };
  const description = typeof raw.description === 'string' ? raw.description.trim() : '';
  if (description.length > BADGE_DESC_MAX) return { ok: false, error: 'desc_too_long' };
  return { ok: true, badge: { name, color: color as BadgeColor, description: description || null } };
}

/** Clases de Tailwind de la pastilla según su color. */
export function badgeClasses(color: string): string {
  switch (color) {
    case 'ink':
      return 'border-ink bg-ink text-white';
    case 'outline':
      return 'border-ink bg-transparent text-ink';
    default:
      return 'border-ink bg-ochre text-on-accent';
  }
}

const aBadge = (r: { id: number; name: string; color: string; description: string | null }): Badge => ({
  id: r.id,
  name: r.name,
  color: (BADGE_COLORS.includes(r.color as BadgeColor) ? r.color : 'ochre') as BadgeColor,
  description: r.description,
});

export async function listBadges(): Promise<Badge[]> {
  const rows = await db.select().from(badges).orderBy(badges.id);
  return rows.map(aBadge);
}

/** Las etiquetas de un usuario, en el orden en que se crearon. */
export async function badgesForUser(userId: string): Promise<Badge[]> {
  const rows = await db
    .select({ id: badges.id, name: badges.name, color: badges.color, description: badges.description })
    .from(userBadges)
    .innerJoin(badges, eq(badges.id, userBadges.badgeId))
    .where(eq(userBadges.userId, userId))
    .orderBy(badges.id);
  return rows.map(aBadge);
}

/** Lo mismo para varios usuarios de golpe (el panel, listas de gente). */
export async function badgesForUsers(userIds: string[]): Promise<Map<string, Badge[]>> {
  const out = new Map<string, Badge[]>();
  if (userIds.length === 0) return out;
  const rows = await db
    .select({ userId: userBadges.userId, id: badges.id, name: badges.name, color: badges.color, description: badges.description })
    .from(userBadges)
    .innerJoin(badges, eq(badges.id, userBadges.badgeId))
    .where(inArray(userBadges.userId, userIds))
    .orderBy(badges.id);
  for (const r of rows) (out.get(r.userId) ?? out.set(r.userId, []).get(r.userId)!).push(aBadge(r));
  return out;
}

export async function createBadge(input: Omit<Badge, 'id'>): Promise<Badge | 'duplicate'> {
  const [row] = await db.insert(badges).values(input).onConflictDoNothing().returning();
  return row ? aBadge(row) : 'duplicate';
}

export async function deleteBadge(id: number): Promise<boolean> {
  const rows = await db.delete(badges).where(eq(badges.id, id)).returning({ id: badges.id });
  return rows.length > 0;
}

/**
 * Deja al usuario exactamente con estas etiquetas: quita las que sobren y
 * añade las que falten, sin tocar la fecha de las que ya tenía.
 */
export async function setUserBadges(userId: string, badgeIds: number[]): Promise<void> {
  // Solo ids que existan: una etiqueta borrada entre que se abre el editor y se
  // guarda no puede tumbar la petición con un error de clave foránea.
  const existentes = new Set((await listBadges()).map((b) => b.id));
  const deseadas = new Set(badgeIds.filter((id) => existentes.has(id)));
  const actuales = new Set((await badgesForUser(userId)).map((b) => b.id));
  const quitar = [...actuales].filter((id) => !deseadas.has(id));
  const poner = [...deseadas].filter((id) => !actuales.has(id));
  await db.transaction(async (tx) => {
    if (quitar.length) {
      await tx.delete(userBadges).where(and(eq(userBadges.userId, userId), inArray(userBadges.badgeId, quitar)));
    }
    if (poner.length) {
      await tx
        .insert(userBadges)
        .values(poner.map((badgeId) => ({ userId, badgeId })))
        .onConflictDoNothing();
    }
  });
}
