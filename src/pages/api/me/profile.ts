import type { APIRoute } from 'astro';
import { z } from 'zod';
import { and, eq, ne } from 'drizzle-orm';
import { db } from '../../../db/client';
import { profile, follows } from '../../../db/schema';
import { normalizeUsername, usernameError, normalizeInstagram, getMyProfile } from '../../../lib/social';
import { check, tooMany } from '../../../lib/ratelimit';

export const prerender = false;

const unauthorized = () => new Response(JSON.stringify({ error: 'unauthorized' }), { status: 401 });
const bad = (error: string) => new Response(JSON.stringify({ error }), { status: 400 });

const schema = z.object({
  username: z.string().trim().optional(),
  bio: z.string().trim().max(300).optional(),
  instagram: z.string().trim().max(120).optional(),
  isPrivate: z.boolean().optional(),
});

/** GET — perfil del usuario autenticado (o null si aún no lo ha creado). */
export const GET: APIRoute = async ({ locals }) => {
  if (!locals.user) return unauthorized();
  const p = await getMyProfile(locals.user.id);
  return Response.json({ profile: p ? { username: p.username, bio: p.bio, isPrivate: p.isPrivate, hasAvatar: !!p.avatarType } : null });
};

/** PUT — crea o actualiza el perfil (username, bio, privacidad). */
export const PUT: APIRoute = async ({ locals, request }) => {
  if (!locals.user) return unauthorized();
  const userId = locals.user.id;
  const rl = check(`profile:${userId}`, 20, 60_000);
  if (!rl.ok) return tooMany(rl.retryAfter);
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return bad('invalid');

  const existing = await getMyProfile(userId);
  const patch: Partial<typeof profile.$inferInsert> = { updatedAt: new Date() };

  // Username: obligatorio al crear; validado y único al cambiar.
  if (parsed.data.username !== undefined) {
    const uname = normalizeUsername(parsed.data.username);
    const err = usernameError(uname);
    if (err) return bad(err); // 'format' | 'reserved'
    // ¿Lo tiene otro usuario?
    const clash = await db
      .select({ userId: profile.userId })
      .from(profile)
      .where(and(eq(profile.username, uname), ne(profile.userId, userId)))
      .limit(1);
    if (clash.length) return bad('taken');
    patch.username = uname;
  } else if (!existing) {
    return bad('username_required');
  }

  if (parsed.data.bio !== undefined) patch.bio = parsed.data.bio || null;
  if (parsed.data.instagram !== undefined) {
    try {
      patch.instagram = normalizeInstagram(parsed.data.instagram);
    } catch {
      return bad('bad_instagram');
    }
  }
  if (parsed.data.isPrivate !== undefined) patch.isPrivate = parsed.data.isPrivate;

  try {
    if (existing) {
      await db.update(profile).set(patch).where(eq(profile.userId, userId));
    } else {
      await db.insert(profile).values({
        userId,
        username: patch.username!,
        bio: patch.bio ?? null,
        instagram: patch.instagram ?? null,
        isPrivate: patch.isPrivate ?? true,
      });
    }
  } catch (err: any) {
    // Carrera contra el índice único de username: lo tratamos como "en uso".
    if (err?.code === '23505') return bad('taken');
    throw err;
  }

  // Al pasar a público, se aceptan automáticamente las solicitudes pendientes.
  if (parsed.data.isPrivate === false) {
    await db
      .update(follows)
      .set({ status: 'accepted' })
      .where(and(eq(follows.followingId, userId), eq(follows.status, 'pending')));
  }

  const p = await getMyProfile(userId);
  return Response.json({ ok: true, profile: { username: p!.username, bio: p!.bio, isPrivate: p!.isPrivate } });
};
