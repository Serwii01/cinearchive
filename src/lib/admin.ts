/**
 * Control de acceso del panel de administración (SOLO SERVIDOR).
 *
 * Administrador = sesión iniciada cuyo correo está en ADMIN_EMAILS (variable de
 * entorno del servidor, nunca expuesta al cliente). Así, aunque alguien adivine la
 * URL /admin, sin ser una de esas cuentas no entra.
 */

function adminEmails(): string[] {
  return (process.env.ADMIN_EMAILS ?? '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

export function isAdmin(user: { email?: string | null } | null | undefined): boolean {
  if (!user?.email) return false;
  const list = adminEmails();
  return list.length > 0 && list.includes(user.email.toLowerCase());
}
