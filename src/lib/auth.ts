import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { db } from '../db/client';
import { user, session, account, verification } from '../db/schema';
import { sendEmail } from './email';

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
    // Envía el enlace de restablecimiento por correo (Resend). Sin clave de email,
    // no se envía nada (el login social sigue funcionando igual).
    sendResetPassword: async ({ user: u, url }) => {
      await sendEmail({
        to: u.email,
        subject: 'Restablecer tu contraseña — Cine Archive',
        text: `Has solicitado restablecer tu contraseña en Cine Archive.\n\nAbre este enlace para crear una nueva: ${url}\n\nSi no fuiste tú, ignora este correo.`,
        html: `<p>Has solicitado restablecer tu contraseña en <strong>Cine Archive</strong>.</p>
<p><a href="${url}">Crear una contraseña nueva</a></p>
<p style="color:#666;font-size:14px">Si no fuiste tú, puedes ignorar este correo.</p>`,
      });
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
      '/forget-password': { window: 60, max: 5 },
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
