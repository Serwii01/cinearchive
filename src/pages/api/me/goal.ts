import type { APIRoute } from 'astro';
import { z } from 'zod';
import { setGoal, yearGoal } from '../../../lib/viewings';

export const prerender = false;

const unauthorized = () => new Response(JSON.stringify({ error: 'unauthorized' }), { status: 401 });

// El año en curso, el anterior (para quien lo apunta el 2 de enero) y el
// siguiente (para quien lo prepara en diciembre). Retos de 1990 no tienen sentido.
const yearOk = (y: number) => Math.abs(y - new Date().getUTCFullYear()) <= 1;

const schema = z.object({
  year: z.number().int().refine(yearOk),
  target: z.number().int().min(1).max(3650).nullable(),
});

/** PUT — pone, cambia o quita (target: null) el reto de un año. Devuelve el progreso. */
export const PUT: APIRoute = async ({ locals, request }) => {
  if (!locals.user) return unauthorized();
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return new Response(JSON.stringify({ error: 'invalid' }), { status: 400 });
  const { year, target } = parsed.data;
  await setGoal(locals.user.id, year, target);
  return Response.json({ ok: true, goal: await yearGoal(locals.user.id, year) });
};
