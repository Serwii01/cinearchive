import { describe, it, expect } from 'vitest';
import { ephemerides, getEphemerides, ephemerisDay, ephemerisText } from '../src/lib/ephemerides';
import { languages, type Lang } from '../src/i18n/ui';

const LANGS = Object.keys(languages) as Lang[];
const dayOfYear = (m: number, d: number) => Date.UTC(2026, m - 1, d) / 86_400_000;

describe('ephemerides.json', () => {
  it('nunca deja más de una semana sin efeméride', () => {
    // La portada enseña la próxima: con huecos de mes y medio (había uno del
    // 6 de octubre al 17 de noviembre) parecía que la sección no funcionaba.
    const days = [...new Set(ephemerides.map((e) => dayOfYear(e.month, e.day)))].sort((a, b) => a - b);
    const gaps = days.map((d, i) => ((days[(i + 1) % days.length] - d + 365) % 365) || 365);
    expect(Math.max(...gaps)).toBeLessThanOrEqual(7);
  });

  it('cada efeméride tiene fecha válida y texto en los cinco idiomas', () => {
    for (const e of ephemerides) {
      const date = new Date(Date.UTC(e.year, e.month - 1, e.day));
      expect(date.getUTCMonth() + 1, `${e.day}/${e.month}/${e.year}`).toBe(e.month);
      for (const lang of LANGS) expect(e[`text_${lang}`], `${e.text_es} (${lang})`).toBeTruthy();
    }
  });
});

describe('getEphemerides', () => {
  it('detecta las del día y, si no hay, da la siguiente', () => {
    const scorsese = getEphemerides(new Date(Date.UTC(2026, 10, 17)));
    expect(scorsese.onThisDay.map((e) => e.year)).toContain(1942);
    const despues = getEphemerides(new Date(Date.UTC(2026, 10, 18)));
    expect(despues.onThisDay).toHaveLength(0);
    expect(despues.next.month * 100 + despues.next.day).toBeGreaterThan(1118);
  });
});

describe('ephemerisDay', () => {
  it('da el día y el mes sin año', () => {
    const e = { month: 11, day: 17, year: 1942, text_es: 'x', text_en: 'x' };
    expect(ephemerisDay(e, 'es')).toBe('17 de noviembre');
    expect(ephemerisDay(e, 'en')).not.toMatch(/1942|2000/);
    expect(ephemerisDay({ ...e, month: 2, day: 29 }, 'es')).toBe('29 de febrero');
  });

  it('el texto sale en el idioma pedido', () => {
    const e = ephemerides[0];
    expect(ephemerisText(e, 'en')).toBe(e.text_en);
  });
});
