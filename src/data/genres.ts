/** Géneros de película de TMDB (lista fija) con etiqueta en los cinco idiomas. */
export interface Genre {
  id: number;
  es: string;
  en: string;
  gl: string;
  eu: string;
  ca: string;
}

export const GENRES: Genre[] = [
  { id: 28, es: 'Acción', en: 'Action', gl: 'Acción', eu: 'Ekintza', ca: 'Acció' },
  { id: 12, es: 'Aventura', en: 'Adventure', gl: 'Aventura', eu: 'Abentura', ca: 'Aventura' },
  { id: 16, es: 'Animación', en: 'Animation', gl: 'Animación', eu: 'Animazioa', ca: 'Animació' },
  { id: 35, es: 'Comedia', en: 'Comedy', gl: 'Comedia', eu: 'Komedia', ca: 'Comèdia' },
  { id: 80, es: 'Crimen', en: 'Crime', gl: 'Crime', eu: 'Krimena', ca: 'Crim' },
  { id: 99, es: 'Documental', en: 'Documentary', gl: 'Documental', eu: 'Dokumentala', ca: 'Documental' },
  { id: 18, es: 'Drama', en: 'Drama', gl: 'Drama', eu: 'Drama', ca: 'Drama' },
  { id: 10751, es: 'Familia', en: 'Family', gl: 'Familia', eu: 'Familia', ca: 'Família' },
  { id: 14, es: 'Fantasía', en: 'Fantasy', gl: 'Fantasía', eu: 'Fantasia', ca: 'Fantasia' },
  { id: 36, es: 'Historia', en: 'History', gl: 'Historia', eu: 'Historia', ca: 'Història' },
  { id: 27, es: 'Terror', en: 'Horror', gl: 'Terror', eu: 'Beldurra', ca: 'Terror' },
  { id: 10402, es: 'Música', en: 'Music', gl: 'Música', eu: 'Musika', ca: 'Música' },
  { id: 9648, es: 'Misterio', en: 'Mystery', gl: 'Misterio', eu: 'Misterioa', ca: 'Misteri' },
  { id: 10749, es: 'Romance', en: 'Romance', gl: 'Romance', eu: 'Erromantikoa', ca: 'Romanç' },
  { id: 878, es: 'Ciencia ficción', en: 'Science Fiction', gl: 'Ciencia ficción', eu: 'Zientzia-fikzioa', ca: 'Ciència-ficció' },
  { id: 53, es: 'Suspense', en: 'Thriller', gl: 'Suspense', eu: 'Suspensea', ca: 'Suspens' },
  { id: 10752, es: 'Bélica', en: 'War', gl: 'Bélica', eu: 'Gerra', ca: 'Bèl·lica' },
  { id: 37, es: 'Western', en: 'Western', gl: 'Western', eu: 'Westerna', ca: 'Western' },
];

export type GenreLang = keyof Omit<Genre, 'id'>;

export function genreName(id: number, lang: string): string {
  const g = GENRES.find((x) => x.id === id);
  if (!g) return String(id);
  return g[(lang in g ? lang : 'es') as GenreLang];
}
