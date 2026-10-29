import { describe, it, expect, vi } from 'vitest';
import { articleImage, type ArticleImageSources } from '../src/lib/articleimage';
import type { Article } from '../src/lib/articles';

const base = { slug: 'x', date: '2026-10-29', sources: [], copy: {} } as unknown as Article;
const sources = (): ArticleImageSources & { backdrop: ReturnType<typeof vi.fn>; poster: ReturnType<typeof vi.fn> } => ({
  backdrop: vi.fn(async () => 'https://img/backdrop.jpg'),
  poster: vi.fn(async () => 'https://img/poster.jpg'),
});

describe('articleImage', () => {
  it('prefiere la imagen propia y no pregunta a TMDB', async () => {
    const s = sources();
    const a = { ...base, image: { src: '/articles/gta.jpg', width: 1, height: 1, credit: '' }, cover: { tmdbId: 1 } };
    expect(await articleImage(a, 'es', s)).toBe('/articles/gta.jpg');
    expect(s.backdrop).not.toHaveBeenCalled();
  });

  it('sin imagen propia, usa el fondo de su película o serie', async () => {
    const s = sources();
    expect(await articleImage({ ...base, cover: { tmdbId: 7, kind: 'tv' } }, 'en', s)).toBe('https://img/backdrop.jpg');
    expect(s.backdrop).toHaveBeenCalledWith(7, 'tv', 'en');
  });

  it('con solo muro de carteles, el cartel del primero', async () => {
    const s = sources();
    const a = { ...base, gallery: { kind: 'tv' as const, items: [{ tmdbId: 9, caption: {} as never }] } };
    expect(await articleImage(a, 'es', s)).toBe('https://img/poster.jpg');
    expect(s.poster).toHaveBeenCalledWith(9, 'tv', 'es');
  });

  it('nunca lanza: si TMDB falla o no hay nada, devuelve null', async () => {
    const s = sources();
    s.backdrop.mockRejectedValueOnce(new Error('tmdb caído'));
    expect(await articleImage({ ...base, cover: { tmdbId: 1 } }, 'es', s)).toBeNull();
    expect(await articleImage(base, 'es', s)).toBeNull();
  });
});
