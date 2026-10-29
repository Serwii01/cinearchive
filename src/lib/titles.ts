/**
 * El título de una película en los cinco idiomas de la web, a partir de las
 * traducciones de TMDB. Pura (tiene tests).
 *
 * Hace falta porque films_cache guarda una sola versión de la ficha: la del
 * idioma de la última visita. Las listas, el diario y el perfil leían el
 * título de ahí, y tras importar cientos de películas salía cada una en un
 * idioma («Parásitos», «In the Mood for Love», «Amélie»…).
 */
import type { Lang } from '../i18n/ui';
import type { TmdbTranslation } from './tmdb';

export type Titles = Record<Lang, string>;

interface MovieNames {
  title?: string;
  original_title: string;
  original_language?: string;
}

/**
 * Elige, por idioma, el primer título que exista:
 *
 *   es  España → México → otro país hispano → inglés → original
 *   en  EE. UU. → Reino Unido → otro → original
 *   gl, eu, ca  el suyo → el castellano
 *
 * TMDB deja el título vacío en la traducción del idioma original («El
 * espíritu de la colmena» en es-ES llega como ""): ahí vale el original.
 */
export function titlesFrom(m: MovieNames, translations: TmdbTranslation[]): Titles {
  const original = m.original_title || m.title || '';
  const find = (lang: string, regions: string[]): string | undefined => {
    const ofLang = translations.filter((t) => t.iso_639_1 === lang);
    const ordered = [
      ...regions.map((r) => ofLang.find((t) => t.iso_3166_1 === r)),
      ...ofLang,
    ];
    for (const t of ordered) {
      const v = t?.data?.title?.trim();
      if (v) return v;
    }
    // Sin título traducido pero es el idioma original: el original.
    return m.original_language === lang ? original : undefined;
  };

  const en = find('en', ['US', 'GB']) ?? original;
  const es = find('es', ['ES', 'MX']) ?? en;
  return {
    es,
    en,
    gl: find('gl', ['ES']) ?? es,
    eu: find('eu', ['ES']) ?? es,
    ca: find('ca', ['ES']) ?? es,
  };
}
