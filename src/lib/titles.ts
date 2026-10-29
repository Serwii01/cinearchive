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
import { hasNonLatin } from './names';

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
 *
 * También lo deja vacío cuando en ese país se estrenó con el título original:
 * «Trainspotting» o «Heat» en España. Ahí no vale saltar a México («La vida
 * en el abismo», «Fuego contra fuego»): en castellano y en inglés manda el
 * original, que es además lo que TMDB devuelve para la ficha y con lo que se
 * hace su URL. Salvo que el original no se pueda leer (乱): entonces se sigue.
 */
export function titlesFrom(m: MovieNames, translations: TmdbTranslation[]): Titles {
  const original = m.original_title || m.title || '';
  const find = (lang: string, regions: string[], blankMeansOriginal = false): string | undefined => {
    const ofLang = translations.filter((t) => t.iso_639_1 === lang);
    const first = ofLang.find((t) => t.iso_3166_1 === regions[0]);
    if (blankMeansOriginal && first && !first.data?.title?.trim() && original && !hasNonLatin(original)) return original;
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

  const en = find('en', ['US', 'GB'], true) ?? original;
  const es = find('es', ['ES', 'MX'], true) ?? en;
  return {
    es,
    en,
    gl: find('gl', ['ES']) ?? es,
    eu: find('eu', ['ES']) ?? es,
    ca: find('ca', ['ES']) ?? es,
  };
}
