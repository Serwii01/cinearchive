import glossaryData from '../data/glossary.json';
import timelineData from '../data/timeline.json';
import { localizedField, type Lang } from '../i18n/ui';

/** Entrada del glosario de términos de cine. Campos gl/eu/ca opcionales (reserva a es). */
export interface GlossaryTerm {
  term_es: string;
  term_en: string;
  term_gl?: string;
  term_eu?: string;
  term_ca?: string;
  def_es: string;
  def_en: string;
  def_gl?: string;
  def_eu?: string;
  def_ca?: string;
}

export const glossary = glossaryData.items as GlossaryTerm[];

export const glossaryTerm = (g: GlossaryTerm, lang: Lang) => localizedField(g, 'term', lang);
export const glossaryDef = (g: GlossaryTerm, lang: Lang) => localizedField(g, 'def', lang);

/** Lista ordenada alfabéticamente por el término en el idioma dado. */
export function sortedGlossary(lang: Lang): GlossaryTerm[] {
  return glossary
    .slice()
    .sort((a, b) => glossaryTerm(a, lang).localeCompare(glossaryTerm(b, lang), lang));
}

/** Movimiento o época de la cronología del cine. Campos gl/eu/ca opcionales (reserva a es). */
export interface Movement {
  name_es: string;
  name_en: string;
  name_gl?: string;
  name_eu?: string;
  name_ca?: string;
  period: string;
  desc_es: string;
  desc_en: string;
  desc_gl?: string;
  desc_eu?: string;
  desc_ca?: string;
  keyFilms: number[];
}

export const timeline = timelineData.items as Movement[];

export const movementName = (m: Movement, lang: Lang) => localizedField(m, 'name', lang);
export const movementDesc = (m: Movement, lang: Lang) => localizedField(m, 'desc', lang);
