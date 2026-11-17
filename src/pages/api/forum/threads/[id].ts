import type { APIRoute } from 'astro';
import { z } from 'zod';
import { hideThread, editThread, validateThread, BODY_MAX, TITLE_MAX } from '../../../../lib/forum';
import { rateLimit } from '../../../../lib/ratelimit';
import { escritor, json } from '../_comun';

export const prerender = false;

/** DELETE — oculta un hilo (su autor o un administrador). */
export const DELETE: APIRoute = async ({ locals, params }) => {
  const w = await escritor(locals);
  if (w instanceof Response) return w;
  const id = Number(params.id);
  if (!Number.isInteger(id) || id <= 0) return json(400, { error: 'invalid' });
  return (await hideThread(id, w)) ? json(200, { ok: true }) : json(404, { error: 'not_found' });
};

const editSchema = z.object({ title: z.string().max(TITLE_MAX + 20), body: z.string().max(BODY_MAX + 200) });

/** PATCH — su autor corrige el título o el mensaje con el que abrió el hilo. */
export const PATCH: APIRoute = async ({ locals, params, request }) => {
  const w = await escritor(locals);
  if (w instanceof Response) return w;
  if (!rateLimit(`forum:edit:${w.userId}`, 10, 60_000)) return json(429, { error: 'rate_limited' });
  const id = Number(params.id);
  const parsed = editSchema.safeParse(await request.json().catch(() => null));
  if (!Number.isInteger(id) || id <= 0 || !parsed.success) return json(400, { error: 'invalid' });
  // La categoría no cambia al editar: se valida con una que vale.
  const motivo = validateThread({ ...parsed.data, category: 'general' });
  if (motivo) return json(400, { error: motivo });
  return (await editThread(w.userId, id, parsed.data)) ? json(200, { ok: true }) : json(404, { error: 'not_found' });
};
