import type { APIRoute } from 'astro';
import { hideThread } from '../../../../lib/forum';
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
