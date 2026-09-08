/**
 * Secciones de primer nivel de la web (los ficheros y carpetas que hay bajo
 * src/pages/[...lang]/).
 *
 * Hace falta una lista explícita porque `[...lang]` es un segmento rest: casa
 * con cualquier cosa. Sin ella, /pepe renderizaría la portada en español y
 * /pepe/juan también, lo que es contenido duplicado indexable a coste cero para
 * quien quiera fabricarlo. El middleware la usa para devolver 404 a lo que no
 * sea ni un idioma ni una sección de verdad.
 *
 * tests/routes.test.ts la compara con el contenido real del directorio, así que
 * no puede quedarse desfasada en silencio: al añadir una página nueva, el test
 * falla hasta que se añade aquí.
 */
export const TOP_LEVEL_SECTIONS: ReadonlySet<string> = new Set([
  'about',
  'accessibility',
  'account',
  'admin',
  'archive',
  'atlas',
  'awards',
  'changelog',
  'cinema',
  'cines',
  'collections',
  'discover',
  'dossiers',
  'faq',
  'figures',
  'film',
  'films',
  'forgot',
  'glossary',
  'info',
  'library',
  'lists',
  'login',
  'notifications',
  'person',
  'privacy',
  'recommendations',
  'register',
  'reset',
  'rss.xml',
  'search',
  'sergio',
  'stats',
  'style',
  'terms',
  'timeline',
  'u',
  'watchlist',
]);

/**
 * Páginas que viven en la raíz de src/pages/, fuera de [...lang]: no se
 * traducen y no llevan prefijo nunca.
 *
 * Sin ellas en la comprobación, la guarda las tomaba por rutas inventadas. Con
 * /404 el resultado era especialmente feo: la guarda reescribía hacia /404, que
 * volvía a fallar la guarda, y Astro cortaba el bucle con un 508. Y como
 * robots.txt se prerenderiza, ese 508 acababa escrito dentro del fichero.
 */
const ROOT_ROUTES: ReadonlySet<string> = new Set(['404', 'robots.txt', 'sitemap-films.xml']);

/**
 * Primer segmento de cada familia de endpoints bajo /api/.
 *
 * Hace falta por lo mismo que la lista de secciones: /[...lang] casa con
 * /api/loquesea y lo serviría como si fuera la portada (con un 200 bien
 * hermoso). Antes de que el idioma fuese un segmento rest, esas rutas daban 404
 * solas porque /[lang] solo casaba con un segmento.
 */
const API_ROUTES: ReadonlySet<string> = new Set([
  'admin',
  'auth',
  'avatar',
  'cinemas',
  'films',
  'follow',
  'health',
  'me',
  'og',
  'places',
  'users',
]);

/**
 * ¿La ruta apunta a una sección que existe?
 *
 * Se le quita un prefijo de idioma opcional y se mira el primer segmento que
 * queda: vacío es la portada, y lo demás tiene que estar en la lista. No se
 * valida más allá del primer segmento: de los ids, slugs y nombres de usuario ya
 * se encarga cada página.
 */
export function isKnownRoute(pathname: string, langs: readonly string[]): boolean {
  const segs = pathname.split('/').filter(Boolean);
  if (segs.length === 0) return true; // la portada
  if (ROOT_ROUTES.has(segs[0])) return true;
  if (segs[0] === 'api') return segs.length > 1 && API_ROUTES.has(segs[1]);
  if (langs.includes(segs[0])) segs.shift();
  return segs.length === 0 || TOP_LEVEL_SECTIONS.has(segs[0]);
}

/**
 * Destino del 301 para las URLs con el prefijo del idioma por defecto, que
 * dejaron de ser canónicas: /es/cines -> /cines, /es -> /.
 *
 * Devuelve null si la ruta no lleva ese prefijo (o sea, casi siempre). La
 * cadena de consulta se conserva tal cual: hay enlaces compartidos del tipo
 * /es/discover?genre=27 que tienen que seguir llevando al mismo sitio.
 */
export function legacyDefaultLangRedirect(
  pathname: string,
  search: string,
  defaultLang: string,
): string | null {
  const prefix = `/${defaultLang}`;
  if (pathname !== prefix && !pathname.startsWith(`${prefix}/`)) return null;
  return (pathname.slice(prefix.length) || '/') + search;
}
