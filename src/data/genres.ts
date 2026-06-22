/** Géneros de película de TMDB (lista fija) con etiqueta en ES/EN. */
export interface Genre {
  id: number;
  es: string;
  en: string;
}

export const GENRES: Genre[] = [
  { id: 28, es: 'Acción', en: 'Action' },
  { id: 12, es: 'Aventura', en: 'Adventure' },
  { id: 16, es: 'Animación', en: 'Animation' },
  { id: 35, es: 'Comedia', en: 'Comedy' },
  { id: 80, es: 'Crimen', en: 'Crime' },
  { id: 99, es: 'Documental', en: 'Documentary' },
  { id: 18, es: 'Drama', en: 'Drama' },
  { id: 10751, es: 'Familia', en: 'Family' },
  { id: 14, es: 'Fantasía', en: 'Fantasy' },
  { id: 36, es: 'Historia', en: 'History' },
  { id: 27, es: 'Terror', en: 'Horror' },
  { id: 10402, es: 'Música', en: 'Music' },
  { id: 9648, es: 'Misterio', en: 'Mystery' },
  { id: 10749, es: 'Romance', en: 'Romance' },
  { id: 878, es: 'Ciencia ficción', en: 'Science Fiction' },
  { id: 53, es: 'Suspense', en: 'Thriller' },
  { id: 10752, es: 'Bélica', en: 'War' },
  { id: 37, es: 'Western', en: 'Western' },
];

export function genreName(id: number, lang: 'es' | 'en'): string {
  return GENRES.find((g) => g.id === id)?.[lang] ?? String(id);
}
