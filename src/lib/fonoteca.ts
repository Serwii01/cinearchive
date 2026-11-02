/**
 * Fonoteca: la música del cine (src/data/fonoteca.json). Grabaciones y partituras
 * de dominio público en Internet Archive, compositores con sus películas y los
 * hitos de la historia de la banda sonora. Pura (tiene tests).
 */
import data from '../data/fonoteca.json';
import type { Lang } from '../i18n/ui';
import { curatedFilm, curatedFilms, type CuratedFilm, type RawCuratedFilm } from './curated';

type Localized = Record<Lang, string>;

export interface Recording {
  id: string;
  title: string;
  performer: string;
  year: number;
  blurb: string;
}

export interface Score {
  id: string;
  title: string;
  author: string;
  year: number;
  blurb: string;
}

export interface Composer {
  id: string;
  name: string;
  born: number;
  /** null si vive. */
  died: number | null;
  countries: string[];
  tmdbId: number | null;
  profile: string | null;
  blurb: string;
  films: CuratedFilm[];
}

export interface Milestone {
  year: number;
  text: string;
  film: CuratedFilm | null;
}

interface RawComposer extends Omit<Composer, 'blurb' | 'films' | 'tmdbId' | 'profile'> {
  tmdbId?: number;
  profile?: string | null;
  blurb: Localized;
  films: RawCuratedFilm[];
}

const RAW = data as unknown as {
  recordings: (Omit<Recording, 'blurb'> & { blurb: Localized })[];
  scores: (Omit<Score, 'blurb'> & { blurb: Localized })[];
  composers: RawComposer[];
  milestones: { year: number; text: Localized; film: RawCuratedFilm }[];
};

export const getRecordings = (lang: Lang): Recording[] => RAW.recordings.map((r) => ({ ...r, blurb: r.blurb[lang] }));

export const getScores = (lang: Lang): Score[] => RAW.scores.map((s) => ({ ...s, blurb: s.blurb[lang] }));

/** Compositores por año de nacimiento: la historia de la banda sonora en orden. */
export const getComposers = (lang: Lang): Composer[] =>
  RAW.composers
    .map((c) => ({
      ...c,
      tmdbId: c.tmdbId ?? null,
      profile: c.profile ?? null,
      blurb: c.blurb[lang],
      films: curatedFilms(c.films, lang),
    }))
    .sort((a, b) => a.born - b.born);

export const getMilestones = (lang: Lang): Milestone[] =>
  RAW.milestones.map((m) => ({ year: m.year, text: m.text[lang], film: curatedFilm(m.film, lang) })).sort((a, b) => a.year - b.year);

/** Piezas que se pueden escuchar o leer (lo que cuenta la portadilla de Filmoteca). */
export const fonotecaCount = (): number => RAW.recordings.length + RAW.scores.length;

/** Compositor de la Fonoteca con ese id de persona de TMDB (para enlazarlo desde la ficha). */
export function composerByPerson(tmdbId: number): { id: string; name: string } | null {
  const c = RAW.composers.find((x) => x.tmdbId === tmdbId);
  return c ? { id: c.id, name: c.name } : null;
}

/** Miniatura local (descargada con scripts/fetch-fonoteca.mjs); no toca archive.org en runtime. */
export const fonoThumbUrl = (id: string) => `/fonoteca/${id}.jpg`;
/** Reproductor o lector incrustable de Internet Archive. */
export const fonoEmbedUrl = (id: string) => `https://archive.org/embed/${id}`;
/** Página pública del ítem en Internet Archive. */
export const fonoIaUrl = (id: string) => `https://archive.org/details/${id}`;
