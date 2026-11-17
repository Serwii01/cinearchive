/**
 * Lo común a las rutas del foro: quién escribe y las respuestas de error.
 * Para escribir o votar hace falta sesión y perfil (@usuario), como para dar
 * «me gusta», y no estar bloqueado en el foro (lib/forummod.ts).
 */
import { getMyProfile } from '../../../lib/social';
import { isAdmin } from '../../../lib/admin';
import { isBanned } from '../../../lib/forummod';

export const json = (status: number, body: object) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

export async function escritor(locals: App.Locals): Promise<{ userId: string; admin: boolean } | Response> {
  if (!locals.user) return json(401, { error: 'unauthorized' });
  if (!(await getMyProfile(locals.user.id))) return json(400, { error: 'need_profile' });
  if (await isBanned(locals.user.id)) return json(403, { error: 'banned' });
  return { userId: locals.user.id, admin: isAdmin(locals.user) };
}

/** Solo administradores (moderación). */
export function admin(locals: App.Locals): { userId: string } | Response {
  if (!locals.user) return json(401, { error: 'unauthorized' });
  if (!isAdmin(locals.user)) return json(403, { error: 'forbidden' });
  return { userId: locals.user.id };
}
