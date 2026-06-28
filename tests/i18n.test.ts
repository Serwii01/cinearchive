import { describe, it, expect } from 'vitest';
import { ui, getLangFromUrl, useTranslations, localizePath } from '../src/i18n/ui';

describe('diccionarios de traducción', () => {
  it('ES y EN tienen exactamente las mismas claves', () => {
    const es = Object.keys(ui.es).sort();
    const en = Object.keys(ui.en).sort();
    const faltanEnEn = es.filter((k) => !(k in ui.en));
    const faltanEnEs = en.filter((k) => !(k in ui.es));
    expect(faltanEnEn, `Claves sin traducir al EN: ${faltanEnEn.join(', ')}`).toEqual([]);
    expect(faltanEnEs, `Claves sin traducir al ES: ${faltanEnEs.join(', ')}`).toEqual([]);
  });

  it('ningún valor está vacío', () => {
    for (const lang of ['es', 'en'] as const) {
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
  });
  it('cae al idioma por defecto (es) si no hay prefijo válido', () => {
    expect(getLangFromUrl(new URL('https://x.test/'))).toBe('es');
    expect(getLangFromUrl(new URL('https://x.test/fr/algo'))).toBe('es');
  });
});

describe('localizePath', () => {
  it('construye rutas con prefijo de idioma y normaliza barras', () => {
    expect(localizePath('es')).toBe('/es');
    expect(localizePath('en', 'films')).toBe('/en/films');
    expect(localizePath('es', '/archive/')).toBe('/es/archive');
  });
});

describe('useTranslations', () => {
  it('devuelve la cadena del idioma pedido', () => {
    const t = useTranslations('en');
    expect(t('nav.home')).toBe(ui.en['nav.home']);
    expect(typeof t('nav.archive')).toBe('string');
  });
});
