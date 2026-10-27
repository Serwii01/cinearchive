import { describe, it, expect } from 'vitest';
import { localTitle } from '../src/lib/catalog';
import { countryLabel, getAtlas } from '../src/lib/atlas';
import filmsData from '../src/data/films.json';

describe('localTitle', () => {
  const tokio = { title: 'Tokyo Story', titles: { es: 'Cuentos de Tokio', en: 'Tokyo Story', ca: 'Contes de Tòquio' } };

  it('usa el título del idioma de la página', () => {
    expect(localTitle(tokio, 'es')).toBe('Cuentos de Tokio');
    expect(localTitle(tokio, 'ca')).toBe('Contes de Tòquio');
  });

  it('gallego y euskera sin traducción caen al castellano, no al inglés', () => {
    expect(localTitle(tokio, 'gl')).toBe('Cuentos de Tokio');
    expect(localTitle(tokio, 'eu')).toBe('Cuentos de Tokio');
  });

  it('el inglés no cae al castellano', () => {
    expect(localTitle({ title: 'M', titles: { es: 'M, el vampiro de Düsseldorf' } }, 'en')).toBe('M');
  });

  it('sin traducciones, el título de referencia', () => {
    expect(localTitle({ title: 'Metropolis' }, 'es')).toBe('Metropolis');
  });

  it('la Filmoteca en castellano ya no sale en inglés', () => {
    const reglas = (filmsData.films as { slug: string; title: string; titles?: Record<string, string> }[]).find(
      (f) => f.slug === 'the-rules-of-the-game',
    )!;
    expect(localTitle(reglas, 'es')).toBe('La regla del juego');
  });
});

describe('countryLabel', () => {
  it('traduce el país y cada parte de una coproducción', () => {
    expect(countryLabel('USA', 'es')).toBe('Estados Unidos');
    expect(countryLabel('France / Algeria', 'ca')).toBe('França / Algèria');
    expect(countryLabel('United Kingdom / USA', 'gl')).toBe('Reino Unido / Estados Unidos');
  });

  it('todos los países del catálogo están en la tabla', () => {
    // Un país que falte se quedaría en inglés en todos los idiomas: «Narnia»
    // sale igual en castellano y en inglés solo si no está en la tabla.
    for (const f of filmsData.films as { country: string }[]) {
      for (const parte of f.country.split('/').map((p) => p.trim())) {
        const nombres = (['es', 'en', 'gl', 'eu', 'ca'] as const).map((l) => countryLabel(parte, l));
        expect(nombres[1], parte).not.toBe('');
        expect(nombres.some((n, i) => i !== 1 && n !== parte) || ['Hong Kong'].includes(parte), parte).toBe(true);
      }
    }
  });

  it('lo desconocido se deja como viene', () => {
    expect(countryLabel('Narnia', 'es')).toBe('Narnia');
  });

  it('Argelia y Suiza no aparecen en el atlas (solo son segundo país)', () => {
    const claves = getAtlas().map((a) => a.key);
    expect(claves).not.toContain('Algeria');
    expect(claves).not.toContain('Switzerland');
  });
});
