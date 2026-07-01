import type { APIRoute } from 'astro';
import { eq } from 'drizzle-orm';
import { db } from '../../../db/client';
import { profile } from '../../../db/schema';
import { MAX_AVATAR_BYTES, sniffImageType } from '../../../lib/avatar';
import { getMyProfile } from '../../../lib/social';
import { check, tooMany } from '../../../lib/ratelimit';

export const prerender = false;

const unauthorized = () => new Response(JSON.stringify({ error: 'unauthorized' }), { status: 401 });
const bad = (error: string, status = 400) => new Response(JSON.stringify({ error }), { status });

/** POST — sube la foto de perfil (cuerpo = bytes de la imagen). */
export const POST: APIRoute = async ({ locals, request }) => {
  if (!locals.user) return unauthorized();
  const rl = check(`avatar:${locals.user.id}`, 10, 60_000);
  if (!rl.ok) return tooMany(rl.retryAfter);
  if (!(await getMyProfile(locals.user.id))) return bad('no_profile');

  // Rechaza pronto por cabecera antes de bufferizar el cuerpo entero.
  const declared = Number(request.headers.get('content-length') ?? '0');
  if (declared > MAX_AVATAR_BYTES) return bad('too_large', 413);

  const buf = Buffer.from(await request.arrayBuffer());
  if (buf.length === 0) return bad('empty');
  if (buf.length > MAX_AVATAR_BYTES) return bad('too_large', 413);

  const type = sniffImageType(buf);
  if (!type) return bad('bad_type', 415);

  await db
    .update(profile)
    .set({ avatar: buf, avatarType: type, avatarUpdatedAt: new Date(), updatedAt: new Date() })
    .where(eq(profile.userId, locals.user.id));

  return Response.json({ ok: true });
};

/** DELETE — quita la foto de perfil. */
export const DELETE: APIRoute = async ({ locals }) => {
  if (!locals.user) return unauthorized();
  await db
    .update(profile)
    .set({ avatar: null, avatarType: null, avatarUpdatedAt: new Date(), updatedAt: new Date() })
    .where(eq(profile.userId, locals.user.id));
  return Response.json({ ok: true });
};
