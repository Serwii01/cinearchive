/// <reference path="../.astro/types.d.ts" />

declare namespace App {
  interface Locals {
    user: {
      id: string;
      name: string;
      email: string;
      emailVerified: boolean;
      image?: string | null;
    } | null;
    session: {
      id: string;
      userId: string;
      expiresAt: Date;
    } | null;
    /** La página no encontró lo que se pedía: el middleware responde 404. */
    notFound?: boolean;
    /**
     * La ruta de esta misma página en cada idioma, cuando no es la misma con
     * otro prefijo (las fichas de película llevan el título de cada idioma en
     * el slug). La pone BaseLayout y la usa el selector de idioma.
     */
    alternatePaths?: Partial<Record<'es' | 'en' | 'gl' | 'eu' | 'ca', string>>;
  }
}
