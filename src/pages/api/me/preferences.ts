import type { APIRoute } from 'astro';
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { db } from '../../../db/client';
import { userPreferences } from '../../../db/schema';
import { invalidateRecommendations } from '../../../lib/recs';

export const prerender = false;

function unauthorized() {
  return new Response(JSON.stringify({ error: 'unauthorized' }), { status: 401 });
}

/** GET — preferencias del usuario (creándolas por defecto si no existen). */
export const GET: APIRoute = async ({ locals }) => {
  if (!locals.user) return unauthorized();
  const [prefs] = await db
    .select()
    .from(userPreferences)
    .where(eq(userPreferences.userId, locals.user.id))
    .limit(1);
  return Response.json({
    preferences:
      prefs ?? {
        userId: locals.user.id,
        locale: 'es',
        favoriteGenres: [],
        favoriteDirectors: [],
        favoritePeople: [],
        theme: 'light',
        privacy: {},
      },
  });
};

const patchSchema = z.object({
  locale: z.enum(['es', 'en', 'gl', 'eu', 'ca']).optional(),
  favoriteGenres: z.array(z.number().int()).max(40).optional(),
  favoriteDirectors: z.array(z.string().max(120)).max(50).optional(),
  // Elegidos con el buscador de personas: con el id, recomendar no adivina.
  favoritePeople: z.array(z.object({ id: z.number().int().positive(), name: z.string().min(1).max(120) })).max(12).optional(),
  theme: z.enum(['light', 'dark']).optional(),
});

/** PATCH — actualizar preferencias. */
export const PATCH: APIRoute = async ({ locals, request }) => {
  if (!locals.user) return unauthorized();
  const parsed = patchSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return new Response(JSON.stringify({ error: 'invalid', issues: parsed.error.issues }), {
      status: 400,
    });
  }
  const data = parsed.data;
  // Los nombres se mantienen en favoriteDirectors por compatibilidad (y para
  // los que un usuario escribió a mano sin id). Si solo llegan personas con
  // id, los nombres se derivan de ahí.
  const favoritePeople = data.favoritePeople?.map((p) => ({ id: p.id, name: p.name.trim() }));
  const favoriteDirectors = data.favoriteDirectors ?? favoritePeople?.map((p) => p.name);

  await db
    .insert(userPreferences)
    .values({
      userId: locals.user.id,
      locale: data.locale ?? 'es',
      favoriteGenres: data.favoriteGenres ?? [],
      favoriteDirectors: favoriteDirectors ?? [],
      favoritePeople: favoritePeople ?? [],
      theme: data.theme ?? 'light',
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: userPreferences.userId,
      set: {
        ...(data.locale !== undefined ? { locale: data.locale } : {}),
        ...(data.favoriteGenres !== undefined ? { favoriteGenres: data.favoriteGenres } : {}),
        ...(favoriteDirectors !== undefined ? { favoriteDirectors } : {}),
        ...(favoritePeople !== undefined ? { favoritePeople } : {}),
        ...(data.theme !== undefined ? { theme: data.theme } : {}),
        updatedAt: new Date(),
      },
    });

  invalidateRecommendations(locals.user.id);
  return Response.json({ ok: true });
};
