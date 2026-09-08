import { describe, it, expect } from 'vitest';
import { dossiers, dossierBySlug, dossierCopy } from '../src/lib/dossiers';
import { languages, defaultLang, type Lang } from '../src/i18n/ui';

const LANGS = Object.keys(languages) as Lang[];

/**
 * Los dosieres llevan el texto completo escrito cinco veces, una por idioma.
 * Lo que se descuadra al editarlos no es la prosa —eso se ve— sino la
 * estructura: una película que se añade solo en castellano, un hito que se
 * queda sin traducir, una ficha del festival con un dato de menos. Aquí se
 * compara cada idioma contra el castellano, que es la versión de referencia.
 */
describe('dosieres especiales', () => {
  it('tienen slug único', () => {
    const slugs = dossiers.map((d) => d.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it('se encuentran por su slug', () => {
    for (const d of dossiers) expect(dossierBySlug(d.slug)).toBe(d);
    expect(dossierBySlug('no-existe')).toBeUndefined();
  });

  it('están escritos en los cinco idiomas', () => {
    for (const d of dossiers) {
      for (const lang of LANGS) {
        expect(d.copy[lang], `${d.slug}.${lang}`).toBeDefined();
      }
    }
  });

  it('mantienen las mismas películas, en el mismo orden, en todos los idiomas', () => {
    for (const d of dossiers) {
      const ref = d.copy[defaultLang].films.map((f) => f.tmdbId);
      expect(ref.length, `${d.slug} sin películas`).toBeGreaterThan(0);
      expect(new Set(ref).size, `${d.slug} repite una película`).toBe(ref.length);
      for (const lang of LANGS) {
        expect(d.copy[lang].films.map((f) => f.tmdbId), `${d.slug}.${lang}`).toEqual(ref);
      }
    }
  });

  it('mantienen la misma cronología, con los mismos años', () => {
    for (const d of dossiers) {
      const ref = d.copy[defaultLang].chronology.map((h) => h.year);
      for (const lang of LANGS) {
        expect(d.copy[lang].chronology.map((h) => h.year), `${d.slug}.${lang}`).toEqual(ref);
      }
    }
  });

  it('mantienen el mismo número de párrafos y de datos del festival', () => {
    for (const d of dossiers) {
      const ref = d.copy[defaultLang];
      for (const lang of LANGS) {
        const c = d.copy[lang];
        expect(c.body.length, `${d.slug}.${lang} cuerpo`).toBe(ref.body.length);
        expect(c.festival.body.length, `${d.slug}.${lang} festival`).toBe(ref.festival.body.length);
        expect(c.festival.facts.length, `${d.slug}.${lang} ficha`).toBe(ref.festival.facts.length);
      }
    }
  });

  it('no dejan ningún texto vacío', () => {
    for (const d of dossiers) {
      for (const lang of LANGS) {
        const c = d.copy[lang];
        const textos = [
          c.kicker, c.title, c.blurb, c.lead, c.filmsIntro,
          c.quote.text, c.quote.source, c.festival.name,
          ...c.body, ...c.festival.body,
          ...c.festival.facts.flat(),
          ...c.chronology.flatMap((h) => [h.year, h.title, h.text]),
          ...c.films.map((f) => f.note),
        ];
        for (const s of textos) expect(s.trim().length, `${d.slug}.${lang}`).toBeGreaterThan(0);
      }
    }
  });

  it('citan fuentes con enlaces https', () => {
    for (const d of dossiers) {
      expect(d.sources.length, `${d.slug} sin fuentes`).toBeGreaterThan(0);
      for (const s of d.sources) {
        expect(s.label.trim().length).toBeGreaterThan(0);
        expect(s.url.startsWith('https://'), `${d.slug}: ${s.url}`).toBe(true);
      }
    }
  });
});

describe('dossierCopy', () => {
  it('devuelve el texto del idioma pedido', () => {
    const d = dossiers[0];
    expect(dossierCopy(d, 'en')).toBe(d.copy.en);
  });

  it('cae al castellano si el idioma no está escrito', () => {
    // No debería pasar —el test de arriba lo impide—, pero la página no puede
    // quedarse en blanco por un idioma que falte.
    const d = { ...dossiers[0], copy: { ...dossiers[0].copy, gl: undefined } } as unknown as typeof dossiers[0];
    expect(dossierCopy(d, 'gl')).toBe(dossiers[0].copy.es);
  });
});
