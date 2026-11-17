import { describe, it, expect } from 'vitest';
import {
  criticas,
  criticasDe,
  criticasDeTmdb,
  criticasEnNumero,
  paginaUrl,
  notaDe,
  fechaCritica,
  problemas,
  type Critica,
} from '../src/lib/critica';
import { pdFilms } from '../src/lib/pdfilms';

const conTmdb = pdFilms.find((f) => f.tmdbId)!;
const base: Critica = {
  film: conTmdb.id,
  ia: 'variety88-1927-09',
  revista: 'Variety',
  fecha: '1927-09-28',
  pagina: 21,
  lang: 'en',
  texto: 'A great picture.',
  nota_es: 'Le encanta.',
  nota_en: 'Loves it.',
  nota_gl: 'Encántalle.',
  nota_eu: 'Asko gustatzen zaio.',
  nota_ca: 'Li encanta.',
};

describe('critica.json', () => {
  it('no tiene errores: película existente, fecha, página, texto y notas en los 5 idiomas', () => {
    expect(problemas()).toEqual([]);
  });

  it('van ordenadas por fecha', () => {
    const fechas = criticas.map((c) => c.fecha);
    expect(fechas).toEqual([...fechas].sort());
  });
});

describe('problemas', () => {
  it('detecta película desconocida, fecha mala, texto largo, nota que falta y repetidas', () => {
    const malas: Critica[] = [
      { ...base, film: 'no-existe' },
      { ...base, ia: 'otro', fecha: '28/09/1927' },
      { ...base, ia: 'largo', texto: 'x'.repeat(5000) },
      { ...base, ia: 'sin-nota', nota_eu: '' },
      base,
      base,
    ];
    const p = problemas(malas).join('\n');
    expect(p).toMatch(/no está en Cine abierto/);
    expect(p).toMatch(/fecha/);
    expect(p).toMatch(/texto vacío o de más/);
    expect(p).toMatch(/falta nota_eu/);
    expect(p).toMatch(/repetida/);
    expect(problemas([base])).toEqual([]);
  });
});

describe('búsquedas', () => {
  const lista = [base, { ...base, ia: 'photoplay', fecha: '1927-11', pagina: 3 }];
  it('por película, por id de TMDB y por número', () => {
    expect(criticasDe(conTmdb.id, lista)).toHaveLength(2);
    expect(criticasDeTmdb(conTmdb.tmdbId!, lista)).toHaveLength(2);
    expect(criticasDeTmdb(-1, lista)).toEqual([]);
    expect(criticasEnNumero('photoplay', lista)).toHaveLength(1);
  });
});

describe('presentación', () => {
  it('enlaza a la página del visor de Internet Archive', () => {
    expect(paginaUrl(base)).toBe('https://archive.org/details/variety88-1927-09/page/n21/mode/1up');
  });
  it('la nota en el idioma de la página, y en castellano si falta', () => {
    expect(notaDe(base, 'eu')).toBe('Asko gustatzen zaio.');
    expect(notaDe({ ...base, nota_gl: '' }, 'gl')).toBe('Le encanta.');
  });
  it('fecha con día o solo con mes', () => {
    expect(fechaCritica('1927-09-28', 'es')).toBe('28 de septiembre de 1927');
    expect(fechaCritica('1927-11', 'en')).toBe('November 1927');
  });
});
