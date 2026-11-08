import { describe, it, expect, vi } from 'vitest';

vi.mock('../src/db/client', () => ({ db: {} }));

import { movieLd, personLd, reviewLd, itemListLd, organizationLd, bookLd, publicationIssueLd, definedTermSetLd } from '../src/lib/seo';
import { urlset, localizedEntries, xmlEscape } from '../src/lib/sitemap';
import { communityScore, MIN_RATINGS } from '../src/lib/community';

describe('movieLd', () => {
  it('declara directores y actores con enlace, y la nota en estrellas de 5', () => {
    const ld = movieLd({
      url: 'https://x/film/a-1',
      name: 'A',
      directors: [{ name: 'Akira Kurosawa', url: 'https://x/person/5026' }],
      actors: [{ name: 'Toshirō Mifune', url: 'https://x/person/7450' }, { name: 'Sin enlace' }],
      ratingValue: 4.25,
      ratingCount: 7,
    });
    expect(ld.director).toEqual([{ '@type': 'Person', name: 'Akira Kurosawa', url: 'https://x/person/5026' }]);
    expect(ld.actor).toEqual([
      { '@type': 'Person', name: 'Toshirō Mifune', url: 'https://x/person/7450' },
      { '@type': 'Person', name: 'Sin enlace' },
    ]);
    expect(ld.aggregateRating).toEqual({ '@type': 'AggregateRating', ratingValue: 4.3, ratingCount: 7, bestRating: 5, worstRating: 0.5 });
  });
  it('sin nota de la comunidad no hay aggregateRating', () => {
    expect(movieLd({ url: 'u', name: 'A', ratingValue: null, ratingCount: null }).aggregateRating).toBeUndefined();
  });
});

describe('personLd', () => {
  it('incluye el nombre original como alternativo y omite lo vacío', () => {
    const ld = personLd({ url: 'u', name: 'Ryunosuke Akutagawa', alternateName: '芥川龍之介', birthDate: '1892-03-01', deathDate: null });
    expect(ld.alternateName).toBe('芥川龍之介');
    expect(ld.birthDate).toBe('1892-03-01');
    expect('deathDate' in ld).toBe(false);
  });
});

describe('reviewLd', () => {
  const base = { url: 'r', author: { name: 'Ana', url: 'p' }, film: { name: 'Ran', url: 'f' } };
  it('construye la reseña con nota y texto', () => {
    const ld = reviewLd({ ...base, rating: 4.5, body: 'Enorme.', datePublished: '2026-10-29' })!;
    expect(ld['@type']).toBe('Review');
    expect(ld.reviewRating).toEqual({ '@type': 'Rating', ratingValue: 4.5, bestRating: 5, worstRating: 0.5 });
    expect(ld.reviewBody).toBe('Enorme.');
    expect(ld.itemReviewed).toMatchObject({ '@type': 'Movie', name: 'Ran' });
  });
  it('sin nota ni texto no hay reseña', () => {
    expect(reviewLd({ ...base, rating: null, body: '' })).toBeNull();
  });
});

describe('itemListLd', () => {
  it('numera los elementos desde 1', () => {
    const ld = itemListLd({ name: 'Estrenos', items: [{ name: 'A', url: 'a' }, { name: 'B', url: 'b' }] });
    expect((ld.itemListElement as { position: number }[]).map((i) => i.position)).toEqual([1, 2]);
  });
});

describe('sitemap', () => {
  it('escapa y añade las alternativas por idioma con x-default', () => {
    const xml = urlset(localizedEntries({ es: 'https://x/film/a&b-1', en: 'https://x/en/film/a&b-1' }, new Date('2026-01-02T00:00:00Z'), 'es'));
    expect(xml).toContain('xmlns:xhtml="http://www.w3.org/1999/xhtml"');
    expect(xml.match(/<url>/g)).toHaveLength(2);
    expect(xml).toContain('<loc>https://x/film/a&amp;b-1</loc>');
    expect(xml).toContain('hreflang="en" href="https://x/en/film/a&amp;b-1"');
    expect(xml).toContain('hreflang="x-default" href="https://x/film/a&amp;b-1"');
    expect(xml).toContain('<lastmod>2026-01-02T00:00:00.000Z</lastmod>');
  });
  it('un sitemap vacío sigue siendo XML válido', () => {
    expect(urlset([])).toMatch(/<urlset[^>]*>\n<\/urlset>\n$/);
    expect(xmlEscape('"<>')).toBe('&quot;&lt;&gt;');
  });
});

