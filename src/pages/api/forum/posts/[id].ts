import type { APIRoute } from 'astro';
import { z } from 'zod';
import { hidePost, editPost, cleanText, BODY_MAX } from '../../../../lib/forum';
import { rateLimit } from '../../../../lib/ratelimit';
import { escritor, json } from '../_comun';

export const prerender = false;

const idDe = (p: string | undefined) => {
  const id = Number(p);
  return Number.isInteger(id) && id > 0 ? id : null;
};

/** DELETE — oculta una respuesta (su autor o un administrador). */
export const DELETE: APIRoute = async ({ locals, params }) => {
  const w = await escritor(locals);
  if (w instanceof Response) return w;
  const id = idDe(params.id);
  if (!id) return json(400, { error: 'invalid' });
  return (await hidePost(id, w)) ? json(200, { ok: true }) : json(404, { error: 'not_found' });
};

const editSchema = z.object({ body: z.string().max(BODY_MAX + 200) });

/** PATCH — su autor corrige una respuesta. Diez ediciones por minuto. */
export const PATCH: APIRoute = async ({ locals, params, request }) => {
  const w = await escritor(locals);
  if (w instanceof Response) return w;
  if (!rateLimit(`forum:edit:${w.userId}`, 10, 60_000)) return json(429, { error: 'rate_limited' });
  const id = idDe(params.id);
  const parsed = editSchema.safeParse(await request.json().catch(() => null));
  if (!id || !parsed.success) return json(400, { error: 'invalid' });
  const body = cleanText(parsed.data.body);
  if (!body || body.length > BODY_MAX) return json(400, { error: 'body' });
  const r = await editPost(w.userId, id, body);
  return r === 'not_found' ? json(404, { error: 'not_found' }) : json(200, { ok: true });
};
