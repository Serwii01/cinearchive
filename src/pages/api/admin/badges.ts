import type { APIRoute } from 'astro';
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { db } from '../../../db/client';
import { user } from '../../../db/schema';
import { isAdmin } from '../../../lib/admin';
import { createBadge, deleteBadge, listBadges, parseBadgeInput, setUserBadges, badgesForUser } from '../../../lib/badges';

export const prerender = false;

const forbidden = () => new Response(JSON.stringify({ error: 'forbidden' }), { status: 403 });
const bad = (error: string, status = 400) => new Response(JSON.stringify({ error }), { status });

/** GET — todas las etiquetas. */
export const GET: APIRoute = async ({ locals }) => {
  if (!isAdmin(locals.user)) return forbidden();
  return Response.json({ badges: await listBadges() });
};

/** POST — crea una etiqueta ({ name, color, description }). */
export const POST: APIRoute = async ({ locals, request }) => {
  if (!isAdmin(locals.user)) return forbidden();
  const parsed = parseBadgeInput((await request.json().catch(() => ({}))) ?? {});
  if (!parsed.ok) return bad(parsed.error);
  const badge = await createBadge(parsed.badge);
  if (badge === 'duplicate') return bad('duplicate', 409);
  return Response.json({ ok: true, badge });
};

const delSchema = z.object({ id: z.number().int().positive() });

/** DELETE — elimina una etiqueta; se la quita a todos los que la tuvieran (cascada). */
export const DELETE: APIRoute = async ({ locals, request }) => {
  if (!isAdmin(locals.user)) return forbidden();
  const parsed = delSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return bad('invalid');
  if (!(await deleteBadge(parsed.data.id))) return bad('not_found', 404);
  return Response.json({ ok: true });
};

const putSchema = z.object({ userId: z.string().min(1), badgeIds: z.array(z.number().int().positive()).max(50) });

/** PUT — deja a un usuario exactamente con estas etiquetas. */
export const PUT: APIRoute = async ({ locals, request }) => {
  if (!isAdmin(locals.user)) return forbidden();
  const parsed = putSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return bad('invalid');
  const { userId, badgeIds } = parsed.data;
  const [existe] = await db.select({ id: user.id }).from(user).where(eq(user.id, userId)).limit(1);
  if (!existe) return bad('not_found', 404);
  await setUserBadges(userId, badgeIds);
  return Response.json({ ok: true, badges: await badgesForUser(userId) });
};
