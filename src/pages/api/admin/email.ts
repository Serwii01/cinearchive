import type { APIRoute } from 'astro';
import { isAdmin } from '../../../lib/admin';
import { sendEmail, emailConfigured } from '../../../lib/email';
import { testEmail } from '../../../lib/emails';
import { requireEmailVerification } from '../../../lib/auth';

export const prerender = false;

const forbidden = () => new Response(JSON.stringify({ error: 'forbidden' }), { status: 403 });

/** GET /api/admin/email — estado del envío de correo (sin tocar nada). */
export const GET: APIRoute = ({ locals }) => {
  if (!isAdmin(locals.user)) return forbidden();
  return Response.json({
    ok: true,
    configurado: emailConfigured(),
    remitente: process.env.EMAIL_FROM || null,
    verificacionObligatoria: requireEmailVerification,
  });
};

/**
 * POST /api/admin/email — envía un correo de prueba al propio administrador.
 *
 * Es la forma de saber si Resend y el dominio del remitente están bien ANTES de
 * exigir la confirmación a los usuarios: si esto no llega, tampoco llegarán los
 * enlaces de confirmación ni los de contraseña. Siempre al correo de la sesión,
 * nunca a una dirección que venga en la petición: así el panel no se puede usar
 * para mandar correos a terceros.
 */
export const POST: APIRoute = async ({ locals }) => {
  if (!isAdmin(locals.user)) return forbidden();
  const to = locals.user?.email;
  if (!to) return forbidden();
  if (!emailConfigured()) {
    return Response.json({ ok: false, error: 'sin-clave' }, { status: 409 });
  }
  const site = process.env.SITE_URL || process.env.BETTER_AUTH_URL || 'https://cinearchive.es';
  const enviado = await sendEmail({ to, ...testEmail(site) });
  return Response.json({ ok: enviado, to, error: enviado ? undefined : 'rechazado' }, { status: enviado ? 200 : 502 });
};
