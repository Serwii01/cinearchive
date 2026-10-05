import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { db } from '../db/client';
import { user, session, account, verification } from '../db/schema';
import { sendEmail, emailConfigured } from './email';
import { langFromRequest, verificationEmail, resetEmail, withCallback } from './emails';
import { localizePath } from '../i18n/ui';

/**
 * Configuración de Better Auth (solo servidor).
 *
 * Todos los secretos se leen de variables de entorno SIN prefijo PUBLIC_, de modo
 * que nunca se incluyen en el bundle de cliente. Los proveedores sociales solo se
 * activan si sus credenciales están presentes, así la app arranca aunque falten.
 */

const secret = process.env.BETTER_AUTH_SECRET ?? 'insecure-build-time-placeholder-change-me';
const baseURL =
  process.env.BETTER_AUTH_URL ?? process.env.SITE_URL ?? 'http://localhost:4321';

// Orígenes de confianza (protección CSRF). En desarrollo permitimos cualquier
// puerto de localhost/127.0.0.1, porque el dev server puede cambiar de puerto.
// En producción solo se confía en el dominio real (baseURL).
const isLocal = baseURL.includes('localhost') || baseURL.includes('127.0.0.1');
const devOrigins: string[] = [];
for (let p = 4321; p <= 4340; p++) {
  devOrigins.push(`http://localhost:${p}`, `http://127.0.0.1:${p}`);
}
const trustedOrigins = isLocal
  ? ['http://localhost:*', 'http://127.0.0.1:*', ...devOrigins]
  : [baseURL];

/**
 * ¿Hay que confirmar el correo para poder entrar?
 *
 * Por defecto sí, pero solo si hay forma de enviar correos: si no hubiera
 * remitente configurado, exigirlo dejaría a todo el que se registre encerrado
 * fuera de su propia cuenta. REQUIRE_EMAIL_VERIFICATION permite forzarlo a mano
 * ('true'/'false') cuando se quiera probar lo contrario.
 */
function readRequireVerification(): boolean {
  const flag = (process.env.REQUIRE_EMAIL_VERIFICATION ?? '').trim().toLowerCase();
  if (flag === 'true' || flag === '1') return true;
  if (flag === 'false' || flag === '0') return false;
  return emailConfigured();
}

export const requireEmailVerification = readRequireVerification();
if (!requireEmailVerification) {
  console.warn(
    '[auth] Las cuentas nuevas NO tienen que confirmar el correo' +
      (emailConfigured() ? ' (REQUIRE_EMAIL_VERIFICATION=false).' : ': falta RESEND_API_KEY.'),
  );
}

const socialProviders: Record<string, { clientId: string; clientSecret: string }> = {};
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  socialProviders.google = {
    clientId: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  };
}
if (process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET) {
  socialProviders.github = {
    clientId: process.env.GITHUB_CLIENT_ID,
    clientSecret: process.env.GITHUB_CLIENT_SECRET,
  };
}

export const auth = betterAuth({
  secret,
  baseURL,
  trustedOrigins,
  database: drizzleAdapter(db, {
    provider: 'pg',
    schema: { user, session, account, verification },
  }),
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
    // Sin confirmar el correo no se entra: ni con contraseña ni recién creada la
    // cuenta (autoSignIn apagado, que si no Better Auth abre sesión al registrarse
    // aunque la dirección esté sin verificar).
    requireEmailVerification,
    autoSignIn: !requireEmailVerification,
    // El enlace de restablecimiento caduca en una hora: es una llave para entrar
    // en la cuenta y no tiene por qué durar más.
    resetPasswordTokenExpiresIn: 60 * 60,
    // Envía el enlace de restablecimiento por correo (Resend), en el idioma desde
    // el que se pidió. Sin clave de email no se envía nada (el login social sigue
    // funcionando igual).
    sendResetPassword: async ({ user: u, url }, request) => {
      const lang = langFromRequest(request);
      console.log('[auth] restablecer contraseña solicitado para', u.email, `(${lang})`);
      await sendEmail({ to: u.email, ...resetEmail(lang, url) });
    },
  },
  emailVerification: {
    // Al registrarse sale el correo; si alguien intenta entrar sin haber
    // confirmado, se le manda uno nuevo en vez de dejarlo con un enlace caducado.
    sendOnSignUp: true,
    sendOnSignIn: true,
    autoSignInAfterVerification: true,
    expiresIn: 60 * 60 * 24, // 24 horas
    sendVerificationEmail: async ({ user: u, url }, request) => {
      const lang = langFromRequest(request);
      console.log('[auth] confirmación de correo enviada a', u.email, `(${lang})`);
      const destino = withCallback(url, localizePath(lang, 'verify'));
      await sendEmail({ to: u.email, ...verificationEmail(lang, destino) });
    },
  },
  socialProviders,
  session: {
    expiresIn: 60 * 60 * 24 * 30, // 30 días
    updateAge: 60 * 60 * 24, // refresco diario
  },
  // Límite de peticiones (anti fuerza bruta). Más estricto en /sign-in/sign-up.
  rateLimit: {
    enabled: true,
    window: 60, // segundos
    max: 60, // peticiones por ventana e IP (global)
    customRules: {
      '/sign-in/email': { window: 60, max: 8 },
      '/sign-up/email': { window: 60, max: 5 },
      // Ojo al nombre: la ruta es /request-password-reset; /forget-password ya no
      // existe y una regla con el nombre viejo no limita nada.
      '/request-password-reset': { window: 60, max: 5 },
      // Reenviar la confirmación y cambiar la contraseña con el token: pocas
      // veces por minuto, que son correos a terceros y llaves de entrada.
      '/send-verification-email': { window: 60, max: 3 },
      '/reset-password': { window: 60, max: 5 },
    },
  },
  advanced: {
    cookiePrefix: 'cine',
    // Detrás de Caddy, la IP real del cliente llega en X-Forwarded-For; así el
    // rate limiting anti fuerza-bruta del login cuenta por IP real, no compartida.
    ipAddress: {
      ipAddressHeaders: ['x-forwarded-for', 'x-real-ip'],
    },
    // En producción (HTTPS) fuerza cookies seguras; en local (http) no, para que
    // el desarrollo funcione.
    useSecureCookies: !isLocal,
    defaultCookieAttributes: {
      httpOnly: true,
      sameSite: 'lax',
    },
  },
});

export type Auth = typeof auth;
/** Lista de proveedores sociales realmente configurados (para mostrar/ocultar botones). */
export const enabledSocialProviders = Object.keys(socialProviders);
