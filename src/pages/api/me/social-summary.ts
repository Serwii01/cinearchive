import type { APIRoute } from 'astro';
import { getMyProfile, notificationCount } from '../../../lib/social';

export const prerender = false;

/**
 * Resumen social del usuario para el navbar: username y avatar (para el enlace a
 * su perfil) y nº de notificaciones sin ver (para el badge). Una sola llamada.
 */
export const GET: APIRoute = async ({ locals }) => {
  if (!locals.user) return Response.json({ authenticated: false });

  const profile = await getMyProfile(locals.user.id);
  const notifications = profile ? await notificationCount(locals.user.id) : 0;

  return Response.json({
    authenticated: true,
    userId: locals.user.id,
    name: locals.user.name,
    username: profile?.username ?? null,
    hasAvatar: !!profile?.avatarType,
    notifications,
  });
};
