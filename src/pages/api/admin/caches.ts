import type { APIRoute } from 'astro';
import { z } from 'zod';
import { isAdmin } from '../../../lib/admin';
import { clearAllCaches, clearCache, listCaches } from '../../../lib/caches';

export const prerender = false;

const forbidden = () =>
  new Response(JSON.stringify({ error: 'forbidden' }), { status: 403 });

// `id: 'all'` vacía todas las que se puedan vaciar.
const schema = z.object({ id: z.string().min(1).max(64) });

/**
 * DELETE /api/admin/caches — vacía una caché en memoria, o todas.
 *
 * Sirve para lo de siempre: se corrige un dato en TMDB o en el fichero de
 * correcciones de cines y no quieres esperar a que caduque el TTL ni reiniciar
 * el contenedor entero, que además tiraría la caché de todo lo demás.
 *
 * El límite de peticiones NO se puede vaciar (está marcado como no vaciable en
 * su registro): hacerlo perdonaría de golpe a cualquier bot al que se esté
 * frenando en ese momento.
 */
export const DELETE: APIRoute = async ({ locals, request }) => {
  if (!isAdmin(locals.user)) return forbidden();

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return new Response(JSON.stringify({ error: 'invalid' }), { status: 400 });
  }

  const { id } = parsed.data;
  if (id === 'all') {
    return Response.json({ ok: true, vaciadas: clearAllCaches(), caches: listCaches() });
  }

  if (!clearCache(id)) {
    // No existe, o es una de las que no se dejan vaciar.
    return new Response(JSON.stringify({ error: 'not_clearable' }), { status: 400 });
  }
  return Response.json({ ok: true, vaciadas: 1, caches: listCaches() });
};
