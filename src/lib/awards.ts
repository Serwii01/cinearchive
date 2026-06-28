import data from '../data/awards.json';
import type { Lang } from '../i18n/ui';

export interface AwardWinner {
  year: number;
  title: string;
  director?: string;
  tmdbId?: number;
}

export interface Award {
  key: string;
  name_es: string;
  name_en: string;
  note_es: string;
  note_en: string;
  winners: AwardWinner[];
}

export const awards = data.awards as Award[];

export const awardName = (a: Award, lang: Lang) => (lang === 'es' ? a.name_es : a.name_en);
export const awardNote = (a: Award, lang: Lang) => (lang === 'es' ? a.note_es : a.note_en);
