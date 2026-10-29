import { describe, it, expect } from 'vitest';
import { titlesFrom } from '../src/lib/titles';

const tr = (iso_639_1: string, iso_3166_1: string, title: string) => ({ iso_639_1, iso_3166_1, data: { title } });

describe('titlesFrom', () => {
  it('cada idioma con su título, y el catalán con el suyo', () => {
    const t = titlesFrom({ title: 'Parásitos', original_title: '기생충', original_language: 'ko' }, [
      tr('es', 'ES', 'Parásitos'),
      tr('es', 'MX', 'Parásitos'),
      tr('en', 'US', 'Parasite'),
      tr('ca', 'ES', 'Paràsits'),
    ]);
    expect(t).toEqual({ es: 'Parásitos', en: 'Parasite', gl: 'Parásitos', eu: 'Parásitos', ca: 'Paràsits' });
  });

  it('España antes que México', () => {
    const t = titlesFrom({ original_title: '花樣年華', original_language: 'cn' }, [
      tr('es', 'MX', 'Con Ánimo de Amar'),
      tr('es', 'ES', 'Deseando amar'),
      tr('en', 'US', 'In the Mood for Love'),
    ]);
    expect(t.es).toBe('Deseando amar');
  });

  it('título vacío en el idioma original: vale el original', () => {
    const t = titlesFrom({ original_title: 'El espíritu de la colmena', original_language: 'es' }, [
      tr('es', 'ES', ''),
      tr('en', 'US', 'The Spirit of the Beehive'),
    ]);
    expect(t.es).toBe('El espíritu de la colmena');
    expect(t.en).toBe('The Spirit of the Beehive');
  });

  it('sin traducción al castellano: el inglés antes que un original ilegible', () => {
    const t = titlesFrom({ original_title: '乱', original_language: 'ja' }, [tr('en', 'US', 'Ran')]);
    expect(t.es).toBe('Ran');
  });

  it('sin traducciones: el original en todos', () => {
    const t = titlesFrom({ original_title: 'Heat', original_language: 'en' }, []);
    expect(Object.values(t)).toEqual(['Heat', 'Heat', 'Heat', 'Heat', 'Heat']);
  });
});
