import type { APIRoute } from 'astro';
import { z } from 'zod';
import { addViewing, deleteViewing, filmViewings, listViewings } from '../../../lib/viewings';
import { fechaVista } from '../../../lib/filmstate';

export const prerender = false;

const unauthorized = () => new Response(JSON.stringify({ error: 'unauthorized' }), { status: 401 });
const bad = (error: string) => new Response(JSON.stringify({ error }), { status: 400 });

/** GET — el diario entero, un año (?year=2026) o una película (?tmdbId=603). */
export const GET: APIRoute = async ({ locals, url }) => {
  if (!locals.user) return unauthorized();
  const id = Number(url.searchParams.get('tmdbId'));
  if (Number.isInteger(id) && id > 0) return Response.json({ viewings: await filmViewings(locals.user.id, id) });
  const y = Number(url.searchParams.get('year'));
  const year = Number.isInteger(y) && y > 1880 && y < 3000 ? y : undefined;
  return Response.json({ viewings: await listViewings(locals.user.id, year) });
};

const addSchema = z.object({
  tmdbId: z.number().int().positive(),
  watchedOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

/** POST — apunta un visionado. 409 si ya había uno de esa película ese día. */
export const POST: APIRoute = async ({ locals, request }) => {
  if (!locals.user) return unauthorized();
  const parsed = addSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return bad('invalid');
  // Mismas reglas que «cuándo la vi»: fecha real y no futura.
  if (!fechaVista(parsed.data.watchedOn)) return bad('fecha_invalida');
  const added = await addViewing(locals.user.id, parsed.data.tmdbId, parsed.data.watchedOn);
  if (!added) return new Response(JSON.stringify({ error: 'duplicate' }), { status: 409 });
  return Response.json({ ok: true });
};

const deleteSchema = z.object({ id: z.number().int().positive() });

/** DELETE — borra un visionado propio. */
export const DELETE: APIRoute = async ({ locals, request }) => {
  if (!locals.user) return unauthorized();
  const parsed = deleteSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return bad('invalid');
  const ok = await deleteViewing(locals.user.id, parsed.data.id);
  return ok ? Response.json({ ok: true }) : new Response(JSON.stringify({ error: 'not_found' }), { status: 404 });
};
