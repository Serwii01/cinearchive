import type { APIRoute } from 'astro';
import {
  getProfileByUsername,
  getConnections,
  followState,
  canViewActivity,
} from '../../../../lib/social';

export const prerender = false;

/** GET ?type=followers|following — lista de conexiones, respetando la privacidad. */
export const GET: APIRoute = async ({ params, url, locals }) => {
  const type = url.searchParams.get('type') === 'following' ? 'following' : 'followers';
  const target = await getProfileByUsername(params.username ?? '');
  if (!target) return new Response(JSON.stringify({ error: 'not_found' }), { status: 404 });

  const viewerId = locals.user?.id ?? null;
  const state = await followState(viewerId, target.userId);
  // Público: cualquiera. Privado: solo el propio usuario o seguidores aceptados.
  if (!canViewActivity(viewerId, target, state)) {
    return new Response(JSON.stringify({ error: 'forbidden' }), { status: 403 });
  }

  const results = await getConnections(target.userId, type);
  return Response.json({ type, results });
};
