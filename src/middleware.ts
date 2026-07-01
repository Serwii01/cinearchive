import { defineMiddleware } from 'astro:middleware';
import { auth } from './lib/auth';
import { check, clientIp, tooMany } from './lib/ratelimit';
import { isAdmin } from './lib/admin';

/**
 * - Carga la sesión (si existe) en Astro.locals para las rutas SSR.
 * - Protege las páginas privadas redirigiendo a /{lang}/login.
 * - Añade cabeceras de seguridad a todas las respuestas (defensa en profundidad;
 *   en producción Caddy añade además CSP y HSTS).
 */

const PROTECTED = ['/account', '/watchlist', '/recommendations', '/stats', '/lists'];

// Recursos baratos (assets, portadas cacheadas): no se cuentan en el límite por IP
// para no penalizar una carga de página normal (que dispara muchas imágenes).
const STATIC_PREFIX = /^\/(_astro\/|fonts\/|cover\/)/;
const STATIC_FILE = /^\/(favicon|theme-init\.js|robots\.txt|sitemap|manifest)/;
const STATIC_EXT = /\.(?:css|js|woff2?|png|jpe?g|svg|webp|ico|xml|txt)$/i;
const isStatic = (p: string) => STATIC_PREFIX.test(p) || STATIC_FILE.test(p) || STATIC_EXT.test(p);

// Límite global por IP y minuto (defensa frente a inundación de peticiones).
// Generoso para un humano real; corta bots que martillean el servidor.
const LIMIT_WEB = 150; // páginas dinámicas
const LIMIT_API = 80; // endpoints /api/*

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
  const path = url.pathname;

  // Límite global por IP: primera barrera de la app contra inundación de
  // peticiones. Los assets estáticos no se cuentan (los amortigua Caddy).
  // En build (prerender) no aplica: esas páginas no pasan por aquí en runtime.
  if (!context.isPrerendered && !isStatic(path)) {
    const isApi = path.startsWith('/api/');
    const { ok, retryAfter } = check(
      `${isApi ? 'api' : 'web'}:${clientIp(request)}`,
      isApi ? LIMIT_API : LIMIT_WEB,
      60_000,
    );
    if (!ok) return harden(tooMany(retryAfter));
  }

  // CSRF (defensa en profundidad): en escrituras a la API, si llega cabecera
  // Origin y no es del propio sitio, se rechaza. Las cookies son SameSite=Lax
  // (que ya impide su envío entre sitios en POST/fetch); esto es una capa extra.
  // Se excluye /api/auth/* porque Better Auth valida sus propios orígenes.
  const method = request.method;
  const isWrite = method === 'POST' || method === 'PUT' || method === 'PATCH' || method === 'DELETE';
  if (isWrite && path.startsWith('/api/') && !path.startsWith('/api/auth/')) {
    const origin = request.headers.get('origin');
    if (origin) {
      let sameOrigin = false;
      try {
        sameOrigin = new URL(origin).host === url.host;
      } catch {
        sameOrigin = false;
      }
      if (!sameOrigin) {
        return harden(
          new Response(JSON.stringify({ error: 'bad_origin' }), {
            status: 403,
            headers: { 'content-type': 'application/json' },
          }),
        );
      }
    }
  }

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
  const lang = path.startsWith('/en') ? 'en' : 'es';
  const stripped = path.replace(/^\/(es|en)/, '');
  const isProtected = PROTECTED.some((p) => stripped === p || stripped.startsWith(p + '/'));

  if (isProtected && !context.locals.user) {
    const back = encodeURIComponent(path);
    return harden(context.redirect(`/${lang}/login?next=${back}`));
  }

  // Panel de administración: solo cuentas de ADMIN_EMAILS (la API responde 403; las
  // páginas redirigen). Aunque se adivine la URL, sin ser admin no se entra.
  const isApiAdmin = path.startsWith('/api/admin/');
  const isAdminPage = stripped === '/admin' || stripped.startsWith('/admin/');
  if (isApiAdmin || isAdminPage) {
    if (!isAdmin(context.locals.user)) {
      if (isApiAdmin) {
        return harden(
          new Response(JSON.stringify({ error: 'forbidden' }), {
            status: 403,
            headers: { 'content-type': 'application/json' },
          }),
        );
      }
      if (!context.locals.user) {
        return harden(context.redirect(`/${lang}/login?next=${encodeURIComponent(path)}`));
      }
      return harden(context.redirect(`/${lang}`)); // logueado pero no admin → fuera
    }
  }

  return harden(await next());
});
