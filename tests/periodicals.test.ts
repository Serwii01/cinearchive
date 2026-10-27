import { describe, it, expect } from 'vitest';
import { existsSync } from 'node:fs';
import { basename, join } from 'node:path';
import { coverUrl, periodicals, recentIssues, showcaseIssues, CLASSIC_UNTIL, type Periodical } from '../src/lib/periodicals';
import { pdFilms, pdLicenseLabel } from '../src/lib/pdfilms';

const PUBLIC = join(process.cwd(), 'public');

describe('hemeroteca', () => {
  it('cada número tiene su portada descargada en public/covers', () => {
    // Las portadas se sirven desde nuestro dominio, no desde archive.org:
    // si falta una, la tarjeta sale en negro. Se arregla con
    // `node scripts/fetch-covers.mjs`. El nombre sale de coverUrl para que
    // cambiar de formato no obligue a tocar el test en dos sitios.
    const sinPortada = periodicals.filter((p) => !existsSync(join(PUBLIC, 'covers', basename(coverUrl(p.id))))).map((p) => p.id);
    expect(sinPortada).toEqual([]);
  });

  it('no repite identificadores', () => {
    const ids = periodicals.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('la fecha de alta, si la hay, es AAAA-MM-DD', () => {
    for (const p of periodicals) {
      if (p.added) expect(p.added, p.id).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });
});

describe('recentIssues', () => {
  it('no repite cabecera y respeta el límite', () => {
    const out = recentIssues(8);
    expect(out.length).toBeLessThanOrEqual(8);
    const titulos = out.map((p) => p.title);
    expect(new Set(titulos).size).toBe(titulos.length);
  });

  it('pone primero lo último que ha entrado, aunque sea de un año viejo', () => {
    // Un Shock Cinema de 1997 dado de alta hoy va antes que un Jump Cut de
    // 2021 sin fecha de alta: la portada enseña novedades, no fechas de
    // publicación.
    const conAlta = periodicals.filter((p) => p.added);
    if (conAlta.length === 0) return;
    const ultimaAlta = conAlta.map((p) => p.added!).sort().at(-1)!;
    const primeros = recentIssues(3);
    for (const p of primeros) expect(p.added, p.id).toBe(ultimaAlta);
  });

  it('a igual día de alta, el de año más reciente va antes', () => {
    const out = recentIssues(50);
    for (let i = 1; i < out.length; i++) {
      const a = out[i - 1], b = out[i];
      if ((a.added ?? '') === (b.added ?? '')) expect(a.year, `${a.id} → ${b.id}`).toBeGreaterThanOrEqual(b.year);
    }
  });
});

describe('cine abierto', () => {
  it('cada película tiene su miniatura descargada en public/cinema', () => {
    const sinMiniatura = pdFilms.filter((f) => !existsSync(join(PUBLIC, 'cinema', `${f.id}.jpg`))).map((f) => f.id);
    expect(sinMiniatura).toEqual([]);
  });

  it('va en orden cronológico', () => {
    for (let i = 1; i < pdFilms.length; i++) {
      expect(pdFilms[i].year, pdFilms[i].id).toBeGreaterThanOrEqual(pdFilms[i - 1].year);
    }
  });

  it('etiqueta la licencia con su variante', () => {
    const t = (k: 'cinema.publicDomain' | 'cinema.ccby') => (k === 'cinema.ccby' ? 'Creative Commons' : 'Dominio público');
    expect(pdLicenseLabel(undefined, t)).toBe('Dominio público');
    expect(pdLicenseLabel('pd', t)).toBe('Dominio público');
    expect(pdLicenseLabel('cc0', t)).toBe('Dominio público');
    expect(pdLicenseLabel('cc-by', t)).toBe('Creative Commons');
    expect(pdLicenseLabel('cc-by-nc-sa', t)).toBe('Creative Commons · BY-NC-SA');
    expect(pdLicenseLabel('cc-by-nd', t)).toBe('Creative Commons · BY-ND');
  });
});

describe('showcaseIssues (portada)', () => {
  const p = (id: string, title: string, year: number, added: string) =>
    ({ id, title, issue: '', year, type: 'magazine', publisher: '', country: '', lang: 'en', added, blurb_es: '', blurb_en: '' }) as Periodical;
  const lista = [
    p('j1', 'Jump Cut', 1990, '2026-10-10'),
    p('j2', 'Jump Cut', 1991, '2026-10-10'),
    p('s1', 'Shock Cinema', 1995, '2026-10-09'),
    p('c1', 'Cinéphiles', 2020, '2026-10-08'),
    p('ph', 'Photoplay', 1925, '2026-09-01'),
    p('va', 'Variety', 1930, '2026-08-01'),
  ];

  it('alterna clásicas y modernas, empezando por una clásica', () => {
    expect(showcaseIssues(4, lista).map((x) => x.id)).toEqual(['ph', 'j2', 'va', 's1']);
  });

  it('no repite cabecera', () => {
    const titulos = showcaseIssues(6, lista).map((x) => x.title);
    expect(new Set(titulos).size).toBe(titulos.length);
  });

  it('si se acaban las de un tipo, completa con el otro', () => {
    expect(showcaseIssues(5, lista).map((x) => x.id)).toEqual(['ph', 'j2', 'va', 's1', 'c1']);
  });

  it('con los datos reales, la mitad de la portada es prensa clásica', () => {
    const out = showcaseIssues(8);
    expect(out.filter((x) => x.year <= CLASSIC_UNTIL).length).toBeGreaterThanOrEqual(4);
  });
});
