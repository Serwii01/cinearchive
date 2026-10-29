import { describe, it, expect } from 'vitest';
import { buildFeed, pageFeed, type FeedViewingRow, type FeedReviewRow } from '../src/lib/feed';

const ana = { userId: 'a', username: 'ana', name: 'Ana', hasAvatar: false };
const luis = { userId: 'l', username: 'luis', name: 'Luis', hasAvatar: true };

const view = (u: typeof ana, tmdbId: number, watchedOn: string, rating: number | null = null, at = `${watchedOn}T20:00:00Z`): FeedViewingRow => ({
  ...u, tmdbId, watchedOn, rewatch: false, rating, createdAt: new Date(at),
});
const rev = (u: typeof ana, tmdbId: number, when: string, note = 'Bonita', rating: number | null = 4): FeedReviewRow => ({
  ...u, tmdbId, note, rating, reviewedAt: new Date(when),
});

describe('buildFeed', () => {
  it('mezcla y ordena por día, lo último apuntado arriba', () => {
    const f = buildFeed(
      [view(ana, 1, '2026-10-20'), view(luis, 2, '2026-10-22'), view(ana, 3, '2026-10-22', null, '2026-10-22T23:00:00Z')],
      [rev(luis, 9, '2026-10-21T10:00:00Z')],
    );
    expect(f.map((i) => [i.kind, i.tmdbId])).toEqual([
      ['viewing', 3],
      ['viewing', 2],
      ['review', 9],
      ['viewing', 1],
    ]);
  });

  it('una reseña cerca de un visionado de la misma película se pega a él', () => {
    const f = buildFeed([view(ana, 1, '2026-10-20')], [rev(ana, 1, '2026-10-21T09:00:00Z', 'Obra maestra', 5)]);
    expect(f).toHaveLength(1);
    expect(f[0]).toMatchObject({ kind: 'viewing', note: 'Obra maestra', rating: 5 });
  });

  it('la de otra persona o lejos en el tiempo va suelta', () => {
    const f = buildFeed([view(ana, 1, '2026-10-01')], [rev(luis, 1, '2026-10-01T09:00:00Z'), rev(ana, 1, '2026-10-20T09:00:00Z')]);
    expect(f.filter((i) => i.kind === 'review')).toHaveLength(2);
    expect(f.find((i) => i.kind === 'viewing')!.note).toBeNull();
  });

  it('la nota del visionado manda sobre la de la reseña', () => {
    const f = buildFeed([view(ana, 1, '2026-10-20', 3)], [rev(ana, 1, '2026-10-20T22:00:00Z', 'x', 5)]);
    expect(f[0].rating).toBe(3);
  });
});

describe('pageFeed', () => {
  const items = buildFeed(
    [
      view(ana, 1, '2026-10-22'),
      view(ana, 2, '2026-10-22'),
      view(ana, 3, '2026-10-21'),
      view(ana, 4, '2026-10-21'),
      view(ana, 5, '2026-10-20'),
    ],
    [],
  );

  it('no parte un día por la mitad', () => {
    const p = pageFeed(items, 3);
    expect(p.items.map((i) => i.tmdbId).sort()).toEqual([1, 2]);
    expect(p.nextBefore).toBe('2026-10-22');
  });

  it('si cabe todo, no hay más', () => {
    expect(pageFeed(items, 10)).toEqual({ items, nextBefore: null });
  });

  it('un día que solo ya pasa del límite se enseña entero', () => {
    const p = pageFeed(items, 1);
    expect(p.items.map((i) => i.day)).toEqual(['2026-10-22', '2026-10-22']);
    expect(p.nextBefore).toBe('2026-10-22');
  });
});
