/**
 * Resuelve el enlace de "volver" de una ficha (película o persona) a partir de la
 * cabecera Referer, para regresar exactamente a la sección de origen.
 *
 * Con Referrer-Policy "strict-origin-when-cross-origin", las navegaciones internas
 * envían la ruta completa y las externas solo el origen (ruta "/").
 *
 * Antes, para saber si el referer era interno bastaba con mirar si el primer
 * segmento era un idioma. Ya no: en castellano las rutas van sin prefijo, así
 * que /films entraría por externo y el botón caería siempre a la filmoteca. Y
 * quitar la comprobación sin más sería peor: un referer de google.com/search
 * pasaría por interno, porque "search" también es una sección nuestra.
 *
 * Se compara el NOMBRE DE HOST, no el origen completo. El origen no sirve: el
 * navegador manda el público (https://cinearchive.es/...) mientras que la
 * petición que ve Astro llega de Caddy por HTTP, y en local el adaptador de
 * Node ni siquiera incluye el puerto en Astro.url. Comparar orígenes deja el
 * botón siempre en su valor de reserva.
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
  /** Hosts que contamos como propios (el de la petición y el del dominio configurado). */
  hosts: readonly (string | undefined)[],
): { href: string; label: string } {
  const fallback = { href: localizePath(lang, 'films'), label: t('back.films') };
  if (!referer) return fallback;
  let url: URL;
  try {
    url = new URL(referer);
  } catch {
    return fallback;
  }
  if (!hosts.includes(url.hostname)) return fallback; // viene de fuera
  const segs = url.pathname.split('/').filter(Boolean);
  // El prefijo de idioma es opcional (el castellano no lleva): si el primer
  // segmento es un idioma, la sección es el siguiente.
  if (segs[0] && segs[0] in languages) segs.shift();
  const section = segs[0] ?? '';
  const key = SECTION_LABEL[section];
  if (!key) return fallback; // sección que no es origen natural de una ficha
  return { href: url.pathname + url.search, label: t(key) };
}
