import { createAuthClient } from 'better-auth/client';

/**
 * Cliente de auth para el navegador. No contiene secretos: solo habla con
 * nuestras propias rutas /api/auth/*. Usado por los formularios de login/registro
 * y los botones de login social.
 */
export const authClient = createAuthClient();

/**
 * Ojo con el nombre de la recuperación de contraseña: el cliente de Better Auth
 * es un proxy que convierte el nombre del método en una ruta, así que
 * `forgetPassword` llamaba a /api/auth/forget-password, que ya no existe (404) y
 * dejaba la pantalla diciendo «te hemos enviado un enlace» sin enviar nada. La
 * ruta de hoy es /request-password-reset.
 */
export const {
  signIn,
  signUp,
  signOut,
  useSession,
  getSession,
  requestPasswordReset,
  resetPassword,
  sendVerificationEmail,
} = authClient;
