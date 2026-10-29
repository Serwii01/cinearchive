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

/** Una persona con enlace a su ficha, para director y actor. */
export interface LdPerson {
  name: string;
  url?: string | null;
}

function personRef(p: LdPerson): Json {
  return p.url ? { '@type': 'Person', name: p.name, url: p.url } : { '@type': 'Person', name: p.name };
}

/**
 * Ficha de película. Los campos vacíos/nulos se omiten para no emitir datos falsos.
 *
 * La nota es la de Cine Archive (lib/community.ts), en estrellas de 0,5 a 5.
 * Antes se declaraba la de TMDB, y Google no admite estrellas sacadas de otra
 * web: puede quitar los resultados enriquecidos de todo el sitio.
 */
export function movieLd(opts: {
  url: string;
  name: string;
  alternateName?: string | null;
  image?: string | null;
  description?: string | null;
  datePublished?: string | null;
  genres?: string[];
  directors?: LdPerson[];
  actors?: LdPerson[];
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
  if (opts.directors?.length) ld.director = opts.directors.map(personRef);
  if (opts.actors?.length) ld.actor = opts.actors.map(personRef);
  if (opts.runtimeMin && opts.runtimeMin > 0) ld.duration = `PT${opts.runtimeMin}M`;
  if (opts.inLanguage) ld.inLanguage = opts.inLanguage;
  if (opts.ratingValue && opts.ratingCount && opts.ratingCount > 0) {
    ld.aggregateRating = {
      '@type': 'AggregateRating',
      ratingValue: Number(opts.ratingValue.toFixed(1)),
      ratingCount: opts.ratingCount,
      bestRating: 5,
      worstRating: 0.5,
    };
  }
  return ld;
}

/** Ficha de persona (director, intérprete). */
export function personLd(opts: {
  url: string;
  name: string;
  alternateName?: string | null;
  image?: string | null;
  description?: string | null;
  birthDate?: string | null;
  deathDate?: string | null;
  birthPlace?: string | null;
}): Json {
  const ld: Json = { '@context': 'https://schema.org', '@type': 'Person', url: opts.url, name: opts.name };
  if (opts.alternateName && opts.alternateName !== opts.name) ld.alternateName = opts.alternateName;
  if (opts.image) ld.image = opts.image;
  if (opts.description) ld.description = opts.description;
  if (opts.birthDate) ld.birthDate = opts.birthDate;
  if (opts.deathDate) ld.deathDate = opts.deathDate;
  if (opts.birthPlace) ld.birthPlace = { '@type': 'Place', name: opts.birthPlace };
  return ld;
}

/**
 * Reseña de una persona registrada sobre una película. Sin nota ni texto no
 * hay reseña que declarar (null).
 */
export function reviewLd(opts: {
  url: string;
  author: { name: string; url: string };
  film: { name: string; url: string; image?: string | null; datePublished?: string | null; directors?: LdPerson[] };
  rating?: number | null;
  body?: string | null;
  datePublished?: string | null;
  inLanguage?: string;
}): Json | null {
  if (opts.rating == null && !opts.body) return null;
  const movie: Json = { '@type': 'Movie', name: opts.film.name, url: opts.film.url };
  if (opts.film.image) movie.image = opts.film.image;
  if (opts.film.datePublished) movie.datePublished = opts.film.datePublished;
  if (opts.film.directors?.length) movie.director = opts.film.directors.map(personRef);
  const ld: Json = {
    '@context': 'https://schema.org',
    '@type': 'Review',
    url: opts.url,
    itemReviewed: movie,
    author: { '@type': 'Person', name: opts.author.name, url: opts.author.url },
  };
  if (opts.rating != null) ld.reviewRating = { '@type': 'Rating', ratingValue: opts.rating, bestRating: 5, worstRating: 0.5 };
  if (opts.body) ld.reviewBody = opts.body;
  if (opts.datePublished) ld.datePublished = opts.datePublished;
  if (opts.inLanguage) ld.inLanguage = opts.inLanguage;
  return ld;
}

/** Lista ordenada de películas (la cartelera de estrenos). */
export function itemListLd(opts: { name: string; items: { name: string; url: string }[] }): Json {
  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: opts.name,
    itemListElement: opts.items.map((it, i) => ({ '@type': 'ListItem', position: i + 1, name: it.name, url: it.url })),
  };
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
