import { describe, it, expect } from 'vitest';
import { norm, scoreEntry, searchSite } from '../src/lib/sitesearch';

describe('norm', () => {
  it('ignora mayúsculas, acentos y signos', () => {
    expect(norm('Cinéphiles Cine-Files')).toBe('cinephiles cine files');
    expect(norm('  «Nouvelle  Vague»  ')).toBe('nouvelle vague');
  });
});

describe('scoreEntry', () => {
  const e = (t: string, x = '') => ({ nt: norm(t), nx: norm(x) });

  it('exige todas las palabras', () => {
    expect(scoreEntry(e('Photoplay · 1922'), ['photoplay', 'variety'], 'photoplay variety')).toBe(0);
  });

  it('el título pesa más que el texto, y empezar por la búsqueda más aún', () => {
    const enTitulo = scoreEntry(e('Cine mudo y vanguardias'), ['mudo'], 'mudo');
    const enTexto = scoreEntry(e('Otra cosa', 'cine mudo'), ['mudo'], 'mudo');
    const empieza = scoreEntry(e('Mudo'), ['mudo'], 'mudo');
    expect(enTitulo).toBeGreaterThan(enTexto);
    expect(empieza).toBeGreaterThan(enTitulo);
  });
});

describe('searchSite', () => {
  it('encuentra lo que antes no salía: una revista de la hemeroteca', () => {
    const r = searchSite('photoplay', 'es');
    expect(r.length).toBeGreaterThan(0);
    expect(r[0].kind).toBe('periodical');
    expect(r[0].href).toMatch(/^\/archive\//);
  });

  it('busca una colección por su nombre sin acentos', () => {
    const r = searchSite('nouvelle vague', 'es');
    expect(r.some((h) => h.kind === 'collection')).toBe(true);
  });

  it('el glosario se encuentra por el término en inglés desde cualquier idioma', () => {
    const r = searchSite('shot', 'es');
    expect(r.some((h) => h.kind === 'glossary' && h.title === 'Plano')).toBe(true);
  });

  it('las rutas llevan el prefijo del idioma', () => {
    const r = searchSite('photoplay', 'ca');
    expect(r[0].href.startsWith('/ca/')).toBe(true);
  });

  it('con menos de dos letras útiles no busca', () => {
    expect(searchSite('a', 'es')).toEqual([]);
    expect(searchSite('  ', 'es')).toEqual([]);
  });

  it('respeta el tope', () => {
    expect(searchSite('cine', 'es', 5)).toHaveLength(5);
  });
});

describe('searchSite: fonoteca', () => {
  it('encuentra a un compositor y lleva a su tarjeta', () => {
    const r = searchSite('morricone', 'es');
    expect(r[0]).toMatchObject({ kind: 'fonoteca', title: 'Ennio Morricone', href: '/fonoteca#ennio-morricone' });
  });

  it('encuentra una grabación por su título, en cualquier idioma', () => {
    const r = searchSite('charlie chaplin feet', 'en');
    expect(r.some((h) => h.kind === 'fonoteca' && h.href.startsWith('/en/fonoteca#'))).toBe(true);
  });

  it('una película lleva a su compositor: «Vértigo» encuentra a Herrmann', () => {
    const r = searchSite('vertigo', 'es');
    expect(r.some((h) => h.kind === 'fonoteca' && h.title === 'Bernard Herrmann')).toBe(true);
  });
});
