import type { APIRoute } from 'astro';
import { z } from 'zod';
import { db } from '../../../db/client';
import { userPreferences } from '../../../db/schema';
import { WATCH_REGIONS } from '../../../data/countries';

export const prerender = false;

const schema = z.object({
  region: z.enum(WATCH_REGIONS),
  providers: z.array(z.number().int().positive()).max(40),
  email: z.boolean(),
});

/** PUT — ajustes de los avisos de «ya está en tu plataforma». */
export const PUT: APIRoute = async ({ locals, request }) => {
  if (!locals.user) return new Response(JSON.stringify({ error: 'unauthorized' }), { status: 401 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return new Response(JSON.stringify({ error: 'invalid' }), { status: 400 });
  const { region, providers, email } = parsed.data;
  const set = { watchRegion: region, watchProviders: [...new Set(providers)], alertsEmail: email, updatedAt: new Date() };
  await db
    .insert(userPreferences)
    .values({ userId: locals.user.id, ...set })
    .onConflictDoUpdate({ target: userPreferences.userId, set });
  return Response.json({ ok: true });
};
