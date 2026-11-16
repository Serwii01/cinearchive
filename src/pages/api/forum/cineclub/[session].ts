import type { APIRoute } from 'astro';
import { z } from 'zod';
import { sessionByKey, sessionState } from '../../../../lib/cineclub';
import { chatMessages, postChatMessage, hideChatMessage, CHAT_MAX } from '../../../../lib/cineclubchat';
import { cleanText } from '../../../../lib/forum';
import { rateLimit, clientIp } from '../../../../lib/ratelimit';
import { escritor, json } from '../_comun';

export const prerender = false;

/**
 * GET — mensajes nuevos de la sala (?after=id) y la hora del servidor, con la
 * que el navegador corrige su reloj para ir al mismo segundo que los demás.
 */
export const GET: APIRoute = async ({ params, url, request }) => {
  const s = sessionByKey(params.session ?? '');
  if (!s) return json(404, { error: 'not_found' });
  // Una sala con 30 personas pregunta cada 4 s: generoso, pero con techo.
  if (!rateLimit(`cineclub:get:${clientIp(request)}`, 40, 60_000)) return json(429, { error: 'rate_limited' });
  const after = Math.max(0, Number(url.searchParams.get('after')) || 0);
  const messages = await chatMessages(s.key, after);
  return new Response(JSON.stringify({ now: Date.now(), state: sessionState(s, Date.now()), messages }), {
    headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
  });
};

const schema = z.object({ body: z.string().max(CHAT_MAX + 50) });

/** POST — escribe en la sala, solo mientras está abierta (desde media hora antes hasta un rato después). */
export const POST: APIRoute = async ({ locals, params, request }) => {
  const w = await escritor(locals);
  if (w instanceof Response) return w;
  const s = sessionByKey(params.session ?? '');
  if (!s) return json(404, { error: 'not_found' });
  const estado = sessionState(s, Date.now());
  if (estado === 'upcoming' || estado === 'over') return json(409, { error: 'closed' });
  if (!rateLimit(`cineclub:post:${w.userId}`, 1, 3_000)) return json(429, { error: 'rate_limited' });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return json(400, { error: 'invalid' });
  const body = cleanText(parsed.data.body).replace(/\n+/g, ' ');
  if (!body || body.length > CHAT_MAX) return json(400, { error: 'body' });
  return json(200, { id: await postChatMessage(s.key, w.userId, body) });
};

/** DELETE — oculta un mensaje ({ id }), su autor o un administrador. */
export const DELETE: APIRoute = async ({ locals, request }) => {
  const w = await escritor(locals);
  if (w instanceof Response) return w;
  const id = Number((await request.json().catch(() => null))?.id);
  if (!Number.isInteger(id) || id <= 0) return json(400, { error: 'invalid' });
  return (await hideChatMessage(id, w)) ? json(200, { ok: true }) : json(404, { error: 'not_found' });
};