describe('communityScore', () => {
  it('redondea a un decimal', () => {
    expect(communityScore(13, 3)).toEqual({ value: 4.3, count: 3 });
  });
  it('no da nota por debajo del mínimo', () => {
    expect(communityScore(10, MIN_RATINGS - 1)).toBeNull();
  });
});

describe('organizationLd', () => {
  const base = { url: 'https://cinearchive.es/', name: 'Cine Archive', logo: 'https://cinearchive.es/icons/icon-512.png' };

  it('enlaza los perfiles oficiales en sameAs', () => {
    expect(organizationLd({ ...base, sameAs: ['https://www.instagram.com/cinearchive.es/'] }).sameAs).toEqual([
      'https://www.instagram.com/cinearchive.es/',
    ]);
  });

  it('sin perfiles, no deja un sameAs vacío', () => {
    expect(organizationLd(base)).not.toHaveProperty('sameAs');
    expect(organizationLd({ ...base, sameAs: [] })).not.toHaveProperty('sameAs');
  });
});

describe('datos estructurados de Biblioteca, Hemeroteca y Glosario', () => {
  it('el libro se declara como libro electrónico gratis, ligado a su ítem de Internet Archive', () => {
    const ld = bookLd({ url: 'u', name: 'Film Technique', author: 'V. Pudovkin', year: 1933, inLanguage: 'en', description: 'd', image: 'i', sameAs: 'https://archive.org/details/x' }) as Record<string, any>;
    expect(ld['@type']).toBe('Book');
    expect(ld.author).toEqual({ '@type': 'Person', name: 'V. Pudovkin' });
    expect(ld.datePublished).toBe('1933');
    expect(ld.bookFormat).toBe('https://schema.org/EBook');
    expect(ld.isAccessibleForFree).toBe(true);
    expect(ld.sameAs).toBe('https://archive.org/details/x');
  });

  it('el número de revista cuelga de su cabecera; el periódico, de un Newspaper', () => {
    const base = { url: 'u', title: 'Photoplay', issue: 'Enero 1925', year: 1925, inLanguage: 'en', description: 'd', image: 'i', sameAs: 's' };
    const revista = publicationIssueLd({ ...base, periodical: 'magazine', publisher: 'Photoplay Publishing' }) as Record<string, any>;
    expect(revista['@type']).toBe('PublicationIssue');
    expect(revista.name).toBe('Photoplay — Enero 1925');
    expect(revista.isPartOf).toEqual({ '@type': 'Periodical', name: 'Photoplay', publisher: { '@type': 'Organization', name: 'Photoplay Publishing' } });
    const periodico = publicationIssueLd({ ...base, periodical: 'newspaper' }) as Record<string, any>;
    expect(periodico.isPartOf).toEqual({ '@type': 'Newspaper', name: 'Photoplay' });
  });

  it('cada término del glosario apunta a su conjunto', () => {
    const ld = definedTermSetLd({ url: 'https://x/glossary', name: 'Glosario', description: 'd', inLanguage: 'es', terms: [{ name: 'Raccord', description: 'Continuidad' }] }) as Record<string, any>;
    expect(ld['@type']).toBe('DefinedTermSet');
    expect(ld.hasDefinedTerm).toEqual([{ '@type': 'DefinedTerm', name: 'Raccord', description: 'Continuidad', inDefinedTermSet: 'https://x/glossary' }]);
  });
});
