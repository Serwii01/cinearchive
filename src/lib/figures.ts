import data from '../data/figures.json';

/** Cineasta destacado (id de TMDB para enlazar a su ficha de persona). */
export interface Figure {
  id: number;
  name: string;
  profile_path: string | null;
}

export const figures = data.items as Figure[];
