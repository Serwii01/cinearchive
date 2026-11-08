import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { extracto } from '../src/lib/reviews';

describe('extracto de una reseña', () => {
  it('lo corto se queda entero', () => {
    expect(extracto('Obra maestra.', 280)).toEqual({ texto: 'Obra maestra.', cortada: false });
  });

  it('lo largo se corta en un espacio, sin partir palabras, y acaba en …', () => {
    const r = extracto('palabra '.repeat(60), 50);
    expect(r.cortada).toBe(true);
    expect(r.texto.endsWith('palabra…')).toBe(true);
    expect(r.texto.length).toBeLessThanOrEqual(51);
  });

  it('no deja más de una línea en blanco seguida', () => {
    expect(extracto('uno\n\n\n\ndos').texto).toBe('uno\n\ndos');
  });
});

describe('privacidad de lo social', () => {
  const src = readFileSync('src/lib/filmsocial.ts', 'utf8');

  it('las reseñas solo salen de perfiles públicos, del propio visor o de a quien sigue con aceptación', () => {
    expect(src).toContain('p.is_private = false');
    expect(src).toContain("f.status = 'accepted'");
  });

  it('no se puede dar «me gusta» a lo propio ni a una lista privada', () => {
    expect(src).toContain('if (viewerId === authorId) return null');
    expect(src).toMatch(/is_public = true and user_id <> \$\{viewerId\}/);
  });

  it('borrar el texto de una reseña o la película borra sus «me gusta»', () => {
    const api = readFileSync('src/pages/api/me/films.ts', 'utf8');
    expect(api.match(/db\.delete\(reviewLikes\)/g)?.length).toBe(2);
  });
});

describe('correo de seguidor nuevo', async () => {
  const { followEmail } = await import('../src/lib/emails');

  it('existe en los cinco idiomas y distingue seguir de pedir seguir', () => {
    for (const lang of ['es', 'en', 'gl', 'eu', 'ca'] as const) {
      const sigue = followEmail(lang, { name: 'Ana', username: 'ana' }, false, 'https://x/n');
      const pide = followEmail(lang, { name: 'Ana', username: 'ana' }, true, 'https://x/n');
      expect(sigue.subject, lang).toContain('Ana');
      expect(sigue.subject, lang).not.toBe(pide.subject);
      expect(sigue.text, lang).toContain('@ana');
    }
  });

  it('no deja colar HTML con el nombre', () => {
    const m = followEmail('es', { name: '<script>x</script>', username: 'malo' }, false, 'https://x/n');
    expect(m.html).not.toContain('<script>');
  });

  it('solo se manda a quien lo ha pedido, con el correo confirmado y una vez al día por pareja', () => {
    const src = readFileSync('src/lib/followmail.ts', 'utf8');
    expect(src).toContain('eq(userPreferences.followEmail, true)');
    expect(src).toContain('eq(user.emailVerified, true)');
    expect(src).toMatch(/check\(`follow-email:/);
  });
});
