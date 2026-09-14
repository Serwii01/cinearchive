import { describe, it, expect } from 'vitest';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { periodicals, recentIssues } from '../src/lib/periodicals';
import { pdFilms, pdLicenseLabel } from '../src/lib/pdfilms';

const PUBLIC = join(process.cwd(), 'public');

describe('hemeroteca', () => {
  it('cada número tiene su portada descargada en public/covers', () => {
    // Las portadas se sirven desde nuestro dominio, no desde archive.org:
    // si falta una, la tarjeta sale en negro. Se arregla con
    // `node scripts/fetch-covers.mjs`.
    const sinPortada = periodicals.filter((p) => !existsSync(join(PUBLIC, 'covers', `${p.id}.jpg`))).map((p) => p.id);
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
