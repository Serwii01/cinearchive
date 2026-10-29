import { describe, it, expect, vi } from 'vitest';

vi.mock('../src/db/client', () => ({ db: {} }));

import { movieLd, personLd, reviewLd, itemListLd } from '../src/lib/seo';
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
