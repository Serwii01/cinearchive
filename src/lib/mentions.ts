import { collections, collectionTitle } from './collections';
import { dossiers, dossierCopy } from './dossiers';
import { articles, articleCopy } from './articles';
import { localizePath, type Lang } from '../i18n/ui';

/**
 * Dónde aparece una película dentro del trabajo de la casa.
 *
 * Las colecciones guardan `tmdbIds`, los dosieres una lista de películas con su
 * nota y los artículos sus `related` (más la portada y la galería). Las tres
 * apuntan a la ficha, pero la ficha no apuntaba a ninguna: quien llegaba a «El
 * séptimo sello» por una búsqueda no se enteraba de que hay una colección
 * entera sobre Bergman. Esto es el enlace de vuelta.
 *
 * Es una pasada sobre tres listas cortas (12 colecciones, 2 dosieres, 15
 * artículos): no hace falta índice ni caché.
 */
export type MentionKind = 'collection' | 'dossier' | 'article';

export interface Mention {
  kind: MentionKind;
  /** Ruta ya localizada. */
  href: string;
  title: string;
  /** Lo que ese sitio dice de la película, cuando lo dice (los dosieres anotan). */
  note?: string;
}

export function mentionsOf(tmdbId: number, lang: Lang): Mention[] {
  const salida: Mention[] = [];

  for (const c of collections) {
    if (c.tmdbIds.includes(tmdbId)) {
      salida.push({
        kind: 'collection',
        href: localizePath(lang, `collections/${c.slug}`),
        title: collectionTitle(c, lang),
      });
    }
  }

  for (const d of dossiers) {
    const copia = dossierCopy(d, lang);
    const ficha = copia.films.find((f) => f.tmdbId === tmdbId);
    if (ficha) {
      salida.push({
        kind: 'dossier',
        href: localizePath(lang, `dossiers/${d.slug}`),
        title: copia.title,
        note: ficha.note,
      });
    }
  }

  for (const a of articles) {
    const citada =
      a.related?.includes(tmdbId) ||
      a.cover?.tmdbId === tmdbId ||
      a.gallery?.items.some((g) => g.tmdbId === tmdbId);
    if (citada) {
      salida.push({
        kind: 'article',
        href: localizePath(lang, `articles/${a.slug}`),
        title: articleCopy(a, lang).title,
      });
    }
  }

  return salida;
}
