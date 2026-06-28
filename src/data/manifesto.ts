/** Texto del manifiesto, compartido por la portada y la página /about. */
export interface ManifestoCopy {
  lead: string;
  body: string[];
  principlesTitle: string;
  principles: [string, string][];
}

export const manifesto: Record<'es' | 'en', ManifestoCopy> = {
  es: {
    lead: 'Cine Archive es un archivo de cine abierto y bilingüe. Creemos que la cultura cinematográfica —su historia, su prensa, su memoria— es un bien público, y la reunimos a partir de lo que ya pertenece a todos: el dominio público y el acceso abierto.',
    body: [
      'Nuestra hemeroteca rescata revistas y periódicos de cine en dominio público: cientos de páginas que documentan más de un siglo de imágenes y que cualquiera puede leer, sin muros ni cuentas. No las encerramos: las mostramos tal como son —libres— y enlazamos su fuente.',
      'Catalogamos, no vendemos. Aquí no hay entradas, ni suscripciones, ni publicidad, ni rastreadores. Los datos vienen de fuentes abiertas y gratuitas —Internet Archive, TMDB, OMDb, Wikidata— y el proyecto es abierto en su construcción. Lo que tomamos prestado, lo devolvemos con atribución.',
      'Escribimos y navegamos en español e inglés porque el cine es un lenguaje sin fronteras, y el conocimiento que es de todos no debería hablar una sola lengua. Si llegaste hasta aquí, esto también es tuyo.',
    ],
    principlesTitle: 'Principios',
    principles: [
      ['De dominio público', 'Damos prioridad a lo que ya es libre: dominio público y acceso abierto, con su fuente siempre citada.'],
      ['Sin muros', 'Sin pagos, sin anuncios, sin rastreo. Un catálogo para explorar, no una tienda.'],
    ],
  },
  en: {
    lead: 'Cine Archive is an open, bilingual film archive. We believe film culture —its history, its press, its memory— is a public good, and we gather it from what already belongs to everyone: the public domain and open access.',
    body: [
      'Our periodicals library rescues public-domain film magazines and newspapers: hundreds of pages documenting more than a century of moving images that anyone can read, with no paywalls and no accounts. We don\'t lock them away —we show them as they are, free, and link back to their source.',
      'We catalogue, we don\'t sell. There are no tickets, no subscriptions, no advertising, no trackers. Our data comes from open, free sources —Internet Archive, TMDB, OMDb, Wikidata— and the project is open in its making. What we borrow, we return with attribution.',
      'We write and browse in Spanish and English because cinema is a borderless language, and knowledge that belongs to everyone should not speak only one. If you made it this far, this is yours too.',
    ],
    principlesTitle: 'Principles',
    principles: [
      ['Public domain first', 'We prioritise what is already free: public domain and open access, always crediting the source.'],
      ['No walls', 'No payments, no ads, no tracking. An index to explore, not a store.'],
    ],
  },
};
