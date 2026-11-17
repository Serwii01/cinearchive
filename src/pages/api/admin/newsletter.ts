import type { APIRoute } from 'astro';
import { z } from 'zod';
import { isAdmin } from '../../../lib/admin';
import { emailConfigured } from '../../../lib/email';
import { CURRENT_ISSUE } from '../../../data/newsletter';
import {
  buildIssueEmail,
  currentJob,
  deleteDraft,
  draftSchema,
  getIssue,
  listIssues,
  pendingRecipients,
  saveDraft,
  sendTest,
  sentCount,
  startSend,
} from '../../../lib/newsletter';
import { normalizeLang } from '../../../i18n/ui';

export const prerender = false;

const forbidden = () => new Response(JSON.stringify({ error: 'forbidden' }), { status: 403 });

/**
 * GET — sin parámetros: la lista de correos (los escritos aquí y los fijos) y
 * el estado del envío. Con `?issue=<id>`: ese correo, su texto y a cuántos les
 * falta y les ha llegado. Con `?preview=<idioma>&issue=<id>`: el correo tal
 * como llegará (HTML), para revisarlo antes de mandarlo.
 */
export const GET: APIRoute = async ({ locals, url }) => {
  if (!isAdmin(locals.user)) return forbidden();
  const id = url.searchParams.get('issue') ?? CURRENT_ISSUE.id;
  const preview = url.searchParams.get('preview');
  if (preview) {
    const issue = await getIssue(id);
    if (!issue) return new Response('no existe', { status: 404 });
    const correo = buildIssueEmail(issue, normalizeLang(preview), locals.user!.id);
    return new Response(correo.html, { headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' } });
  }
  if (url.searchParams.has('issue')) {
    const issue = await getIssue(id);
    if (!issue) return Response.json({ error: 'not_found' }, { status: 404 });
    const [pendientes, enviados] = await Promise.all([pendingRecipients(id), sentCount(id)]);
    return Response.json({ issue, pending: pendientes.length, sent: enviados, configured: emailConfigured(), job: currentJob() });
  }
  return Response.json({ issues: await listIssues(), current: CURRENT_ISSUE.id, configured: emailConfigured(), job: currentJob() });
};

const schema = z.discriminatedUnion('action', [
  /** Guardar un borrador (nuevo si no trae id). */
  z.object({ action: z.literal('save'), id: z.string().max(80).optional(), copy: draftSchema }),
  z.object({ action: z.literal('delete'), id: z.string().max(80) }),
  z.object({ action: z.literal('test'), issue: z.string().max(80), lang: z.string().max(5).optional() }),
  /** Hay que repetir el id del correo: así un clic perdido no lo manda. */
  z.object({ action: z.literal('send'), issue: z.string().max(80), confirm: z.string() }),
]);

/**
 * POST — save / delete un borrador; test lo manda al propio administrador
 * (nunca a una dirección que venga en la petición); send arranca el envío a
 * todos los pendientes de ese correo, en segundo plano.
 */
export const POST: APIRoute = async ({ locals, request }) => {
  if (!isAdmin(locals.user) || !locals.user?.email) return forbidden();
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: 'invalid', issues: parsed.error.issues.slice(0, 5) }, { status: 400 });
  const d = parsed.data;

  if (d.action === 'save') {
    const r = await saveDraft(d.copy, d.id);
    return 'error' in r ? Response.json(r, { status: 409 }) : Response.json({ ok: true, id: r.id });
  }
  if (d.action === 'delete') {
    return (await deleteDraft(d.id)) ? Response.json({ ok: true }) : Response.json({ error: 'not_deleted' }, { status: 409 });
  }

  if (!emailConfigured()) return Response.json({ ok: false, error: 'sin-clave' }, { status: 409 });
  const issue = await getIssue(d.issue);
  if (!issue) return Response.json({ error: 'not_found' }, { status: 404 });
  if (d.action === 'test') {
    const ok = await sendTest({ id: locals.user.id, email: locals.user.email }, normalizeLang(d.lang), issue);
    return Response.json({ ok, to: locals.user.email }, { status: ok ? 200 : 502 });
  }
  if (d.confirm !== issue.id) return Response.json({ error: 'confirm' }, { status: 400 });
  const job = await startSend(issue);
  return Response.json({ ok: true, job });
};
