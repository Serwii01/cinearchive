/** Texto del manifiesto, compartido por la portada y la página /about. */
export interface ManifestoCopy {
  lead: string;
  body: string[];
  principlesTitle: string;
  principles: [string, string][];
}

export const manifesto: Record<'es' | 'en', ManifestoCopy> = {
  es: {
    lead: 'Cine Archive es una publicación editorial y un archivo digital dedicado a la historia y la curaduría del cine. No alojamos películas: catalogamos ideas.',
    body: [
      'Cada entrada es una ficha: una obra, sus metadatos técnicos y un ensayo que intenta entender por qué importa. Tratamos el texto como quien ordena un fichero de biblioteca, con la convicción de que la forma —la rejilla, la regla de un píxel, la tipografía— también es una manera de pensar.',
      'Escribimos en español e inglés porque el cine es un lenguaje sin fronteras y la crítica debería serlo también. Las dos versiones de cada artículo no son traducciones automáticas: son lecturas paralelas de la misma obra.',
      'Este es un proyecto independiente, sin publicidad y de código abierto en su construcción. Si llegaste hasta aquí, ya formas parte del archivo.',
    ],
    principlesTitle: 'Principios',
    principles: [
      ['Catálogo, no catálogo de ventas', 'Indexamos obras y ensayos, nunca contenido para consumir.'],
      ['Forma brutalista', 'Sin sombras, sin adornos: estructura, contraste y tipografía.'],
      ['Bilingüe por convicción', 'Cada texto vive en español y en inglés.'],
    ],
  },
  en: {
    lead: "Cine Archive is an editorial publication and a digital archive devoted to the history and curation of cinema. We don't host films: we catalogue ideas.",
    body: [
      'Every entry is a card: a work, its technical metadata and an essay that tries to understand why it matters. We treat text the way one orders a library index, convinced that form — the grid, the one-pixel rule, the typography — is also a way of thinking.',
      'We write in Spanish and English because cinema is a borderless language and criticism should be too. The two versions of each piece are not machine translations: they are parallel readings of the same work.',
      'This is an independent project, ad-free and open in its making. If you made it this far, you are already part of the archive.',
    ],
    principlesTitle: 'Principles',
    principles: [
      ['An index, not a storefront', 'We index works and essays, never content to consume.'],
      ['Brutalist form', 'No shadows, no ornament: structure, contrast and type.'],
      ['Bilingual by conviction', 'Every text lives in Spanish and English.'],
    ],
  },
};
