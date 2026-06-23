import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { db } from '../db/client';
import { user, session, account, verification } from '../db/schema';

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
  },
  socialProviders,
  session: {
    expiresIn: 60 * 60 * 24 * 30, // 30 días
    updateAge: 60 * 60 * 24, // refresco diario
  },
  advanced: {
    cookiePrefix: 'cine',
  },
});

export type Auth = typeof auth;
/** Lista de proveedores sociales realmente configurados (para mostrar/ocultar botones). */
export const enabledSocialProviders = Object.keys(socialProviders);
