// Constructores de datos estructurados (JSON-LD, schema.org). Devuelven objetos planos
// que BaseLayout serializa en <script type="application/ld+json">. Todas las URLs deben
// ser absolutas: las páginas las resuelven con new URL(path, Astro.site).

type Json = Record<string, unknown>;

/** WebSite + cuadro de búsqueda de sitio (sitelinks searchbox) para la home. */
export function websiteLd(opts: { url: string; name: string; searchUrl: string }): Json {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    url: opts.url,
    name: opts.name,
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${opts.searchUrl}?q={search_term_string}`,
      },
      'query-input': 'required name=search_term_string',
    },
  };
}

/** Organización responsable del sitio (logo para el knowledge panel). */
export function organizationLd(opts: { url: string; name: string; logo: string }): Json {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    url: opts.url,
    name: opts.name,
    logo: opts.logo,
  };
}

/** Ficha de película. Los campos vacíos/nulos se omiten para no emitir datos falsos. */
export function movieLd(opts: {
  url: string;
  name: string;
  alternateName?: string | null;
  image?: string | null;
  description?: string | null;
  datePublished?: string | null;
  genres?: string[];
  director?: string | null;
  runtimeMin?: number | null;
  ratingValue?: number | null;
  ratingCount?: number | null;
  inLanguage?: string;
}): Json {
  const ld: Json = {
    '@context': 'https://schema.org',
    '@type': 'Movie',
    url: opts.url,
    name: opts.name,
  };
  if (opts.alternateName && opts.alternateName !== opts.name) ld.alternateName = opts.alternateName;
  if (opts.image) ld.image = opts.image;
  if (opts.description) ld.description = opts.description;
  if (opts.datePublished) ld.datePublished = opts.datePublished;
  if (opts.genres && opts.genres.length) ld.genre = opts.genres;
  if (opts.director) ld.director = { '@type': 'Person', name: opts.director };
  if (opts.runtimeMin && opts.runtimeMin > 0) ld.duration = `PT${opts.runtimeMin}M`;
  if (opts.inLanguage) ld.inLanguage = opts.inLanguage;
  if (opts.ratingValue && opts.ratingCount && opts.ratingCount > 0) {
    ld.aggregateRating = {
      '@type': 'AggregateRating',
      ratingValue: Number(opts.ratingValue.toFixed(1)),
      ratingCount: opts.ratingCount,
      bestRating: 10,
      worstRating: 1,
    };
  }
  return ld;
}

/** Página de preguntas frecuentes. */
export function faqLd(items: { question: string; answer: string }[]): Json {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: items.map((it) => ({
      '@type': 'Question',
      name: it.question,
      acceptedAnswer: { '@type': 'Answer', text: it.answer },
    })),
  };
}

/** Migas de pan para el SERP. `items` en orden raíz → actual. */
export function breadcrumbLd(items: { name: string; url: string }[]): Json {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((it, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: it.name,
      item: it.url,
    })),
  };
}

/** Artículo/dosier editorial. */
export function articleLd(opts: {
  url: string;
  headline: string;
  description?: string | null;
  image?: string | null;
  inLanguage?: string;
}): Json {
  const ld: Json = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    mainEntityOfPage: opts.url,
    headline: opts.headline,
  };
  if (opts.description) ld.description = opts.description;
  if (opts.image) ld.image = opts.image;
  if (opts.inLanguage) ld.inLanguage = opts.inLanguage;
  return ld;
}
