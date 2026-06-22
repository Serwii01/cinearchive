export const languages = {
  es: 'Español',
  en: 'English',
} as const;

export type Lang = keyof typeof languages;
export const defaultLang: Lang = 'es';

/** Diccionario de strings de interfaz (no de contenido). */
export const ui = {
  es: {
    'site.title': 'Cine Archive',
    'site.tagline': 'Archivo editorial de cine',
    'site.description':
      'Publicación editorial y archivo digital de cine: ensayos, reseñas y curaduría sobre la historia del cine.',
    'nav.home': 'Portada',
    'nav.archive': 'Archivo',
    'nav.films': 'Filmoteca',
    'nav.about': 'Manifiesto',
    'films.title': 'Filmoteca',
    'films.intro':
      'Índice de referencia del archivo: {count} obras catalogadas. Las marcadas con · tienen ensayo publicado.',
    'films.search': 'Filtrar por título o director…',
    'films.colTitle': 'Título',
    'films.colDirector': 'Dirección',
    'films.colYear': 'Año',
    'films.colCountry': 'País',
    'films.colRuntime': 'Duración',
    'films.hasEssay': 'Con ensayo',
    'films.read': 'Leer',
    'films.noResults': 'Sin resultados.',
    'ticker.label': 'Nuevas adquisiciones',
    'home.featured': 'Destacado',
    'home.latest': 'Últimas entradas',
    'home.readEssay': 'Leer ensayo',
    'home.viewArchive': 'Ver archivo completo',
    'archive.title': 'El Archivo',
    'archive.intro':
      'Índice completo de ensayos y reseñas. Cada ficha cataloga una obra con sus metadatos técnicos.',
    'archive.empty': 'Todavía no hay entradas en este idioma.',
    'article.backToArchive': 'Volver al archivo',
    'article.metadata': 'Ficha técnica',
    'article.director': 'Dirección',
    'article.year': 'Año',
    'article.runtime': 'Duración',
    'article.country': 'País',
    'article.published': 'Publicado',
    'article.filedUnder': 'Catalogado en',
    'about.title': 'Manifiesto',
    'footer.rights': 'Todos los derechos reservados.',
    'footer.builtWith': 'Construido con Astro · Alojado en Cloudflare Pages',
    'lang.switch': 'Idioma',
  },
  en: {
    'site.title': 'Cine Archive',
    'site.tagline': 'A film editorial archive',
    'site.description':
      'An editorial publication and digital film archive: essays, reviews and curation on the history of cinema.',
    'nav.home': 'Front Page',
    'nav.archive': 'Archive',
    'nav.films': 'Filmography',
    'nav.about': 'Manifesto',
    'films.title': 'Filmography',
    'films.intro':
      'A reference index of the archive: {count} catalogued works. Those marked with · have a published essay.',
    'films.search': 'Filter by title or director…',
    'films.colTitle': 'Title',
    'films.colDirector': 'Director',
    'films.colYear': 'Year',
    'films.colCountry': 'Country',
    'films.colRuntime': 'Runtime',
    'films.hasEssay': 'With essay',
    'films.read': 'Read',
    'films.noResults': 'No results.',
    'ticker.label': 'New acquisitions',
    'home.featured': 'Featured',
    'home.latest': 'Latest entries',
    'home.readEssay': 'Read essay',
    'home.viewArchive': 'View full archive',
    'archive.title': 'The Archive',
    'archive.intro':
      'A complete index of essays and reviews. Each card catalogues a work alongside its technical metadata.',
    'archive.empty': 'No entries in this language yet.',
    'article.backToArchive': 'Back to archive',
    'article.metadata': 'Technical sheet',
    'article.director': 'Director',
    'article.year': 'Year',
    'article.runtime': 'Runtime',
    'article.country': 'Country',
    'article.published': 'Published',
    'article.filedUnder': 'Filed under',
    'about.title': 'Manifesto',
    'footer.rights': 'All rights reserved.',
    'footer.builtWith': 'Built with Astro · Hosted on Cloudflare Pages',
    'lang.switch': 'Language',
  },
} as const;

export type UIKey = keyof (typeof ui)['es'];

/** Devuelve el idioma a partir de la URL (/es/..., /en/...). */
export function getLangFromUrl(url: URL): Lang {
  const [, lang] = url.pathname.split('/');
  if (lang in ui) return lang as Lang;
  return defaultLang;
}

/** Crea una función traductora `t('clave')` para el idioma dado. */
export function useTranslations(lang: Lang) {
  return function t(key: UIKey): string {
    return ui[lang][key] ?? ui[defaultLang][key];
  };
}

/** Construye una ruta con prefijo de idioma. p.ej. localizePath('es', 'archive') -> '/es/archive' */
export function localizePath(lang: Lang, path = ''): string {
  const clean = path.replace(/^\/+|\/+$/g, '');
  return clean ? `/${lang}/${clean}` : `/${lang}`;
}

/** Formatea una fecha según el idioma. */
export function formatDate(date: Date, lang: Lang): string {
  return new Intl.DateTimeFormat(lang === 'es' ? 'es-ES' : 'en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(date);
}
