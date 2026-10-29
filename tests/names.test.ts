import { describe, it, expect } from 'vitest';
import { hasNonLatin, pickLatinAlias, transliterateCyrillic, latinName } from '../src/lib/names';

describe('hasNonLatin', () => {
  it('detecta kanji, hangul, cirílico y hebreo', () => {
    expect(hasNonLatin('中井朝一')).toBe(true);
    expect(hasNonLatin('김상범')).toBe(true);
    expect(hasNonLatin('Иван Бобров')).toBe(true);
    expect(hasNonLatin('רחל שור')).toBe(true);
  });
  it('acepta nombres latinos con tildes, guiones y apóstrofos', () => {
    expect(hasNonLatin('Toshirō Mifune')).toBe(false);
    expect(hasNonLatin("Peter O'Toole")).toBe(false);
    expect(hasNonLatin('Jean-Luc Godard')).toBe(false);
    expect(hasNonLatin('Agnès Varda')).toBe(false);
  });
});

describe('pickLatinAlias', () => {
  it('toma el primer alias latino', () => {
    expect(pickLatinAlias(['김상범', 'Kim Sang-beom'])).toBe('Kim Sang-beom');
    expect(pickLatinAlias(['Ryunosuke Akutagawa', '澄江堂主人'])).toBe('Ryunosuke Akutagawa');
  });
  it('salta las iniciales y devuelve null si no hay nada', () => {
    expect(pickLatinAlias(['I. Bobrov', 'Ivan Bobrov'])).toBe('Ivan Bobrov');
    expect(pickLatinAlias(['И. Бобров'])).toBeNull();
    expect(pickLatinAlias([])).toBeNull();
    expect(pickLatinAlias(null)).toBeNull();
  });
});

describe('transliterateCyrillic', () => {
  it('pasa el ruso y el ucraniano a latino respetando mayúsculas', () => {
    expect(transliterateCyrillic('Иван Бобров')).toBe('Ivan Bobrov');
    expect(transliterateCyrillic('Сергей Мачильский')).toBe('Sergey Machilskiy');
    expect(transliterateCyrillic('Щукин')).toBe('Shchukin');
    expect(transliterateCyrillic('Ярослав Їжак')).toBe('Yaroslav Yizhak');
  });
});

describe('latinName', () => {
  it('deja igual lo que ya es latino', () => {
    expect(latinName({ name: 'Akira Kurosawa', wikidataLabel: 'X' })).toBe('Akira Kurosawa');
  });
  it('prefiere Wikidata, luego el alias y luego la transliteración', () => {
    expect(latinName({ name: '中井朝一', aliases: ['Nakai'], wikidataLabel: 'Asakazu Nakai' })).toBe('Asakazu Nakai');
    expect(latinName({ name: '中井朝一', aliases: ['Asakazu Nakai'], wikidataLabel: '中井朝一' })).toBe('Asakazu Nakai');
    expect(latinName({ name: 'Иван Бобров', aliases: [] })).toBe('Ivan Bobrov');
  });
  it('usa el nombre de la ficha de persona si el del reparto no es latino', () => {
    expect(latinName({ name: '宮口精二', primaryName: 'Seiji Miyaguchi', aliases: ['宫口精二'] })).toBe('Seiji Miyaguchi');
    expect(latinName({ name: '宮口精二', primaryName: '宮口精二', aliases: ['Seiji Miyaguchi'] })).toBe('Seiji Miyaguchi');
  });
  it('devuelve null cuando no hay forma latina', () => {
    expect(latinName({ name: '中井朝一', aliases: [] })).toBeNull();
  });
});
