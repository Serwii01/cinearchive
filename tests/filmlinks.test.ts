import { describe, it, expect, vi } from 'vitest';
import { readFileSync } from 'node:fs';

vi.mock('../src/db/client', () => ({ db: {} }));
const { canonicalFilmSlug, filmPathFor } = await import('../src/lib/filmlinks');

const titulos = new Map([[238, { es: 'El padrino', en: 'The Godfather', gl: 'O padriño', eu: 'Aitajauna', ca: 'El padrí' }]]);

describe('enlaces a fichas con su URL definitiva', () => {
  it('usa el título guardado del idioma de la página, no el que traiga la lista', () => {
    expect(canonicalFilmSlug(238, 'ca', titulos, 'El padrino')).toBe('el-padri-238');
    expect(filmPathFor(238, 'en', titulos, 'El padrino')).toBe('film/the-godfather-238');
  });

  it('sin título guardado, el que se tenga; sin ninguno, el id', () => {
    expect(canonicalFilmSlug(603, 'es', titulos, 'Matrix')).toBe('matrix-603');
    expect(canonicalFilmSlug(603, 'es', titulos)).toBe('603');
  });

  it('el selector de idioma lleva a la ruta de cada idioma que da la página', () => {
    expect(readFileSync('src/components/LanguageSwitcher.astro', 'utf8')).toContain('alternas?.[target] ?? seccion');
    expect(readFileSync('src/layouts/BaseLayout.astro', 'utf8')).toContain('Astro.locals.alternatePaths = alternatePaths');
  });

  it('las listas que enlazaban con otro título usan la URL definitiva', () => {
    for (const p of ['film/[slug]', 'person/[id]', 'estrenos', 'discover', 'films', 'archive/index', 'index']) {
      const src = readFileSync(`src/pages/[...lang]/${p}.astro`, 'utf8');
      expect(src, p).toContain('savedTitles(');
    }
  });
});
