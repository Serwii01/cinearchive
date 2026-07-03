import data from '../data/awards.json';
import { localizedField, type Lang } from '../i18n/ui';

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
  name_gl?: string;
  name_eu?: string;
  name_ca?: string;
  note_es: string;
  note_en: string;
  note_gl?: string;
  note_eu?: string;
  note_ca?: string;
  winners: AwardWinner[];
}

export const awards = data.awards as Award[];

export const awardName = (a: Award, lang: Lang) => localizedField(a, 'name', lang);
export const awardNote = (a: Award, lang: Lang) => localizedField(a, 'note', lang);
