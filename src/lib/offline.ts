// Sin imports de i18n/ui a propósito: esto va al navegador y ese módulo trae
// el diccionario entero. Los idiomas llegan por parámetro.

/**
 * Idioma en el que enseñar /offline.
 *
 * El service worker sirve /offline en la URL que falló (la barra sigue
 * diciendo /en/films, no /offline), así que el prefijo de la ruta es la mejor
 * pista: es el idioma que la persona estaba usando. Si no lo hay —se entró a
 * /offline a pelo o a una ruta en castellano— decide el navegador, y si el
 * navegador habla algo que no tenemos, castellano.
 */
export function pickOfflineLang<L extends string>(
  pathname: string,
  navigatorLangs: readonly string[],
  langs: readonly L[],
  defaultLang: L,
): L {
  const tenemos = (x: string): x is L => (langs as readonly string[]).includes(x);
  const [, primero] = pathname.split('/');
  if (primero && primero !== defaultLang && tenemos(primero)) return primero;

  // Ruta sin prefijo: es una página en castellano. Salvo la portada, que es el
  // start_url de la app instalada y por la que entra todo el mundo, hable lo
  // que hable; ahí manda el navegador.
  if (!isOfflinePath(pathname) && pathname !== '/') return defaultLang;

  for (const tag of navigatorLangs) {
    const base = tag.toLowerCase().split('-')[0];
    if (tenemos(base)) return base;
  }
  return defaultLang;
}

/** Si la página que se está viendo es /offline en sí (no una URL que falló). */
export function isOfflinePath(pathname: string): boolean {
  return /^\/offline\/?$/.test(pathname);
}
