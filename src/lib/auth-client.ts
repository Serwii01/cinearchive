import { createAuthClient } from 'better-auth/client';

/**
 * Cliente de auth para el navegador. No contiene secretos: solo habla con
 * nuestras propias rutas /api/auth/*. Usado por los formularios de login/registro
 * y los botones de login social.
 */
export const authClient = createAuthClient();

export const { signIn, signUp, signOut, useSession, getSession } = authClient;
