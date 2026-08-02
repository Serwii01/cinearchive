/** Idiomas originales (ISO 639-1) para el filtro de Descubrir, con etiqueta ES/EN. */
export interface Language {
  code: string;
  es: string;
  en: string;
}

export const LANGUAGES: Language[] = [
  { code: 'es', es: 'Español', en: 'Spanish' },
  { code: 'en', es: 'Inglés', en: 'English' },
  { code: 'fr', es: 'Francés', en: 'French' },
  { code: 'it', es: 'Italiano', en: 'Italian' },
  { code: 'de', es: 'Alemán', en: 'German' },
  { code: 'pt', es: 'Portugués', en: 'Portuguese' },
  { code: 'ru', es: 'Ruso', en: 'Russian' },
  { code: 'ja', es: 'Japonés', en: 'Japanese' },
  { code: 'ko', es: 'Coreano', en: 'Korean' },
  { code: 'zh', es: 'Chino', en: 'Chinese' },
  { code: 'hi', es: 'Hindi', en: 'Hindi' },
  { code: 'ar', es: 'Árabe', en: 'Arabic' },
  { code: 'fa', es: 'Persa', en: 'Persian' },
  { code: 'sv', es: 'Sueco', en: 'Swedish' },
  { code: 'da', es: 'Danés', en: 'Danish' },
  { code: 'pl', es: 'Polaco', en: 'Polish' },
];

export function languageName(code: string, lang: 'es' | 'en'): string {
  return LANGUAGES.find((l) => l.code === code)?.[lang] ?? code;
}
