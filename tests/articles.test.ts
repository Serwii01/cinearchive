import { describe, it, expect } from 'vitest';
import { articles, articleBySlug, renderParagraph, heading } from '../src/lib/articles';
import { languages, defaultLang, type Lang } from '../src/i18n/ui';

const LANGS = Object.keys(languages) as Lang[];

describe('artículos', () => {
  it('tienen slug único y fecha AAAA-MM-DD', () => {
    const slugs = articles.map((a) => a.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    for (const a of articles) expect(a.date, a.slug).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('van del más reciente al más antiguo', () => {
    for (let i = 1; i < articles.length; i++) expect(articles[i - 1].date >= articles[i].date, articles[i].slug).toBe(true);
  });

  it('están escritos en los cinco idiomas, con la misma estructura', () => {
    for (const a of articles) {
      const ref = a.copy[defaultLang];
      for (const lang of LANGS) {
        const c = a.copy[lang];
        expect(c, `${a.slug}.${lang}`).toBeDefined();
        expect(c.body.length, `${a.slug}.${lang} párrafos`).toBe(ref.body.length);
        // Los subtítulos caen en las mismas posiciones en todos los idiomas.
        expect(c.body.map((p) => p.startsWith('## ')), `${a.slug}.${lang} subtítulos`).toEqual(ref.body.map((p) => p.startsWith('## ')));
        for (const s of [c.kicker, c.title, c.lead, ...c.body]) expect(s.trim().length, `${a.slug}.${lang}`).toBeGreaterThan(0);
      }
    }
  });

  it('citan fuentes con https', () => {
    for (const a of articles) {
      expect(a.sources.length, a.slug).toBeGreaterThan(0);
      for (const s of a.sources) expect(s.url.startsWith('https://'), s.url).toBe(true);
    }
  });

  it('se encuentran por slug', () => {
    expect(articleBySlug(articles[0].slug)).toBe(articles[0]);
    expect(articleBySlug('nada')).toBeUndefined();
  });
});

describe('renderParagraph', () => {
  it('marca la negrita y escapa el resto', () => {
    expect(renderParagraph('se llevó **catorce** Emmy')).toBe('se llevó <strong>catorce</strong> Emmy');
    expect(renderParagraph('<script>x</script> **a**')).toBe('&lt;script&gt;x&lt;/script&gt; <strong>a</strong>');
  });
  it('un asterisco suelto se queda como está', () => {
    expect(renderParagraph('2 * 3 ** sin cerrar')).toBe('2 * 3 ** sin cerrar');
  });
});

describe('heading', () => {
  it('reconoce «## »', () => {
    expect(heading('## La noche')).toBe('La noche');
    expect(heading('Texto normal')).toBeNull();
  });
});
