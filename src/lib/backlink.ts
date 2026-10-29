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

/**
 * La página de origen (ruta + consulta) si la ficha se abrió desde una sección
 * propia que tiene botón de vuelta; null si se llegó de fuera o sin Referer.
 * Va aparte porque la caché de páginas (lib/htmlcache.ts) la usa en su clave:
 * dos visitas con el mismo origen ven exactamente la misma ficha.
 */
export function backLinkSource(
  referer: string | null,
  /** Hosts que contamos como propios (el de la petición y el del dominio configurado). */
  hosts: readonly (string | undefined)[],
): { href: string; key: UIKey } | null {
  if (!referer) return null;
  let url: URL;
  try {
    url = new URL(referer);
  } catch {
    return null;
  }
  if (!hosts.includes(url.hostname)) return null; // viene de fuera
  const segs = url.pathname.split('/').filter(Boolean);
  // El prefijo de idioma es opcional (el castellano no lleva): si el primer
  // segmento es un idioma, la sección es el siguiente.
  if (segs[0] && segs[0] in languages) segs.shift();
  const key = SECTION_LABEL[segs[0] ?? ''];
  if (!key) return null; // sección que no es origen natural de una ficha
  return { href: url.pathname + url.search, key };
}

export function resolveBackLink(
  referer: string | null,
  lang: Lang,
  t: (k: UIKey) => string,
  hosts: readonly (string | undefined)[],
): { href: string; label: string } {
  const source = backLinkSource(referer, hosts);
  if (!source) return { href: localizePath(lang, 'films'), label: t('back.films') };
  return { href: source.href, label: t(source.key) };
}
