import type { Lang } from '../i18n/ui';

/** Texto del manifiesto, compartido por la portada y la página /about. */
export interface ManifestoCopy {
  lead: string;
  body: string[];
  principlesTitle: string;
  principles: [string, string][];
}

export const manifesto: Record<Lang, ManifestoCopy> = {
  es: {
    lead: 'Cine Archive es un archivo de cine abierto y multilingüe. Creemos que la cultura cinematográfica —su historia, su prensa, su memoria— es un bien público, y la reunimos a partir de lo que ya pertenece a todos: el dominio público y el acceso abierto.',
    body: [
      'Nuestra hemeroteca rescata revistas y periódicos de cine en dominio público: cientos de páginas que documentan más de un siglo de imágenes y que cualquiera puede leer, sin muros ni cuentas. No las encerramos: las mostramos tal como son —libres— y enlazamos su fuente.',
      'Catalogamos, no vendemos. Aquí no hay entradas, ni suscripciones, ni publicidad, ni rastreadores. Los datos vienen de fuentes abiertas y gratuitas —Internet Archive, TMDB, OMDb, Wikidata— y el proyecto es abierto en su construcción. Lo que tomamos prestado, lo devolvemos con atribución.',
      'Escribimos y navegamos en español, inglés, gallego, euskera y catalán porque el cine es un lenguaje sin fronteras, y el conocimiento que es de todos no debería hablar una sola lengua. Si llegaste hasta aquí, esto también es tuyo.',
    ],
    principlesTitle: 'Principios',
    principles: [
      ['De dominio público', 'Damos prioridad a lo que ya es libre: dominio público y acceso abierto, con su fuente siempre citada.'],
      ['Sin muros', 'Sin pagos, sin anuncios, sin rastreo. Un catálogo para explorar, no una tienda.'],
    ],
  },
  en: {
    lead: 'Cine Archive is an open, multilingual film archive. We believe film culture —its history, its press, its memory— is a public good, and we gather it from what already belongs to everyone: the public domain and open access.',
    body: [
      'Our periodicals library rescues public-domain film magazines and newspapers: hundreds of pages documenting more than a century of moving images that anyone can read, with no paywalls and no accounts. We don\'t lock them away —we show them as they are, free, and link back to their source.',
      'We catalogue, we don\'t sell. There are no tickets, no subscriptions, no advertising, no trackers. Our data comes from open, free sources —Internet Archive, TMDB, OMDb, Wikidata— and the project is open in its making. What we borrow, we return with attribution.',
      'We write and browse in Spanish, English, Galician, Basque and Catalan because cinema is a borderless language, and knowledge that belongs to everyone should not speak only one. If you made it this far, this is yours too.',
    ],
    principlesTitle: 'Principles',
    principles: [
      ['Public domain first', 'We prioritise what is already free: public domain and open access, always crediting the source.'],
      ['No walls', 'No payments, no ads, no tracking. An index to explore, not a store.'],
    ],
  },
  gl: {
    lead: 'Cine Archive é un arquivo de cine aberto e multilingüe. Cremos que a cultura cinematográfica —a súa historia, a súa prensa, a súa memoria— é un ben público, e reunímola a partir do que xa pertence a todos: o dominio público e o acceso aberto.',
    body: [
      'A nosa hemeroteca rescata revistas e xornais de cine en dominio público: centos de páxinas que documentan máis dun século de imaxes e que calquera pode ler, sen muros nin contas. Non as pechamos: mostrámolas tal como son —libres— e ligamos a súa fonte.',
      'Catalogamos, non vendemos. Aquí non hai entradas, nin subscricións, nin publicidade, nin rastrexadores. Os datos veñen de fontes abertas e gratuítas —Internet Archive, TMDB, OMDb, Wikidata— e o proxecto é aberto na súa construción. O que tomamos prestado, devolvémolo con atribución.',
      'Escribimos e navegamos en español, inglés, galego, éuscaro e catalán porque o cine é unha linguaxe sen fronteiras, e o coñecemento que é de todos non debería falar unha soa lingua. Se chegaches ata aquí, isto tamén é teu.',
    ],
    principlesTitle: 'Principios',
    principles: [
      ['De dominio público', 'Damos prioridade ao que xa é libre: dominio público e acceso aberto, coa súa fonte sempre citada.'],
      ['Sen muros', 'Sen pagamentos, sen anuncios, sen rastrexo. Un catálogo para explorar, non unha tenda.'],
    ],
  },
  eu: {
    lead: 'Cine Archive zinema-artxibo ireki eta eleaniztuna da. Zinema-kultura —bere historia, bere prentsa, bere memoria— ondasun publikoa dela uste dugu, eta dagoeneko guztiona denetik biltzen dugu: jabari publikotik eta sarbide irekitik.',
    body: [
      'Gure hemerotekak jabari publikoko zinema-aldizkariak eta egunkariak berreskuratzen ditu: irudien mende bat baino gehiago dokumentatzen duten ehunka orrialde, edonork irakur ditzakeenak, hormarik eta konturik gabe. Ez ditugu giltzapetzen: diren bezala erakusten ditugu —libre— eta haien iturria estekatzen dugu.',
      'Katalogatu egiten dugu, ez saldu. Hemen ez dago sarrerarik, ez harpidetzarik, ez publizitaterik, ez arakatzailerik. Datuak iturri ireki eta doakoetatik datoz —Internet Archive, TMDB, OMDb, Wikidata— eta proiektua irekia da bere eraikuntzan. Maileguan hartzen duguna, aitorpenarekin itzultzen dugu.',
      'Gaztelaniaz, ingelesez, galegoz, euskaraz eta katalanez idazten eta nabigatzen dugu, zinema mugarik gabeko hizkuntza delako, eta guztiona den ezagutzak ez lukeelako hizkuntza bakarra hitz egin behar. Honaino iritsi bazara, hau ere zurea da.',
    ],
    principlesTitle: 'Printzipioak',
    principles: [
      ['Jabari publikoa lehenik', 'Dagoeneko librea denari ematen diogu lehentasuna: jabari publikoari eta sarbide irekiari, iturria beti aipatuta.'],
      ['Hormarik gabe', 'Ordainketarik, iragarkirik eta jarraipenik gabe. Esploratzeko katalogo bat, ez denda bat.'],
    ],
  },
  ca: {
    lead: 'Cine Archive és un arxiu de cinema obert i multilingüe. Creiem que la cultura cinematogràfica —la seva història, la seva premsa, la seva memòria— és un bé públic, i la reunim a partir del que ja pertany a tothom: el domini públic i l’accés obert.',
    body: [
      'La nostra hemeroteca rescata revistes i diaris de cinema de domini públic: centenars de pàgines que documenten més d’un segle d’imatges i que qualsevol pot llegir, sense murs ni comptes. No les tanquem: les mostrem tal com són —lliures— i n’enllacem la font.',
      'Cataloguem, no venem. Aquí no hi ha entrades, ni subscripcions, ni publicitat, ni rastrejadors. Les dades vénen de fonts obertes i gratuïtes —Internet Archive, TMDB, OMDb, Wikidata— i el projecte és obert en la seva construcció. El que agafem en préstec, ho tornem amb atribució.',
      'Escrivim i naveguem en espanyol, anglès, gallec, basc i català perquè el cinema és un llenguatge sense fronteres, i el coneixement que és de tothom no hauria de parlar una sola llengua. Si has arribat fins aquí, això també és teu.',
    ],
    principlesTitle: 'Principis',
    principles: [
      ['De domini públic', 'Donem prioritat al que ja és lliure: domini públic i accés obert, amb la font sempre citada.'],
      ['Sense murs', 'Sense pagaments, sense anuncis, sense rastreig. Un catàleg per explorar, no una botiga.'],
    ],
  },
};
