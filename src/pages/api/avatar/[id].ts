import type { APIRoute } from 'astro';
import { eq } from 'drizzle-orm';
import { db } from '../../../db/client';
import { profile } from '../../../db/schema';

export const prerender = false;

/** GET — sirve la foto de perfil de un usuario por su id (imagen pública). */
export const GET: APIRoute = async ({ params, request }) => {
  const id = params.id!;
  const [row] = await db
    .select({ avatar: profile.avatar, avatarType: profile.avatarType, updatedAt: profile.avatarUpdatedAt })
    .from(profile)
    .where(eq(profile.userId, id))
    .limit(1);

  if (!row?.avatar || !row.avatarType) {
    return new Response(null, { status: 404 });
  }

  // ETag basado en la última actualización para revalidación barata.
  const etag = `"${row.updatedAt?.getTime() ?? 0}"`;
  if (request.headers.get('if-none-match') === etag) {
    return new Response(null, { status: 304, headers: { ETag: etag } });
  }

  const body = row.avatar as unknown as Buffer;
  return new Response(new Uint8Array(body), {
    status: 200,
    headers: {
      'Content-Type': row.avatarType,
      ETag: etag,
      // Privada por dispositivo; revalida con ETag para reflejar cambios pronto.
      'Cache-Control': 'private, max-age=0, must-revalidate',
    },
  });
};
