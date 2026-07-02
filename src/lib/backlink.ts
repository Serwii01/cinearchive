/**
 * Resuelve el enlace de "volver" de una ficha (película o persona) a partir de la
 * cabecera Referer, para regresar exactamente a la sección de origen.
 *
 * Con Referrer-Policy "strict-origin-when-cross-origin", las navegaciones internas
 * envían la ruta completa y las externas solo el origen (ruta "/"), así que basta
 * comprobar que el primer segmento sea el idioma para saber que es interna.
 */
import { languages, localizePath, type Lang, type UIKey } from '../i18n/ui';

const SECTION_LABEL: Record<string, UIKey> = {
  '': 'back.home',
  films: 'back.films',
  film: 'back.film',
  archive: 'back.archive',
  awards: 'back.awards',
  discover: 'back.discover',
  recommendations: 'back.recs',
  watchlist: 'back.list',
  lists: 'back.publicList',
  collections: 'back.collections',
  timeline: 'back.timeline',
  person: 'back.person',
  figures: 'back.figures',
  u: 'back.profile',
  search: 'back.search',
};

export function resolveBackLink(
  referer: string | null,
  lang: Lang,
  t: (k: UIKey) => string,
): { href: string; label: string } {
  const fallback = { href: localizePath(lang, 'films'), label: t('back.films') };
  if (!referer) return fallback;
  let url: URL;
  try {
    url = new URL(referer);
  } catch {
    return fallback;
  }
  const segs = url.pathname.split('/').filter(Boolean);
  if (!segs[0] || !(segs[0] in languages)) return fallback; // externo o no localizado
  const section = segs[1] ?? '';
  const key = SECTION_LABEL[section];
  if (!key) return fallback; // sección que no es origen natural de una ficha
  return { href: url.pathname + url.search, label: t(key) };
}
