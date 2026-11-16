/**
 * Lo común a las rutas del foro: quién escribe y las respuestas de error.
 * Para escribir hace falta sesión y perfil (@usuario), como para dar «me gusta».
 */
import { getMyProfile } from '../../../lib/social';
import { isAdmin } from '../../../lib/admin';

export const json = (status: number, body: object) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

export async function escritor(locals: App.Locals): Promise<{ userId: string; admin: boolean } | Response> {
  if (!locals.user) return json(401, { error: 'unauthorized' });
  if (!(await getMyProfile(locals.user.id))) return json(400, { error: 'need_profile' });
  return { userId: locals.user.id, admin: isAdmin(locals.user) };
}
