import glossaryData from '../data/glossary.json';
import timelineData from '../data/timeline.json';
import { contentLang, type Lang } from '../i18n/ui';

/** Entrada del glosario de términos de cine. */
export interface GlossaryTerm {
  term_es: string;
  term_en: string;
  def_es: string;
  def_en: string;
}

export const glossary = glossaryData.items as GlossaryTerm[];

export const glossaryTerm = (g: GlossaryTerm, lang: Lang) => (contentLang(lang) === 'es' ? g.term_es : g.term_en);
export const glossaryDef = (g: GlossaryTerm, lang: Lang) => (contentLang(lang) === 'es' ? g.def_es : g.def_en);

/** Lista ordenada alfabéticamente por el término en el idioma dado. */
export function sortedGlossary(lang: Lang): GlossaryTerm[] {
  return glossary
    .slice()
    .sort((a, b) => glossaryTerm(a, lang).localeCompare(glossaryTerm(b, lang), lang));
}

/** Movimiento o época de la cronología del cine. */
export interface Movement {
  name_es: string;
  name_en: string;
  period: string;
  desc_es: string;
  desc_en: string;
  keyFilms: number[];
}

export const timeline = timelineData.items as Movement[];

export const movementName = (m: Movement, lang: Lang) => (contentLang(lang) === 'es' ? m.name_es : m.name_en);
export const movementDesc = (m: Movement, lang: Lang) => (contentLang(lang) === 'es' ? m.desc_es : m.desc_en);
