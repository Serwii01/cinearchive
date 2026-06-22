import type { APIRoute } from 'astro';
import { getRecommendations } from '../../../lib/recs';

export const prerender = false;

export const GET: APIRoute = async ({ locals, url }) => {
  if (!locals.user) {
    return new Response(JSON.stringify({ error: 'unauthorized' }), { status: 401 });
  }
  const lang = url.searchParams.get('lang') === 'en' ? 'en' : 'es';
  try {
    const recommendations = await getRecommendations(locals.user.id, lang);
    return Response.json({ recommendations });
  } catch {
    return new Response(JSON.stringify({ error: 'failed' }), { status: 500 });
  }
};
