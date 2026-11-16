import type { APIRoute } from 'astro';
import { setNewsEmail, verifyUnsubscribe } from '../../../lib/newsletter';
import { rateLimit, clientIp } from '../../../lib/ratelimit';

export const prerender = false;

/**
 * POST — baja de las novedades con el enlace firmado (u, t), sin iniciar sesión.
 *
 * Lo llaman dos cosas: el botón «Darme de baja» de /newsletter/baja (un
 * formulario normal, que vuelve a la página con ?hecho=1) y el propio cliente
 * de correo con la baja en un clic de RFC 8058 (cuerpo
 * «List-Unsubscribe=One-Click», al que basta con un 200). No hay GET a
 * propósito: los antivirus del correo abren los enlaces para revisarlos, y una
 * baja por GET daría de baja a gente que solo ha recibido el correo.
 */
export const POST: APIRoute = async ({ url, request }) => {
  if (!rateLimit(`news-unsub:${clientIp(request)}`, 30, 60_000)) return new Response('rate_limited', { status: 429 });
  const form = await request.formData().catch(() => null);
  const u = String(form?.get('u') ?? url.searchParams.get('u') ?? '');
  const t = String(form?.get('t') ?? url.searchParams.get('t') ?? '');
  if (!u || !t || !verifyUnsubscribe(u, t)) return new Response('invalid', { status: 400 });
  await setNewsEmail(u, false);
  const volver = form?.get('volver');
  if (typeof volver === 'string' && volver.startsWith('/') && !volver.startsWith('//')) {
    // A mano y no con Response.redirect: ese crea cabeceras inmutables, y el
    // middleware les añade las de seguridad (daba un 500).
    return new Response(null, { status: 303, headers: { location: `${volver}${volver.includes('?') ? '&' : '?'}hecho=1` } });
  }
  return new Response('ok', { status: 200 });
};
