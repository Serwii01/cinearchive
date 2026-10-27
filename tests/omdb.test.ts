import { describe, it, expect } from 'vitest';
import { translateAwards } from '../src/lib/omdb';

describe('translateAwards', () => {
  it('el caso de «Cuentos de Tokio»: solo el total', () => {
    expect(translateAwards('3 wins total', 'es')).toBe('3 premios en total');
    expect(translateAwards('1 win total', 'es')).toBe('1 premio en total');
  });

  it('premio principal + totales', () => {
    expect(translateAwards('Won 3 Oscars. 97 wins & 140 nominations total', 'es')).toBe(
      'Ganó 3 Óscar. 97 premios y 140 nominaciones en total',
    );
    expect(translateAwards('Nominated for 2 Golden Globes. 5 wins & 12 nominations total', 'es')).toBe(
      'Nominada a 2 Globos de Oro. 5 premios y 12 nominaciones en total',
    );
    expect(translateAwards('Won 1 Oscar. 1 win & 3 nominations total', 'ca')).toBe(
      'Va guanyar 1 Oscar. 1 premi i 3 nominacions en total',
    );
  });

  it('solo nominaciones', () => {
    expect(translateAwards('2 nominations total', 'gl')).toBe('2 nomeamentos en total');
  });

  it('BAFTA y Emmy', () => {
    expect(translateAwards('Won 1 BAFTA Award. 4 wins total', 'es')).toBe('Ganó 1 BAFTA. 4 premios en total');
    expect(translateAwards('Nominated for 1 Primetime Emmy. 2 nominations total', 'eu')).toBe(
      '1 Emmy saritarako hautagaia. Guztira 2 hautagaitza',
    );
  });

  it('en inglés se deja igual', () => {
    expect(translateAwards('3 wins total', 'en')).toBe('3 wins total');
  });

  it('lo que no encaja se deja como viene, antes que inventar', () => {
    expect(translateAwards('Won 2 Palme d\'Or awards. 3 wins total', 'es')).toBe("Won 2 Palme d'Or awards. 3 wins total");
    expect(translateAwards('Something else entirely', 'es')).toBe('Something else entirely');
  });
});
