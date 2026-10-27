import { describe, it, expect } from 'vitest';
import { shapeExport, type ExportInput } from '../src/lib/account';

const base: ExportInput = {
  user: { id: 'u1', name: 'Ana', email: 'ana@example.test', emailVerified: true, createdAt: '2026-01-01', image: null },
  profile: { userId: 'u1', username: 'ana', bio: 'Cine mudo', instagram: null, isPrivate: true, avatar: Buffer.from('jpg'), avatarType: 'image/webp' },
  preferences: { userId: 'u1', locale: 'es', favoriteGenres: [18], favoriteDirectors: [], favoritePeople: [], theme: 'dark', privacy: {} },
  films: [{ userId: 'u1', tmdbId: 18148, status: 'seen', favorite: true, rating: 5, note: 'Obra maestra', reviewedAt: null, updatedAt: '2026-10-01' }],
  lists: [{ id: 'l1', userId: 'u1', name: 'Ozu', isPublic: false, createdAt: '2026-02-02' }],
  listFilms: [
    { listId: 'l1', tmdbId: 18148, addedAt: '2026-02-03' },
    { listId: 'otra', tmdbId: 1, addedAt: '2026-02-03' },
  ],
  following: [{ username: 'luis', status: 'accepted', since: '2026-03-01' }],
  followers: [],
  badges: [{ name: 'Fundadora', grantedAt: '2026-01-02' }],
  providers: ['email', 'google'],
};

describe('shapeExport', () => {
  const out = shapeExport(base, new Date('2026-10-27T12:00:00Z'));

  it('incluye todo lo que el usuario ha escrito o elegido', () => {
    expect(out.account).toMatchObject({ name: 'Ana', email: 'ana@example.test', signInMethods: ['email', 'google'] });
    expect(out.profile).toMatchObject({ username: 'ana', bio: 'Cine mudo', hasAvatar: true });
    expect(out.films[0]).toMatchObject({ tmdbId: 18148, rating: 5, note: 'Obra maestra', favorite: true });
    expect(out.preferences).toMatchObject({ favoriteGenres: [18], theme: 'dark' });
    expect(out.following).toHaveLength(1);
    expect(out.badges[0].name).toBe('Fundadora');
  });

  it('cada lista lleva solo sus películas', () => {
    expect(out.lists).toHaveLength(1);
    expect(out.lists[0].films).toEqual([{ tmdbId: 18148, addedAt: '2026-02-03' }]);
  });

  it('no saca ids internos, bytes del avatar ni nada de autenticación', () => {
    const json = JSON.stringify(out);
    expect(json).not.toContain('"u1"');
    expect(json).not.toContain('"l1"');
    expect(json).not.toContain('avatar"');
    expect(json).not.toMatch(/password|token/i);
  });

  it('sin perfil ni preferencias no rompe', () => {
    const r = shapeExport({ ...base, profile: null, preferences: null, lists: [], listFilms: [] });
    expect(r.profile).toBeNull();
    expect(r.preferences).toBeNull();
  });
});
