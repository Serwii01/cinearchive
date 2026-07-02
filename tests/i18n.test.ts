import { describe, it, expect } from 'vitest';
import { ui, languages, getLangFromUrl, useTranslations, localizePath, normalizeLang, contentLang, type Lang } from '../src/i18n/ui';

const LANGS = Object.keys(languages) as Lang[];

describe('diccionarios de traducción', () => {
  it('todos los idiomas tienen exactamente las mismas claves que ES', () => {
    const es = Object.keys(ui.es).sort();
    for (const lang of LANGS) {
      const keys = Object.keys(ui[lang]);
      const faltan = es.filter((k) => !(k in ui[lang]));
      const sobran = keys.filter((k) => !(k in ui.es));
      expect(faltan, `Claves sin traducir al ${lang.toUpperCase()}: ${faltan.join(', ')}`).toEqual([]);
      expect(sobran, `Claves de más en ${lang.toUpperCase()}: ${sobran.join(', ')}`).toEqual([]);
    }
  });

  it('ningún valor está vacío', () => {
    for (const lang of LANGS) {
      for (const [k, v] of Object.entries(ui[lang])) {
        expect(typeof v === 'string' && v.length > 0, `${lang}.${k} vacío`).toBe(true);
      }
    }
  });
});

describe('getLangFromUrl', () => {
  it('detecta el idioma del prefijo de la ruta', () => {
    expect(getLangFromUrl(new URL('https://x.test/en/films'))).toBe('en');
    expect(getLangFromUrl(new URL('https://x.test/es/archive'))).toBe('es');
    expect(getLangFromUrl(new URL('https://x.test/gl/films'))).toBe('gl');
    expect(getLangFromUrl(new URL('https://x.test/eu/archive'))).toBe('eu');
    expect(getLangFromUrl(new URL('https://x.test/ca/discover'))).toBe('ca');
  });
  it('cae al idioma por defecto (es) si no hay prefijo válido', () => {
    expect(getLangFromUrl(new URL('https://x.test/'))).toBe('es');
    expect(getLangFromUrl(new URL('https://x.test/fr/algo'))).toBe('es');
  });
});

describe('normalizeLang', () => {
  it('acepta los idiomas soportados y cae a es en el resto', () => {
    for (const lang of LANGS) expect(normalizeLang(lang)).toBe(lang);
    expect(normalizeLang('fr')).toBe('es');
    expect(normalizeLang(undefined)).toBe('es');
  });
});

describe('contentLang', () => {
  it('el contenido editorial solo existe en es/en; gl/eu/ca caen a es', () => {
    expect(contentLang('en')).toBe('en');
    expect(contentLang('es')).toBe('es');
    expect(contentLang('gl')).toBe('es');
    expect(contentLang('eu')).toBe('es');
    expect(contentLang('ca')).toBe('es');
  });
});

describe('localizePath', () => {
  it('construye rutas con prefijo de idioma y normaliza barras', () => {
    expect(localizePath('es')).toBe('/es');
    expect(localizePath('en', 'films')).toBe('/en/films');
    expect(localizePath('es', '/archive/')).toBe('/es/archive');
    expect(localizePath('gl', 'films')).toBe('/gl/films');
  });
});

describe('useTranslations', () => {
  it('devuelve la cadena del idioma pedido', () => {
    const t = useTranslations('en');
    expect(t('nav.home')).toBe(ui.en['nav.home']);
    expect(typeof t('nav.archive')).toBe('string');
  });
  it('funciona en los idiomas nuevos', () => {
    expect(useTranslations('gl')('nav.films')).toBe(ui.gl['nav.films']);
    expect(useTranslations('eu')('nav.films')).toBe(ui.eu['nav.films']);
    expect(useTranslations('ca')('nav.films')).toBe(ui.ca['nav.films']);
  });
});
