import type { APIRoute } from 'astro';
import { z } from 'zod';
import { isAdmin } from '../../../lib/admin';
import { emailConfigured } from '../../../lib/email';
import { CURRENT_ISSUE } from '../../../data/newsletter';
import { buildIssueEmail, currentJob, pendingRecipients, sendTest, sentCount, startSend } from '../../../lib/newsletter';
import { normalizeLang } from '../../../i18n/ui';

export const prerender = false;

const forbidden = () => new Response(JSON.stringify({ error: 'forbidden' }), { status: 403 });

/**
 * GET — estado del número actual: a cuántos les falta, a cuántos les ha
 * llegado y cómo va el envío. Con `?preview=<idioma>`, el correo tal como
 * llegará (HTML), para revisarlo antes de mandarlo.
 */
export const GET: APIRoute = async ({ locals, url }) => {
  if (!isAdmin(locals.user)) return forbidden();
  const preview = url.searchParams.get('preview');
  if (preview) {
    const correo = buildIssueEmail(CURRENT_ISSUE, normalizeLang(preview), locals.user!.id);
    return new Response(correo.html, { headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' } });
  }
  const [pendientes, enviados] = await Promise.all([pendingRecipients(CURRENT_ISSUE.id), sentCount(CURRENT_ISSUE.id)]);
  return Response.json({
    issue: CURRENT_ISSUE.id,
    subject: CURRENT_ISSUE.copy.es.subject,
    pending: pendientes.length,
    sent: enviados,
    configured: emailConfigured(),
    job: currentJob(),
  });
};

const schema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('test'), lang: z.string().max(5).optional() }),
  /** Hay que repetir el id del número: así un clic perdido no lo manda. */
  z.object({ action: z.literal('send'), confirm: z.string() }),
]);

/**
 * POST — { action: 'test' } manda el número al propio administrador (nunca a
 * una dirección que venga en la petición); { action: 'send', confirm: <id> }
 * arranca el envío a todos los pendientes en segundo plano.
 */
export const POST: APIRoute = async ({ locals, request }) => {
  if (!isAdmin(locals.user) || !locals.user?.email) return forbidden();
  if (!emailConfigured()) return Response.json({ ok: false, error: 'sin-clave' }, { status: 409 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: 'invalid' }, { status: 400 });
  if (parsed.data.action === 'test') {
    const ok = await sendTest({ id: locals.user.id, email: locals.user.email }, normalizeLang(parsed.data.lang));
    return Response.json({ ok, to: locals.user.email }, { status: ok ? 200 : 502 });
  }
  if (parsed.data.confirm !== CURRENT_ISSUE.id) return Response.json({ error: 'confirm' }, { status: 400 });
  const job = await startSend(CURRENT_ISSUE);
  return Response.json({ ok: true, job });
};
