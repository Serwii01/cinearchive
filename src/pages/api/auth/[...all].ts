import type { APIRoute } from 'astro';
import { auth } from '../../../lib/auth';

export const prerender = false;

// Better Auth gestiona todas las sub-rutas (sign-in, sign-up, callbacks OAuth, sign-out…).
export const ALL: APIRoute = ({ request }) => auth.handler(request);
