import type { APIRoute } from 'astro';
import { z } from 'zod';
import { renderBodies } from '../../../lib/forumcites';
import { BODY_MAX, cleanText } from '../../../lib/forum';
import { rateLimit } from '../../../lib/ratelimit';
import { normalizeLang } from '../../../i18n/ui';
import { json } from './_comun';

export const prerender = false;

const schema = z.object({ body: z.string().max(BODY_MAX + 200), lang: z.string().max(5).optional() });

/** POST — cómo quedará un mensaje (con las tarjetas de sus citas) antes de publicarlo. */
export const POST: APIRoute = async ({ locals, request }) => {
  if (!locals.user) return json(401, { error: 'unauthorized' });
  if (!rateLimit(`forum:preview:${locals.user.id}`, 30, 60_000)) return json(429, { error: 'rate_limited' });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return json(400, { error: 'invalid' });
  const [html] = await renderBodies([cleanText(parsed.data.body)], normalizeLang(parsed.data.lang ?? 'es'));
  return json(200, { html });
};
