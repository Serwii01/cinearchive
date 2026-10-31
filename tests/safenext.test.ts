import { describe, it, expect } from 'vitest';
import { safeNext } from '../src/lib/safenext';

const HOME = '/';

describe('safeNext', () => {
  it('acepta rutas propias, con su consulta', () => {
    expect(safeNext('/film/348-alien', HOME)).toBe('/film/348-alien');
    expect(safeNext('/en/search?q=alien', HOME)).toBe('/en/search?q=alien');
  });

  it('sin parámetro, la portada', () => {
    expect(safeNext(null, HOME)).toBe(HOME);
    expect(safeNext('', '/en')).toBe('/en');
  });

  it('rechaza cualquier salida a otro dominio', () => {
    expect(safeNext('https://otro-sitio.example', HOME)).toBe(HOME);
    expect(safeNext('//otro-sitio.example', HOME)).toBe(HOME);
    expect(safeNext('/\\otro-sitio.example', HOME)).toBe(HOME);
    expect(safeNext('/\t/otro-sitio.example', HOME)).toBe(HOME);
    expect(safeNext('javascript:alert(1)', HOME)).toBe(HOME);
  });

  it('no devuelve a la página de acceso, que sería un bucle', () => {
    expect(safeNext('/login', HOME)).toBe(HOME);
    expect(safeNext('/en/login?next=/x', HOME)).toBe(HOME);
    expect(safeNext('/register', HOME)).toBe(HOME);
  });
});
