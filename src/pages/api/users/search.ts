import type { APIRoute } from 'astro';
import { or, ilike, eq } from 'drizzle-orm';
import { db } from '../../../db/client';
import { profile, user } from '../../../db/schema';

export const prerender = false;

/** GET ?q= — busca usuarios por username o nombre (solo para usuarios autenticados). */
export const GET: APIRoute = async ({ locals, url }) => {
  if (!locals.user) return new Response(JSON.stringify({ error: 'unauthorized' }), { status: 401 });

  const raw = (url.searchParams.get('q') ?? '').trim().slice(0, 40);
  if (raw.length < 2) return Response.json({ results: [] });

  // Escapa comodines de LIKE para que la búsqueda sea literal.
  const term = `%${raw.replace(/[\\%_]/g, (c) => '\\' + c)}%`;

  const rows = await db
    .select({
      userId: profile.userId,
      username: profile.username,
      name: user.name,
      isPrivate: profile.isPrivate,
      hasAvatar: profile.avatarType,
    })
    .from(profile)
    .innerJoin(user, eq(user.id, profile.userId))
    .where(or(ilike(profile.username, term), ilike(user.name, term)))
    .limit(20);

  return Response.json({
    results: rows.map((r) => ({
      id: r.userId,
      username: r.username,
      name: r.name,
      isPrivate: r.isPrivate,
      hasAvatar: !!r.hasAvatar,
    })),
  });
};
