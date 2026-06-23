import { defineMiddleware } from 'astro:middleware';
import { auth } from './lib/auth';

/**
 * - Carga la sesión (si existe) en Astro.locals para las rutas SSR.
 * - Protege las páginas privadas redirigiendo a /{lang}/login.
 * - Añade cabeceras de seguridad a todas las respuestas (defensa en profundidad;
 *   en producción Caddy añade además CSP y HSTS).
 */

const PROTECTED = ['/account', '/watchlist', '/recommendations'];

function harden(response: Response): Response {
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-DNS-Prefetch-Control', 'off');
  response.headers.set(
    'Permissions-Policy',
    'camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()',
  );
  return response;
}

export const onRequest = defineMiddleware(async (context, next) => {
  const { request, url } = context;

  // Las páginas prerenderizadas (editoriales) no tienen sesión de servidor: su
  // cabecera resuelve el estado de login en el cliente vía /api/auth/get-session.
  if (context.isPrerendered) {
    context.locals.user = null;
    context.locals.session = null;
    return harden(await next());
  }

  // Recuperar la sesión a partir de las cookies de la petición.
  const session = await auth.api.getSession({ headers: request.headers }).catch(() => null);

  context.locals.user = session?.user ?? null;
  context.locals.session = session?.session ?? null;

  // Protección de rutas privadas (solo páginas, no assets ni API).
  const path = url.pathname;
  const lang = path.startsWith('/en') ? 'en' : 'es';
  const stripped = path.replace(/^\/(es|en)/, '');
  const isProtected = PROTECTED.some((p) => stripped === p || stripped.startsWith(p + '/'));

  if (isProtected && !context.locals.user) {
    const back = encodeURIComponent(path);
    return harden(context.redirect(`/${lang}/login?next=${back}`));
  }

  return harden(await next());
});
