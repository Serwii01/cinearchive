import type { Lang } from '../i18n/ui';

/**
 * Dosieres especiales: piezas de fondo sobre una cinematografía concreta.
 *
 * No son colecciones (src/data/collections.json), que solo agrupan películas
 * por tema. Aquí hay texto propio, cronología, festival y una selección
 * comentada, porque el objeto del dosier no es la lista sino el relato: qué
 * condiciones materiales —colonización, ocupación, exilio, archivos
 * saqueados— hacen que un cine exista o no exista.
 *
 * Cada dosier trae su texto completo en los cinco idiomas, como el manifiesto.
 * tests/dossiers.test.ts comprueba que las cinco versiones tienen la misma
 * estructura y las mismas películas, que es lo que se descuadra al editar.
 */

export interface DossierMilestone {
  /** Año o rango, tal cual se imprime: «1948», «1958–1975». */
  year: string;
  title: string;
  text: string;
}

export interface DossierFilm {
  tmdbId: number;
  /** Por qué está aquí. El título, el año y el cartel los pone TMDB. */
  note: string;
}

export interface DossierFestival {
  name: string;
  body: string[];
  /** Ficha técnica del festival: pares etiqueta/valor. */
  facts: [string, string][];
}

export interface DossierCopy {
  kicker: string;
  title: string;
  /** Una línea para las tarjetas de portada y del índice. */
  blurb: string;
  lead: string;
  body: string[];
  quote: { text: string; source: string };
  chronology: DossierMilestone[];
  festival: DossierFestival;
  filmsIntro: string;
  films: DossierFilm[];
}

export interface DossierSource {
  label: string;
  url: string;
}

export interface Dossier {
  slug: string;
  /** Fuentes consultadas. No se traducen: son enlaces. */
  sources: DossierSource[];
  copy: Record<Lang, DossierCopy>;
}

const palestina: Dossier = {
  slug: 'cine-palestino',
  sources: [
    { label: 'Sight & Sound (BFI) · Not forgotten: The Palestinian Film Archive', url: 'https://www.bfi.org.uk/sight-and-sound/features/not-forgotten-palestinian-film-archive' },
    { label: 'The New York Review of Books · From Palestine to the World, the Militant Film of the PLO', url: 'https://www.nybooks.com/online/2020/10/17/from-palestine-to-the-world-the-militant-film-of-the-plo/' },
    { label: 'Filmlab Palestine · Palestine Cinema Days', url: 'https://flp.ps/' },
    { label: 'The Palestinian Museum Digital Archive', url: 'https://palarchive.org/' },
  ],
  copy: {
    es: {
      kicker: 'Dosier especial · Cine y descolonización',
      title: 'Cine palestino',
      blurb: 'Un cine hecho en el exilio, bajo ocupación y con el archivo incautado: de la Unidad de Cine Palestino de 1968 al Oscar de No Other Land.',
      lead: 'No hay cine palestino sin la pregunta de quién tiene derecho a filmar. Desde 1948 la cámara palestina trabaja en el exilio, bajo ocupación militar y con sus archivos incautados. Filmar es, aquí, una forma de permanecer.',
      body: [
        'Antes de 1948 hubo un principio. Ibrahim Hasan Sirhan rueda en los años treinta las primeras imágenes tomadas por un palestino y llega a montar una pequeña productora en Jaffa. La Nakba se lo llevó por delante —las salas, los laboratorios, los negativos y las ciudades donde estaban— y durante veinte años Palestina fue un territorio abundantemente filmado por otros: noticiarios coloniales, propaganda y películas de aventuras rodadas en un país del que se había expulsado a su gente.',
        'El cine palestino como tal nace en 1968, en Amán, con la Unidad de Cine Palestino que fundan Sulafa Yadalá —de las primeras camarógrafas del mundo árabe—, Mustafa Abu Ali y Hani Yauhariya. Es cine de urgencia, en 16 mm, hermanado con el Tercer Cine latinoamericano, con Argelia y con Vietnam: un internacionalismo antiimperialista que entiende la película a la vez como documento, como escuela y como herramienta política. Yauhariya murió filmando en Líbano en 1976.',
        'En 1982, con la entrada del ejército israelí en Beirut, desaparece el archivo de la Institución de Cine Palestino: décadas de metraje incautadas y nunca devueltas, parte de ellas catalogadas hoy en archivos militares. El archivo es también territorio, y quien controla las imágenes de un pueblo controla lo que de ese pueblo puede contarse. Buena parte del cine palestino de los últimos treinta años trabaja sobre ese vacío: buscar lo perdido, o volver a filmar lo que se borró.',
        'Después llegaron los autores —Michel Khleifi, Elia Suleiman, Annemarie Jacir, Hany Abu-Assad, Darin J. Sallam— y con ellos un obstáculo nuevo, burocrático: permisos, controles militares, coproducciones que hay que armar entre cuatro países y una Academia de Hollywood que en 2002 rechaza una candidatura porque Palestina no figura en su lista de países reconocidos. El cine palestino existía mucho antes de que se reconociera el Estado, y esa es exactamente su tesis.',
      ],
      quote: {
        text: '¿Por qué no golpeasteis las paredes del depósito?',
        source: 'Ghassan Kanafani, Hombres en el sol (1963), llevada al cine en Los engañados',
      },
      chronology: [
        { year: '1935', title: 'Las primeras imágenes', text: 'Ibrahim Hasan Sirhan filma en Jaffa la visita del príncipe Saud: el primer metraje rodado por un palestino del que hay constancia.' },
        { year: '1948', title: 'La Nakba', text: 'Unas 750.000 personas son expulsadas. Con las ciudades desaparecen las salas, los laboratorios y las películas. Siguen veinte años casi sin imágenes propias.' },
        { year: '1968', title: 'Unidad de Cine Palestino', text: 'Sulafa Yadalá, Mustafa Abu Ali y Hani Yauhariya fundan en Amán un cine de la revolución, en la órbita del Tercer Cine y del cine militante argelino.' },
        { year: '1972', title: 'Los engañados', text: 'Tawfiq Saleh adapta a Ghassan Kanafani: tres refugiados asfixiados en la cisterna de un camión. La imagen que fijó el exilio para todo el mundo árabe.' },
        { year: '1974', title: 'Institución de Cine Palestino', text: 'En Beirut se organiza el archivo del cine palestino, con las películas propias y las de solidaridad rodadas por cineastas de medio mundo.' },
        { year: '1982', title: 'El archivo saqueado', text: 'El ejército israelí toma Beirut y el archivo desaparece. Nunca ha sido devuelto: parte del material aparece catalogado en archivos militares israelíes.' },
        { year: '1987', title: 'Boda en Galilea', text: 'Michel Khleifi rueda dentro de Palestina el primer largometraje palestino de ficción, con permiso del gobernador militar, que es también el argumento.' },
        { year: '2002', title: 'Intervención divina', text: 'Premio del Jurado en Cannes. La Academia de Hollywood rechaza la candidatura alegando que Palestina no es un país reconocido.' },
        { year: '2013', title: 'Omar', text: 'Primer largometraje financiado íntegramente con capital palestino. Acaba nominado al Oscar, esta vez sí, como película de Palestina.' },
        { year: '2014', title: 'Palestine Cinema Days', text: 'Filmlab Palestine crea en Ramala un festival propio y una red de proyecciones para un territorio partido por controles militares.' },
        { year: '2025', title: 'No Other Land', text: 'El documental de Basel Adra, Hamdan Ballal, Yuval Abraham y Rachel Szor gana el Oscar sin haber conseguido distribuidora en Estados Unidos.' },
      ],
      festival: {
        name: 'Palestine Cinema Days',
        body: [
          'Programar cine en Cisjordania significa mover copias y público entre ciudades separadas por controles militares, contando con que Gaza y Jerusalén quedan fuera del alcance de casi cualquier entrada. Filmlab Palestine monta desde 2014 un festival que funciona menos como alfombra roja que como infraestructura: proyecciones itinerantes, formación, laboratorio de guion y encuentros de industria en un país sin apenas salas comerciales.',
          'Desde 2023 tiene además una edición internacional, Palestinian Cinema Days Around the World, que programa el mismo catálogo en decenas de ciudades a la vez. Es una forma de distribución política: cuando el circuito comercial no compra estas películas, la red las proyecta igual.',
        ],
        facts: [
          ['Desde', '2014'],
          ['Organiza', 'Filmlab Palestine'],
          ['Sede', 'Ramala y Cisjordania'],
          ['Extensión', 'Palestinian Cinema Days Around the World (2023)'],
        ],
      },
      filmsIntro: 'Diez películas para recorrer el siglo: de la adaptación de Kanafani que fijó la imagen del exilio al documental que ganó el Oscar sin distribuidora.',
      films: [
        { tmdbId: 178535, note: 'Tres refugiados cruzan el desierto escondidos en la cisterna de un camión. La adaptación de Kanafani que fijó la imagen del exilio palestino.' },
        { tmdbId: 49168, note: 'Un mujtar necesita permiso del gobernador militar para casar a su hijo. El primer largometraje palestino rodado dentro de Palestina.' },
        { tmdbId: 27744, note: 'El puesto de control convertido en comedia del absurdo. Premio del Jurado en Cannes y candidatura rechazada por no venir de un país reconocido.' },
        { tmdbId: 67, note: 'Dos amigos de Naplusa, cuarenta y ocho horas y ninguna salida buena. Globo de Oro y candidatura al Oscar bajo la etiqueta «Palestina».' },
        { tmdbId: 8932, note: 'Una neoyorquina vuelve a Jaffa a reclamar el dinero que su abuelo dejó en un banco en 1948. Primer largo dirigido por una palestina.' },
        { tmdbId: 84170, note: 'Emad Burnat filma seis años de resistencia en Bilin con cinco cámaras que le van destrozando una tras otra.' },
        { tmdbId: 187028, note: 'Un muro, un interrogatorio y la sospecha como forma de gobierno. El primer largometraje financiado íntegramente en Palestina.' },
        { tmdbId: 725561, note: 'Los hermanos Nasser filman un amor tardío en una Gaza cerrada: la comedia como negativa a interpretar el papel de víctima.' },
        { tmdbId: 856437, note: 'Una niña encerrada en una despensa ve por una rendija lo que ocurre en su pueblo en 1948. Hubo ministros israelíes que pidieron retirarla de Netflix.' },
        { tmdbId: 1232493, note: 'Masafer Yatta, demolición a demolición, filmada por un palestino y un israelí. Oscar 2025 sin distribuidora en Estados Unidos.' },
      ],
    },
    en: {
      kicker: 'Special dossier · Cinema and decolonisation',
      title: 'Palestinian cinema',
      blurb: 'A cinema made in exile, under occupation and with its archive seized: from the 1968 Palestine Film Unit to the Oscar for No Other Land.',
      lead: 'There is no Palestinian cinema without the question of who is allowed to film. Since 1948 the Palestinian camera has worked in exile, under military occupation and with its archives confiscated. Filming, here, is a way of staying put.',
      body: [
        'There was a beginning before 1948. In the thirties Ibrahim Hasan Sirhan shot the first footage filmed by a Palestinian and went on to set up a small production company in Jaffa. The Nakba swept all of it away —the cinemas, the labs, the negatives and the cities that held them— and for twenty years Palestine was a land filmed abundantly by others: colonial newsreels, propaganda and adventure films shot in a country whose people had been driven out.',
        'Palestinian cinema as such is born in 1968, in Amman, with the Palestine Film Unit founded by Sulafa Jadallah —one of the first camerawomen in the Arab world—, Mustafa Abu Ali and Hani Jawhariyya. It is urgent cinema, shot on 16 mm, in the same family as Latin American Third Cinema, Algeria and Vietnam: an anti-imperialist internationalism that treats a film at once as document, as school and as political tool. Jawhariyya was killed while filming in Lebanon in 1976.',
        'In 1982, when the Israeli army entered Beirut, the archive of the Palestinian Cinema Institution disappeared: decades of footage seized and never returned, part of it catalogued today in military archives. An archive is territory too, and whoever controls a people’s images controls what can be said about them. Much of the Palestinian cinema of the last thirty years works on that void: looking for what was lost, or filming again what was erased.',
        'Then came the auteurs —Michel Khleifi, Elia Suleiman, Annemarie Jacir, Hany Abu-Assad, Darin J. Sallam— and with them a new, bureaucratic obstacle: permits, checkpoints, co-productions to be assembled across four countries, and a Hollywood Academy that in 2002 rejected an entry because Palestine was not on its list of recognised countries. Palestinian cinema existed long before the state was recognised, and that is precisely its argument.',
      ],
      quote: {
        text: 'Why didn’t you knock on the walls of the tank?',
        source: 'Ghassan Kanafani, Men in the Sun (1963), adapted for the screen as The Dupes',
      },
      chronology: [
        { year: '1935', title: 'The first images', text: 'Ibrahim Hasan Sirhan films Prince Saud’s visit to Jaffa: the earliest footage shot by a Palestinian on record.' },
        { year: '1948', title: 'The Nakba', text: 'Some 750,000 people are expelled. The cinemas, the labs and the films vanish along with the cities. Twenty years follow with almost no images of their own.' },
        { year: '1968', title: 'Palestine Film Unit', text: 'Sulafa Jadallah, Mustafa Abu Ali and Hani Jawhariyya found a cinema of the revolution in Amman, in the orbit of Third Cinema and Algerian militant film.' },
        { year: '1972', title: 'The Dupes', text: 'Tawfiq Saleh adapts Ghassan Kanafani: three refugees suffocating inside a water tanker. The image that fixed exile for the whole Arab world.' },
        { year: '1974', title: 'Palestinian Cinema Institution', text: 'The Palestinian film archive is organised in Beirut, holding its own films and the solidarity work shot by film-makers from around the world.' },
        { year: '1982', title: 'The looted archive', text: 'The Israeli army takes Beirut and the archive disappears. It has never been returned: part of the material shows up catalogued in Israeli military archives.' },
        { year: '1987', title: 'Wedding in Galilee', text: 'Michel Khleifi shoots the first Palestinian fiction feature inside Palestine, with a permit from the military governor —which is also the plot.' },
        { year: '2002', title: 'Divine Intervention', text: 'Jury Prize at Cannes. The Hollywood Academy rejects the entry on the grounds that Palestine is not a recognised country.' },
        { year: '2013', title: 'Omar', text: 'The first feature financed entirely with Palestinian money. It ends up nominated for the Oscar, this time as a film from Palestine.' },
        { year: '2014', title: 'Palestine Cinema Days', text: 'Filmlab Palestine builds a festival of its own in Ramallah, plus a screening network for a territory cut up by checkpoints.' },
        { year: '2025', title: 'No Other Land', text: 'The documentary by Basel Adra, Hamdan Ballal, Yuval Abraham and Rachel Szor wins the Oscar without ever finding a US distributor.' },
      ],
      festival: {
        name: 'Palestine Cinema Days',
        body: [
          'Programming cinema in the West Bank means moving prints and audiences between cities separated by checkpoints, knowing that Gaza and Jerusalem are beyond the reach of almost any ticket. Since 2014 Filmlab Palestine has run a festival that works less as a red carpet than as infrastructure: travelling screenings, training, a script lab and industry meetings in a country with barely any commercial cinemas left.',
          'Since 2023 it also has an international edition, Palestinian Cinema Days Around the World, which programmes the same catalogue in dozens of cities at once. It is a form of political distribution: when the commercial circuit will not buy these films, the network screens them anyway.',
        ],
        facts: [
          ['Since', '2014'],
          ['Run by', 'Filmlab Palestine'],
          ['Based in', 'Ramallah and the West Bank'],
          ['Offshoot', 'Palestinian Cinema Days Around the World (2023)'],
        ],
      },
      filmsIntro: 'Ten films across the century: from the Kanafani adaptation that fixed the image of exile to the documentary that won an Oscar with no distributor.',
      films: [
        { tmdbId: 178535, note: 'Three refugees cross the desert hidden in a water tanker. The Kanafani adaptation that fixed the image of Palestinian exile.' },
        { tmdbId: 49168, note: 'A mukhtar needs the military governor’s permission to marry off his son. The first Palestinian feature shot inside Palestine.' },
        { tmdbId: 27744, note: 'The checkpoint turned into absurdist comedy. Jury Prize at Cannes and an entry refused for not coming from a recognised country.' },
        { tmdbId: 67, note: 'Two friends from Nablus, forty-eight hours and no good way out. Golden Globe and an Oscar nomination under the label “Palestine”.' },
        { tmdbId: 8932, note: 'A New Yorker returns to Jaffa to claim the money her grandfather left in a bank in 1948. The first feature directed by a Palestinian woman.' },
        { tmdbId: 84170, note: 'Emad Burnat films six years of resistance in Bilin with five cameras that are destroyed one after another.' },
        { tmdbId: 187028, note: 'A wall, an interrogation and suspicion as a form of government. The first feature financed entirely in Palestine.' },
        { tmdbId: 725561, note: 'The Nasser brothers film a late love story in a sealed Gaza: comedy as a refusal to play the victim.' },
        { tmdbId: 856437, note: 'A girl locked in a pantry watches through a crack what happens to her village in 1948. Israeli ministers demanded Netflix drop it.' },
        { tmdbId: 1232493, note: 'Masafer Yatta, demolition by demolition, filmed by a Palestinian and an Israeli. Oscar 2025, no US distributor.' },
      ],
    },
    gl: {
      kicker: 'Dosier especial · Cine e descolonización',
      title: 'Cine palestino',
      blurb: 'Un cine feito no exilio, baixo ocupación e co arquivo incautado: da Unidade de Cine Palestino de 1968 ao Óscar de No Other Land.',
      lead: 'Non hai cine palestino sen a pregunta de quen ten dereito a filmar. Desde 1948 a cámara palestina traballa no exilio, baixo ocupación militar e cos seus arquivos incautados. Filmar é, aquí, unha forma de permanecer.',
      body: [
        'Antes de 1948 houbo un comezo. Ibrahim Hasan Sirhan roda nos anos trinta as primeiras imaxes tomadas por un palestino e chega a montar unha pequena produtora en Xafa. A Nakba levouno todo por diante —as salas, os laboratorios, os negativos e as cidades onde estaban— e durante vinte anos Palestina foi un territorio abundantemente filmado por outros: noticiarios coloniais, propaganda e películas de aventuras rodadas nun país do que se expulsara á súa xente.',
        'O cine palestino como tal nace en 1968, en Amán, coa Unidade de Cine Palestino que fundan Sulafa Yadalá —das primeiras camarógrafas do mundo árabe—, Mustafa Abu Ali e Hani Yauhariya. É cine de urxencia, en 16 mm, irmandado co Terceiro Cine latinoamericano, con Alxeria e con Vietnam: un internacionalismo antiimperialista que entende a película á vez como documento, como escola e como ferramenta política. Yauhariya morreu filmando no Líbano en 1976.',
        'En 1982, coa entrada do exército israelí en Beirut, desaparece o arquivo da Institución de Cine Palestino: décadas de metraxe incautadas e nunca devoltas, parte delas catalogadas hoxe en arquivos militares. O arquivo é tamén territorio, e quen controla as imaxes dun pobo controla o que dese pobo pode contarse. Boa parte do cine palestino dos últimos trinta anos traballa sobre ese baleiro: buscar o perdido, ou volver filmar o que se borrou.',
        'Despois chegaron os autores —Michel Khleifi, Elia Suleiman, Annemarie Jacir, Hany Abu-Assad, Darin J. Sallam— e con eles un atranco novo, burocrático: permisos, controis militares, coproducións que hai que armar entre catro países e unha Academia de Hollywood que en 2002 rexeita unha candidatura porque Palestina non figura na súa lista de países recoñecidos. O cine palestino existía moito antes de que se recoñecese o Estado, e esa é exactamente a súa tese.',
      ],
      quote: {
        text: 'Por que non petastes nas paredes do depósito?',
        source: 'Ghassan Kanafani, Homes ao sol (1963), levada ao cine en Os enganados',
      },
      chronology: [
        { year: '1935', title: 'As primeiras imaxes', text: 'Ibrahim Hasan Sirhan filma en Xafa a visita do príncipe Saud: a primeira metraxe rodada por un palestino da que hai constancia.' },
        { year: '1948', title: 'A Nakba', text: 'Unhas 750.000 persoas son expulsadas. Coas cidades desaparecen as salas, os laboratorios e as películas. Seguen vinte anos case sen imaxes propias.' },
        { year: '1968', title: 'Unidade de Cine Palestino', text: 'Sulafa Yadalá, Mustafa Abu Ali e Hani Yauhariya fundan en Amán un cine da revolución, na órbita do Terceiro Cine e do cine militante alxeriano.' },
        { year: '1972', title: 'Os enganados', text: 'Tawfiq Saleh adapta a Ghassan Kanafani: tres refuxiados asfixiados na cisterna dun camión. A imaxe que fixou o exilio para todo o mundo árabe.' },
        { year: '1974', title: 'Institución de Cine Palestino', text: 'En Beirut organízase o arquivo do cine palestino, coas películas propias e as de solidariedade rodadas por cineastas de medio mundo.' },
        { year: '1982', title: 'O arquivo saqueado', text: 'O exército israelí toma Beirut e o arquivo desaparece. Nunca foi devolto: parte do material aparece catalogado en arquivos militares israelís.' },
        { year: '1987', title: 'Voda en Galilea', text: 'Michel Khleifi roda dentro de Palestina a primeira longametraxe palestina de ficción, con permiso do gobernador militar, que é tamén o argumento.' },
        { year: '2002', title: 'Intervención divina', text: 'Premio do Xurado en Cannes. A Academia de Hollywood rexeita a candidatura alegando que Palestina non é un país recoñecido.' },
        { year: '2013', title: 'Omar', text: 'Primeira longametraxe financiada integramente con capital palestino. Acaba nomeada ao Óscar, esta vez si, como película de Palestina.' },
        { year: '2014', title: 'Palestine Cinema Days', text: 'Filmlab Palestine crea en Ramala un festival propio e unha rede de proxeccións para un territorio partido por controis militares.' },
        { year: '2025', title: 'No Other Land', text: 'O documental de Basel Adra, Hamdan Ballal, Yuval Abraham e Rachel Szor gaña o Óscar sen ter conseguido distribuidora nos Estados Unidos.' },
      ],
      festival: {
        name: 'Palestine Cinema Days',
        body: [
          'Programar cine en Cisxordania significa mover copias e público entre cidades separadas por controis militares, contando con que Gaza e Xerusalén quedan fóra do alcance de case calquera entrada. Filmlab Palestine monta desde 2014 un festival que funciona menos como alfombra vermella que como infraestrutura: proxeccións itinerantes, formación, laboratorio de guión e encontros de industria nun país sen apenas salas comerciais.',
          'Desde 2023 ten ademais unha edición internacional, Palestinian Cinema Days Around the World, que programa o mesmo catálogo en decenas de cidades á vez. É unha forma de distribución política: cando o circuíto comercial non merca estas películas, a rede proxéctaas igual.',
        ],
        facts: [
          ['Desde', '2014'],
          ['Organiza', 'Filmlab Palestine'],
          ['Sede', 'Ramala e Cisxordania'],
          ['Extensión', 'Palestinian Cinema Days Around the World (2023)'],
        ],
      },
      filmsIntro: 'Dez películas para percorrer o século: da adaptación de Kanafani que fixou a imaxe do exilio ao documental que gañou o Óscar sen distribuidora.',
      films: [
        { tmdbId: 178535, note: 'Tres refuxiados cruzan o deserto agochados na cisterna dun camión. A adaptación de Kanafani que fixou a imaxe do exilio palestino.' },
        { tmdbId: 49168, note: 'Un mujtar precisa permiso do gobernador militar para casar o seu fillo. A primeira longametraxe palestina rodada dentro de Palestina.' },
        { tmdbId: 27744, note: 'O posto de control convertido en comedia do absurdo. Premio do Xurado en Cannes e candidatura rexeitada por non vir dun país recoñecido.' },
        { tmdbId: 67, note: 'Dous amigos de Nablus, corenta e oito horas e ningunha saída boa. Globo de Ouro e candidatura ao Óscar baixo a etiqueta «Palestina».' },
        { tmdbId: 8932, note: 'Unha novaiorquina volve a Xafa a reclamar o diñeiro que o seu avó deixou nun banco en 1948. Primeira longametraxe dirixida por unha palestina.' },
        { tmdbId: 84170, note: 'Emad Burnat filma seis anos de resistencia en Bilin con cinco cámaras que lle van destrozando unha tras outra.' },
        { tmdbId: 187028, note: 'Un muro, un interrogatorio e a sospeita como forma de goberno. A primeira longametraxe financiada integramente en Palestina.' },
        { tmdbId: 725561, note: 'Os irmáns Nasser filman un amor tardío nunha Gaza pechada: a comedia como negativa a interpretar o papel de vítima.' },
        { tmdbId: 856437, note: 'Unha nena pechada nunha despensa ve por unha fenda o que ocorre na súa vila en 1948. Houbo ministros israelís que pediron retirala de Netflix.' },
        { tmdbId: 1232493, note: 'Masafer Yatta, demolición a demolición, filmada por un palestino e un israelí. Óscar 2025 sen distribuidora nos Estados Unidos.' },
      ],
    },
    eu: {
      kicker: 'Dosier berezia · Zinema eta deskolonizazioa',
      title: 'Zinema palestinarra',
      blurb: 'Erbestean, okupaziopean eta artxiboa bahituta egindako zinema: 1968ko Palestinako Zinema Unitatetik No Other Land filmaren Oscarreraino.',
      lead: 'Ez dago zinema palestinarrik nork duen filmatzeko eskubidea galdetu gabe. 1948tik, kamera palestinarrak erbestean lan egiten du, okupazio militarpean eta artxiboak bahituta dituela. Hemen, filmatzea gelditzeko modu bat da.',
      body: [
        'Bazen hasiera bat 1948 baino lehen. Ibrahim Hasan Sirhanek hogeita hamarreko hamarkadan palestinar batek hartutako lehen irudiak filmatu zituen, eta ekoiztetxe txiki bat sortu zuen Jaffan. Nakbak dena eraman zuen —aretoak, laborategiak, negatiboak eta haiek zeuden hiriak— eta hogei urtez Palestina besteek ugari filmatutako lurraldea izan zen: albistegi kolonialak, propaganda eta abenturazko filmak, jendea kanporatua izan zen herrialde batean errodatuak.',
        'Zinema palestinarra bera 1968an jaio zen, Ammanen, Sulafa Jadallah —arabiar munduko lehen kamera-emakumeetako bat—, Mustafa Abu Ali eta Hani Jawhariyyak sortutako Palestinako Zinema Unitatearekin. Premiazko zinema da, 16 mm-tan, Latinoamerikako Hirugarren Zinemarekin, Aljeriarekin eta Vietnamekin senidetua: filma aldi berean dokumentu, eskola eta tresna politiko gisa ulertzen duen internazionalismo antiinperialista. Jawhariyya 1976an hil zen Libanon filmatzen ari zela.',
        '1982an, israeldar armada Beiruten sartzearekin, Palestinako Zinema Erakundearen artxiboa desagertu zen: hamarkadetako metraia bahitua eta inoiz itzuli gabea, zati bat gaur egun artxibo militarretan katalogatua. Artxiboa ere lurraldea da, eta herri baten irudiak kontrolatzen dituenak kontrolatzen du herri horretaz zer konta daitekeen. Azken hogeita hamar urteetako zinema palestinarraren zati handi bat huts horren gainean ari da lanean: galdutakoa bilatzea, edo ezabatutakoa berriz filmatzea.',
        'Gero egileak iritsi ziren —Michel Khleifi, Elia Suleiman, Annemarie Jacir, Hany Abu-Assad, Darin J. Sallam— eta haiekin oztopo berri bat, burokratikoa: baimenak, kontrol militarrak, lau herrialderen artean osatu beharreko koprodukzioak eta 2002an hautagaitza bat baztertu zuen Hollywoodeko Akademia bat, Palestina ez zelako haren herrialde aitortuen zerrendan agertzen. Zinema palestinarra Estatua aitortu baino askoz lehenago zegoen hor, eta hori da, hain zuzen, haren tesia.',
      ],
      quote: {
        text: 'Zergatik ez zenituzten deposituaren hormak jo?',
        source: 'Ghassan Kanafani, Gizonak eguzkitan (1963), Los engañados filmean egokitua',
      },
      chronology: [
        { year: '1935', title: 'Lehen irudiak', text: 'Ibrahim Hasan Sirhanek Saud printzearen Jaffako bisita filmatzen du: palestinar batek errodatutako lehen metraia ezaguna.' },
        { year: '1948', title: 'Nakba', text: '750.000 lagun inguru kanporatuak dira. Hiriekin batera aretoak, laborategiak eta filmak desagertzen dira. Hogei urte datoz ia irudi propiorik gabe.' },
        { year: '1968', title: 'Palestinako Zinema Unitatea', text: 'Sulafa Jadallah, Mustafa Abu Ali eta Hani Jawhariyyak iraultzaren zinema sortzen dute Ammanen, Hirugarren Zinemaren eta Aljeriako zinema militantearen orbitan.' },
        { year: '1972', title: 'Los engañados', text: 'Tawfiq Salehek Ghassan Kanafani egokitzen du: hiru errefuxiatu kamioi baten zisternan itota. Arabiar mundu osoarentzat erbestea finkatu zuen irudia.' },
        { year: '1974', title: 'Palestinako Zinema Erakundea', text: 'Beiruten palestinar zinemaren artxiboa antolatzen da, film propioekin eta mundu erdiko zinemagileek errodatutako elkartasunezkoekin.' },
        { year: '1982', title: 'Artxibo lapurtua', text: 'Israelgo armadak Beirut hartzen du eta artxiboa desagertzen da. Ez da inoiz itzuli: materialaren zati bat israeldar artxibo militarretan katalogatuta agertzen da.' },
        { year: '1987', title: 'Ezteiak Galilean', text: 'Michel Khleifik Palestinaren barruan errodatzen du lehen fikziozko film luze palestinarra, gobernadore militarraren baimenarekin, hori bera baita argumentua.' },
        { year: '2002', title: 'Esku-hartze jainkotiarra', text: 'Epaimahaiaren Saria Cannesen. Hollywoodeko Akademiak hautagaitza baztertzen du, Palestina herrialde aitortua ez dela argudiatuta.' },
        { year: '2013', title: 'Omar', text: 'Kapital palestinarrarekin osorik finantzatutako lehen film luzea. Oscarrerako izendatua izan zen, oraingoan bai, Palestinako film gisa.' },
        { year: '2014', title: 'Palestine Cinema Days', text: 'Filmlab Palestinek jaialdi propioa eta emanaldi sare bat sortzen ditu Ramallahn, kontrol militarrek zatitutako lurralde batentzat.' },
        { year: '2025', title: 'No Other Land', text: 'Basel Adra, Hamdan Ballal, Yuval Abraham eta Rachel Szorren dokumentalak Oscarra irabazten du Estatu Batuetan banatzailerik lortu gabe.' },
      ],
      festival: {
        name: 'Palestine Cinema Days',
        body: [
          'Zisjordanian zinema programatzeak kontrol militarrek banatutako hirien artean kopiak eta ikusleak mugitzea esan nahi du, jakinda Gaza eta Jerusalem ia edozein sarreraren irismenetik kanpo geratzen direla. Filmlab Palestinek 2014tik antolatzen duen jaialdia alfonbra gorria baino gehiago azpiegitura da: emanaldi ibiltariak, prestakuntza, gidoi-laborategia eta industria-topaketak, ia zinema komertzialik gabeko herrialde batean.',
          '2023tik nazioarteko edizio bat ere badu, Palestinian Cinema Days Around the World, katalogo bera hamarnaka hiritan aldi berean programatzen duena. Banaketa politikoaren modu bat da: zirkuitu komertzialak film hauek erosten ez dituenean, sareak berdin proiektatzen ditu.',
        ],
        facts: [
          ['Noiztik', '2014'],
          ['Antolatzailea', 'Filmlab Palestine'],
          ['Egoitza', 'Ramallah eta Zisjordania'],
          ['Hedapena', 'Palestinian Cinema Days Around the World (2023)'],
        ],
      },
      filmsIntro: 'Hamar film mendea zeharkatzeko: erbestearen irudia finkatu zuen Kanafaniren egokitzapenetik banatzailerik gabe Oscarra irabazi zuen dokumentaleraino.',
      films: [
        { tmdbId: 178535, note: 'Hiru errefuxiatuk basamortua zeharkatzen dute kamioi baten zisternan ezkutatuta. Erbeste palestinarraren irudia finkatu zuen Kanafaniren egokitzapena.' },
        { tmdbId: 49168, note: 'Mujtar batek gobernadore militarraren baimena behar du semea ezkontzeko. Palestinaren barruan errodatutako lehen film luze palestinarra.' },
        { tmdbId: 27744, note: 'Kontrol-gunea absurdoaren komedia bihurtuta. Epaimahaiaren Saria Cannesen eta herrialde aitortu batetik ez etortzeagatik baztertutako hautagaitza.' },
        { tmdbId: 67, note: 'Nablusko bi lagun, berrogeita zortzi ordu eta irteera onik ez. Urrezko Globoa eta Oscarrerako izendapena «Palestina» etiketapean.' },
        { tmdbId: 8932, note: 'New Yorkeko emakume bat Jaffara itzultzen da 1948an aitonak bankuan utzitako dirua erreklamatzera. Palestinar emakume batek zuzendutako lehen film luzea.' },
        { tmdbId: 84170, note: 'Emad Burnatek Bilingo sei urteko erresistentzia filmatzen du, banan-banan hausten dizkioten bost kamerarekin.' },
        { tmdbId: 187028, note: 'Harresi bat, galdeketa bat eta susmoa gobernu-modu gisa. Palestinan osorik finantzatutako lehen film luzea.' },
        { tmdbId: 725561, note: 'Nasser anaiek maitasun berantiar bat filmatzen dute Gaza itxi batean: komedia biktima-papera antzezteari uko egiteko modu gisa.' },
        { tmdbId: 856437, note: 'Despentsa batean giltzapetutako neska batek arrakala batetik ikusten du 1948an bere herrian gertatzen dena. Israelgo ministroek Netflixi kentzeko eskatu zioten.' },
        { tmdbId: 1232493, note: 'Masafer Yatta, eraiste bat bestearen atzetik, palestinar batek eta israeldar batek filmatuta. 2025eko Oscarra, Estatu Batuetan banatzailerik gabe.' },
      ],
    },
    ca: {
      kicker: 'Dossier especial · Cinema i descolonització',
      title: 'Cinema palestí',
      blurb: 'Un cinema fet a l’exili, sota ocupació i amb l’arxiu confiscat: de la Unitat de Cinema Palestí del 1968 a l’Oscar de No Other Land.',
      lead: 'No hi ha cinema palestí sense la pregunta de qui té dret a filmar. Des del 1948 la càmera palestina treballa a l’exili, sota ocupació militar i amb els seus arxius confiscats. Filmar és, aquí, una manera de romandre.',
      body: [
        'Abans del 1948 hi va haver un començament. Ibrahim Hasan Sirhan roda als anys trenta les primeres imatges preses per un palestí i arriba a muntar una petita productora a Jaffa. La Nakba s’ho va endur tot —les sales, els laboratoris, els negatius i les ciutats on eren— i durant vint anys Palestina va ser un territori filmat abundantment per altres: noticiaris colonials, propaganda i pel·lícules d’aventures rodades en un país del qual s’havia expulsat la seva gent.',
        'El cinema palestí com a tal neix el 1968, a Amman, amb la Unitat de Cinema Palestí que funden Sulafa Jadallah —de les primeres càmeres del món àrab—, Mustafa Abu Ali i Hani Jawhariyya. És cinema d’urgència, en 16 mm, agermanat amb el Tercer Cinema llatinoamericà, amb Algèria i amb el Vietnam: un internacionalisme antiimperialista que entén la pel·lícula alhora com a document, com a escola i com a eina política. Jawhariyya va morir filmant al Líban el 1976.',
        'El 1982, amb l’entrada de l’exèrcit israelià a Beirut, desapareix l’arxiu de la Institució de Cinema Palestí: dècades de metratge confiscades i mai retornades, part d’elles catalogades avui en arxius militars. L’arxiu també és territori, i qui controla les imatges d’un poble controla què se’n pot explicar. Bona part del cinema palestí dels últims trenta anys treballa sobre aquest buit: buscar el que es va perdre, o tornar a filmar el que es va esborrar.',
        'Després van arribar els autors —Michel Khleifi, Elia Suleiman, Annemarie Jacir, Hany Abu-Assad, Darin J. Sallam— i amb ells un obstacle nou, burocràtic: permisos, controls militars, coproduccions que cal armar entre quatre països i una Acadèmia de Hollywood que el 2002 rebutja una candidatura perquè Palestina no figura a la seva llista de països reconeguts. El cinema palestí existia molt abans que es reconegués l’Estat, i aquesta és exactament la seva tesi.',
      ],
      quote: {
        text: 'Per què no vau picar les parets del dipòsit?',
        source: 'Ghassan Kanafani, Homes al sol (1963), portada al cinema a Los engañados',
      },
      chronology: [
        { year: '1935', title: 'Les primeres imatges', text: 'Ibrahim Hasan Sirhan filma a Jaffa la visita del príncep Saud: el primer metratge rodat per un palestí del qual hi ha constància.' },
        { year: '1948', title: 'La Nakba', text: 'Unes 750.000 persones són expulsades. Amb les ciutats desapareixen les sales, els laboratoris i les pel·lícules. Segueixen vint anys gairebé sense imatges pròpies.' },
        { year: '1968', title: 'Unitat de Cinema Palestí', text: 'Sulafa Jadallah, Mustafa Abu Ali i Hani Jawhariyya funden a Amman un cinema de la revolució, en l’òrbita del Tercer Cinema i del cinema militant algerià.' },
        { year: '1972', title: 'Los engañados', text: 'Tawfiq Saleh adapta Ghassan Kanafani: tres refugiats asfixiats a la cisterna d’un camió. La imatge que va fixar l’exili per a tot el món àrab.' },
        { year: '1974', title: 'Institució de Cinema Palestí', text: 'A Beirut s’organitza l’arxiu del cinema palestí, amb les pel·lícules pròpies i les de solidaritat rodades per cineastes de mig món.' },
        { year: '1982', title: 'L’arxiu saquejat', text: 'L’exèrcit israelià pren Beirut i l’arxiu desapareix. No s’ha retornat mai: part del material apareix catalogat en arxius militars israelians.' },
        { year: '1987', title: 'Noces a Galilea', text: 'Michel Khleifi roda dins de Palestina el primer llargmetratge palestí de ficció, amb permís del governador militar, que també és l’argument.' },
        { year: '2002', title: 'Intervenció divina', text: 'Premi del Jurat a Canes. L’Acadèmia de Hollywood rebutja la candidatura al·legant que Palestina no és un país reconegut.' },
        { year: '2013', title: 'Omar', text: 'Primer llargmetratge finançat íntegrament amb capital palestí. Acaba nominat a l’Oscar, aquesta vegada sí, com a pel·lícula de Palestina.' },
        { year: '2014', title: 'Palestine Cinema Days', text: 'Filmlab Palestine crea a Ramal·là un festival propi i una xarxa de projeccions per a un territori partit per controls militars.' },
        { year: '2025', title: 'No Other Land', text: 'El documental de Basel Adra, Hamdan Ballal, Yuval Abraham i Rachel Szor guanya l’Oscar sense haver aconseguit distribuïdora als Estats Units.' },
      ],
      festival: {
        name: 'Palestine Cinema Days',
        body: [
          'Programar cinema a Cisjordània significa moure còpies i públic entre ciutats separades per controls militars, comptant que Gaza i Jerusalem queden fora de l’abast de gairebé qualsevol entrada. Filmlab Palestine munta des del 2014 un festival que funciona menys com una catifa vermella que com una infraestructura: projeccions itinerants, formació, laboratori de guió i trobades d’indústria en un país gairebé sense sales comercials.',
          'Des del 2023 té a més una edició internacional, Palestinian Cinema Days Around the World, que programa el mateix catàleg a desenes de ciutats alhora. És una forma de distribució política: quan el circuit comercial no compra aquestes pel·lícules, la xarxa les projecta igualment.',
        ],
        facts: [
          ['Des del', '2014'],
          ['Organitza', 'Filmlab Palestine'],
          ['Seu', 'Ramal·là i Cisjordània'],
          ['Extensió', 'Palestinian Cinema Days Around the World (2023)'],
        ],
      },
      filmsIntro: 'Deu pel·lícules per recórrer el segle: de l’adaptació de Kanafani que va fixar la imatge de l’exili al documental que va guanyar l’Oscar sense distribuïdora.',
      films: [
        { tmdbId: 178535, note: 'Tres refugiats travessen el desert amagats a la cisterna d’un camió. L’adaptació de Kanafani que va fixar la imatge de l’exili palestí.' },
        { tmdbId: 49168, note: 'Un mukhtar necessita permís del governador militar per casar el seu fill. El primer llargmetratge palestí rodat dins de Palestina.' },
        { tmdbId: 27744, note: 'El control militar convertit en comèdia de l’absurd. Premi del Jurat a Canes i candidatura rebutjada per no venir d’un país reconegut.' },
        { tmdbId: 67, note: 'Dos amics de Nablus, quaranta-vuit hores i cap sortida bona. Globus d’Or i candidatura a l’Oscar sota l’etiqueta «Palestina».' },
        { tmdbId: 8932, note: 'Una novaiorquesa torna a Jaffa a reclamar els diners que el seu avi va deixar en un banc el 1948. Primer llarg dirigit per una palestina.' },
        { tmdbId: 84170, note: 'Emad Burnat filma sis anys de resistència a Bilin amb cinc càmeres que li van destrossant una rere l’altra.' },
        { tmdbId: 187028, note: 'Un mur, un interrogatori i la sospita com a forma de govern. El primer llargmetratge finançat íntegrament a Palestina.' },
        { tmdbId: 725561, note: 'Els germans Nasser filmen un amor tardà en una Gaza tancada: la comèdia com a negativa a interpretar el paper de víctima.' },
        { tmdbId: 856437, note: 'Una nena tancada en un rebost veu per una escletxa què passa al seu poble el 1948. Hi va haver ministres israelians que van demanar retirar-la de Netflix.' },
        { tmdbId: 1232493, note: 'Masafer Yatta, enderroc rere enderroc, filmada per un palestí i un israelià. Oscar 2025 sense distribuïdora als Estats Units.' },
      ],
    },
  },
};

const sahara: Dossier = {
  slug: 'cine-saharaui',
  sources: [
    { label: 'FiSahara · Festival Internacional de Cine del Sáhara', url: 'https://festivalsahara.org/' },
    { label: 'Naciones Unidas · Territorios no autónomos: Sáhara Occidental', url: 'https://www.un.org/dppa/decolonization/en/nsgt/western-sahara' },
    { label: 'Corte Internacional de Justicia · Dictamen sobre el Sáhara Occidental (1975)', url: 'https://www.icj-cij.org/case/61' },
    { label: 'MINURSO · Misión de la ONU para el referéndum del Sáhara Occidental', url: 'https://minurso.unmissions.org/' },
  ],
  copy: {
    es: {
      kicker: 'Dosier especial · La última colonia',
      title: 'Cine saharaui',
      blurb: 'Un festival de cine en un campo de refugiados, una escuela de cine en el desierto y las películas de un pueblo que sigue esperando su referéndum.',
      lead: 'El Sáhara Occidental es el último territorio pendiente de descolonización en África. Su cine nace en los campamentos de refugiados de Tinduf y en las ciudades ocupadas, y no está ahí para narrar una espera: está para romperla.',
      body: [
        'Empecemos por quién filmaba antes. Entre 1958 y 1975 el Sáhara fue oficialmente una provincia española y el NO-DO lo rodó como decorado: dunas, camellos, tropas nómadas al servicio de España y funcionarios inaugurando cosas. En centenares de planos, los saharauis aparecen como paisaje —nunca como gente que habla, decide o discrepa—. Ese es el punto de partida de este dosier: un pueblo abundantemente filmado que casi nunca fue autor de sus propias imágenes.',
        'El 16 de octubre de 1975 la Corte Internacional de Justicia dictaminó que no existían vínculos de soberanía que impidieran la autodeterminación del territorio. Semanas después llegaron la Marcha Verde y los Acuerdos de Madrid: España, la potencia administradora, repartió el Sáhara entre Marruecos y Mauritania y se marchó sin celebrar el referéndum al que se había comprometido. Vino el éxodo, el bombardeo de la población que huía y los campamentos de Tinduf, en el peor desierto de Argelia, donde nacieron ya tres generaciones.',
        'El alto el fuego de 1991 trajo a la MINURSO, una misión de la ONU cuya única razón de ser es organizar ese referéndum. Treinta y cinco años después sigue sin celebrarse, y es la única misión de paz de la ONU sin mandato de vigilar los derechos humanos. En 2020 la guerra se reanudó en Guerguerat; en 2022 el Gobierno español respaldó el plan de autonomía marroquí, abandonando su propia posición jurídica. El expediente sigue abierto en Naciones Unidas y cerrado en los telediarios.',
        'Contra ese silencio se construyó una infraestructura de cine improbable: FiSahara desde 2003, una escuela de cine con dos años de formación en el campamento de Bojador desde 2011, y colectivos como Equipe Media que filman con teléfonos en el territorio ocupado, donde la prensa extranjera no entra. La consecuencia es la que importa: los saharauis dejaron de ser el objeto de las películas de otros para ser quienes las firman.',
      ],
      quote: {
        text: 'El Sáhara Occidental sigue siendo un territorio no autónomo pendiente de descolonización.',
        source: 'Comité Especial de Descolonización de las Naciones Unidas',
      },
      chronology: [
        { year: '1884', title: 'El reparto de África', text: 'España reclama Río de Oro en vísperas de la Conferencia de Berlín. La frontera del futuro conflicto se dibuja en un despacho europeo.' },
        { year: '1958–1975', title: 'La provincia 53', text: 'El Sáhara pasa a ser «provincia española». El NO-DO lo filma como un decorado exótico en el que la población local es paisaje.' },
        { year: '1973', title: 'Frente Polisario', text: 'Nace el 10 de mayo. La lucha por la independencia empieza, primero, contra la metrópoli española.' },
        { year: '1975', title: 'La entrega', text: 'El 16 de octubre el TIJ avala la autodeterminación. El 14 de noviembre los Acuerdos de Madrid reparten el territorio entre Marruecos y Mauritania.' },
        { year: '1976', title: 'Éxodo y RASD', text: 'La población que huye hacia Argelia es bombardeada con napalm y fósforo blanco. El 27 de febrero se proclama la República Árabe Saharaui Democrática.' },
        { year: '1991', title: 'Alto el fuego', text: 'La ONU despliega la MINURSO para organizar un referéndum de autodeterminación. Sigue sin celebrarse.' },
        { year: '2003', title: 'FiSahara', text: 'Se celebra el primer festival internacional de cine en un campamento de refugiados: pantalla al aire libre, público a la intemperie.' },
        { year: '2010', title: 'Gdeim Izik', text: 'El desmantelamiento del campamento de protesta cerca de El Aaiún se filma con teléfonos y circula fuera. Las imágenes ya no dependen de las televisiones.' },
        { year: '2011', title: 'Escuela Abidin Kaid Saleh', text: 'FiSahara abre en el campamento de Bojador una escuela de cine con dos años de formación para jóvenes saharauis.' },
        { year: '2020', title: 'Guerguerat', text: 'Se rompe el alto el fuego después de veintinueve años. Vuelve la guerra en el muro de arena.' },
        { year: '2022', title: 'El giro español', text: 'El Gobierno de España respalda el plan de autonomía marroquí y se aparta de la posición que sostenía como antigua potencia administradora.' },
        { year: '2024', title: 'XVIII FiSahara', text: 'El festival vuelve a los campamentos tras las ediciones celebradas en Madrid. La siguiente está anunciada para 2026.' },
      ],
      festival: {
        name: 'FiSahara · Festival Internacional de Cine del Sáhara',
        body: [
          'Se celebra desde 2003 en los campamentos de refugiados saharauis de Tinduf, en Argelia: una pantalla montada al aire libre entre las jaimas, con público sentado en la arena y las películas subtituladas en hasanía. Para buena parte de ese público es el cine del año. Lo organizan saharauis y sociedad civil española, con el apoyo de las autoridades de los campamentos, y su premio, la Camella Blanca, lo decide el voto del público; la camella de verdad se le entrega a la familia que ha alojado a quien gana.',
          'En 2011 el festival abrió su pieza más importante: la Escuela de Formación Audiovisual Abidin Kaid Saleh, en el campamento de Bojador, con dos años de formación, internado incluido para quienes vienen de otros campamentos. De ahí salen los cortos que hoy programa el propio festival. Ha habido además ediciones en Madrid —2021, 2023 y 2025—, que es una forma bastante precisa de devolverle el asunto a la antigua metrópoli.',
        ],
        facts: [
          ['Desde', '2003'],
          ['Dónde', 'Campamentos de refugiados de Tinduf (Argelia)'],
          ['Premio', 'Camella Blanca, por voto del público'],
          ['Escuela', 'Abidin Kaid Saleh, campamento de Bojador (2011)'],
        ],
      },
      filmsIntro: 'Siete películas rodadas en los campamentos, en el territorio ocupado y en los despachos donde se firmó el abandono.',
      films: [
        { tmdbId: 770271, note: 'Rodada de forma clandestina en El Aaiún ocupado: los testimonios que la prensa extranjera no puede recoger porque no la dejan entrar.' },
        { tmdbId: 104636, note: 'Una joven criada en España vuelve a los campamentos tras la muerte de su madre. Rodada allí, con intérpretes saharauis no profesionales.' },
        { tmdbId: 111078, note: 'Álvaro Longoria y Javier Bardem siguen el rastro diplomático del abandono: quién firmó qué, con quién y a cambio de qué.' },
        { tmdbId: 903445, note: 'La poesía en hasanía como archivo nacional. Un trabajo colectivo hispano-saharaui sobre lo que un pueblo guarda cuando no tiene territorio.' },
        { tmdbId: 365186, note: 'Iara Lee recorre la resistencia no violenta a un lado y otro del muro de arena, con la música y la juventud saharaui como hilo.' },
        { tmdbId: 611022, note: 'Un viaje al pozo de Leyuad, en el territorio liberado, en compañía de los poetas que sostienen la memoria del país.' },
        { tmdbId: 761303, note: 'Los activistas de Equipe Media filman a escondidas en el Sáhara ocupado y sacan las tarjetas fuera. El título cuenta lo que les cuesta.' },
      ],
    },
    en: {
      kicker: 'Special dossier · The last colony',
      title: 'Sahrawi cinema',
      blurb: 'A film festival in a refugee camp, a film school in the desert and the films of a people still waiting for its referendum.',
      lead: 'Western Sahara is the last territory in Africa still awaiting decolonisation. Its cinema is born in the refugee camps of Tindouf and in the occupied cities, and it is not there to narrate a wait: it is there to break it.',
      body: [
        'Start with who was filming before. Between 1958 and 1975 the Sahara was officially a Spanish province, and the NO-DO newsreel shot it as a set: dunes, camels, nomad troops in Spanish service and officials inaugurating things. Across hundreds of shots the Sahrawis appear as landscape —never as people who speak, decide or disagree. That is where this dossier starts: a people filmed in abundance who almost never authored their own images.',
        'On 16 October 1975 the International Court of Justice found that no ties of sovereignty stood in the way of the territory’s self-determination. Weeks later came the Green March and the Madrid Accords: Spain, the administering power, split the Sahara between Morocco and Mauritania and left without holding the referendum it had promised. Then came the exodus, the bombing of the fleeing population and the camps of Tindouf, in the harshest desert in Algeria, where three generations have now been born.',
        'The 1991 ceasefire brought MINURSO, a UN mission whose only reason to exist is to organise that referendum. Thirty-five years on it still has not been held, and it remains the only UN peacekeeping mission with no human rights monitoring mandate. In 2020 the war resumed at Guerguerat; in 2022 the Spanish government backed Morocco’s autonomy plan, abandoning its own legal position. The file stays open at the United Nations and closed on the evening news.',
        'Against that silence an unlikely film infrastructure was built: FiSahara since 2003, a film school with a two-year programme in the Boujdour camp since 2011, and collectives such as Equipe Media filming on phones inside the occupied territory, where the foreign press is not allowed in. The consequence is what matters: the Sahrawis stopped being the subject of other people’s films and became the people who sign them.',
      ],
      quote: {
        text: 'Western Sahara remains a Non-Self-Governing Territory pending decolonisation.',
        source: 'United Nations Special Committee on Decolonization',
      },
      chronology: [
        { year: '1884', title: 'The scramble for Africa', text: 'Spain claims Río de Oro on the eve of the Berlin Conference. The border of the future conflict is drawn in a European office.' },
        { year: '1958–1975', title: 'Province 53', text: 'The Sahara becomes a “Spanish province”. The NO-DO newsreel films it as an exotic set in which the local population is scenery.' },
        { year: '1973', title: 'Polisario Front', text: 'Founded on 10 May. The fight for independence begins, first of all, against the Spanish metropolis.' },
        { year: '1975', title: 'The handover', text: 'On 16 October the ICJ upholds self-determination. On 14 November the Madrid Accords split the territory between Morocco and Mauritania.' },
        { year: '1976', title: 'Exodus and SADR', text: 'The population fleeing towards Algeria is bombed with napalm and white phosphorus. On 27 February the Sahrawi Arab Democratic Republic is proclaimed.' },
        { year: '1991', title: 'Ceasefire', text: 'The UN deploys MINURSO to organise a self-determination referendum. It still has not taken place.' },
        { year: '2003', title: 'FiSahara', text: 'The first international film festival held in a refugee camp: an open-air screen, an audience sitting in the sand.' },
        { year: '2010', title: 'Gdeim Izik', text: 'The dismantling of the protest camp near El Aaiún is filmed on phones and circulates abroad. The images no longer depend on television crews.' },
        { year: '2011', title: 'Abidin Kaid Saleh school', text: 'FiSahara opens a film school in the Boujdour camp with a two-year programme for young Sahrawis.' },
        { year: '2020', title: 'Guerguerat', text: 'The ceasefire breaks after twenty-nine years. War returns to the sand wall.' },
        { year: '2022', title: 'The Spanish turn', text: 'Spain’s government backs Morocco’s autonomy plan, stepping away from the position it had held as the former administering power.' },
        { year: '2024', title: 'FiSahara XVIII', text: 'The festival returns to the camps after the editions held in Madrid. The next one is announced for 2026.' },
      ],
      festival: {
        name: 'FiSahara · Sahara International Film Festival',
        body: [
          'Held since 2003 in the Sahrawi refugee camps of Tindouf, Algeria: a screen rigged in the open air among the tents, an audience sitting on the sand and films subtitled in Hassaniya. For much of that audience this is the cinema of the year. It is run by Sahrawis and Spanish civil society with the support of the camp authorities, and its award, the White Camel, is decided by audience vote; the actual camel goes to the family hosting the winner.',
          'In 2011 the festival opened its most important piece: the Abidin Kaid Saleh Audiovisual School in the Boujdour camp, a two-year programme with board for students coming from other camps. The shorts it produces are now programmed by the festival itself. There have also been editions in Madrid —2021, 2023 and 2025— which is a fairly precise way of handing the matter back to the former metropolis.',
        ],
        facts: [
          ['Since', '2003'],
          ['Where', 'Tindouf refugee camps (Algeria)'],
          ['Award', 'White Camel, by audience vote'],
          ['School', 'Abidin Kaid Saleh, Boujdour camp (2011)'],
        ],
      },
      filmsIntro: 'Seven films shot in the camps, in the occupied territory and in the offices where the handover was signed.',
      films: [
        { tmdbId: 770271, note: 'Shot clandestinely in occupied El Aaiún: the testimony the foreign press cannot gather because it is not allowed in.' },
        { tmdbId: 104636, note: 'A young woman raised in Spain returns to the camps after her mother’s death. Shot there, with non-professional Sahrawi actors.' },
        { tmdbId: 111078, note: 'Álvaro Longoria and Javier Bardem follow the diplomatic trail of the abandonment: who signed what, with whom, and in exchange for what.' },
        { tmdbId: 903445, note: 'Hassaniya poetry as a national archive. A Spanish-Sahrawi collective work on what a people keeps when it has no territory.' },
        { tmdbId: 365186, note: 'Iara Lee travels through non-violent resistance on both sides of the sand wall, with Sahrawi music and youth as the thread.' },
        { tmdbId: 611022, note: 'A journey to the well of Leyuad, in the liberated territory, in the company of the poets who hold the country’s memory.' },
        { tmdbId: 761303, note: 'Equipe Media activists film in secret in the occupied Sahara and smuggle the cards out. The title says what it costs them.' },
      ],
    },
    gl: {
      kicker: 'Dosier especial · A última colonia',
      title: 'Cine saharauí',
      blurb: 'Un festival de cine nun campo de refuxiados, unha escola de cine no deserto e as películas dun pobo que segue agardando polo seu referendo.',
      lead: 'O Sáhara Occidental é o último territorio pendente de descolonización en África. O seu cine nace nos campamentos de refuxiados de Tinduf e nas cidades ocupadas, e non está aí para narrar unha espera: está para rompela.',
      body: [
        'Comecemos por quen filmaba antes. Entre 1958 e 1975 o Sáhara foi oficialmente unha provincia española e o NO-DO rodouno como decorado: dunas, camelos, tropas nómades ao servizo de España e funcionarios inaugurando cousas. En centos de planos, os saharauís aparecen como paisaxe —nunca como xente que fala, decide ou discrepa—. Ese é o punto de partida deste dosier: un pobo abundantemente filmado que case nunca foi autor das súas propias imaxes.',
        'O 16 de outubro de 1975 a Corte Internacional de Xustiza ditaminou que non existían vínculos de soberanía que impedisen a autodeterminación do territorio. Semanas despois chegaron a Marcha Verde e os Acordos de Madrid: España, a potencia administradora, repartiu o Sáhara entre Marrocos e Mauritania e marchou sen celebrar o referendo ao que se comprometera. Veu o éxodo, o bombardeo da poboación que fuxía e os campamentos de Tinduf, no peor deserto de Alxeria, onde xa naceron tres xeracións.',
        'O alto o fogo de 1991 trouxo a MINURSO, unha misión da ONU cuxa única razón de ser é organizar ese referendo. Trinta e cinco anos despois segue sen celebrarse, e é a única misión de paz da ONU sen mandato de vixiar os dereitos humanos. En 2020 a guerra retomouse en Guerguerat; en 2022 o Goberno español respaldou o plan de autonomía marroquí, abandonando a súa propia posición xurídica. O expediente segue aberto en Nacións Unidas e pechado nos telexornais.',
        'Contra ese silencio construíuse unha infraestrutura de cine improbable: FiSahara desde 2003, unha escola de cine con dous anos de formación no campamento de Boxador desde 2011, e colectivos como Equipe Media que filman con teléfonos no territorio ocupado, onde a prensa estranxeira non entra. A consecuencia é a que importa: os saharauís deixaron de ser o obxecto das películas doutros para seren quen as asina.',
      ],
      quote: {
        text: 'O Sáhara Occidental segue a ser un territorio non autónomo pendente de descolonización.',
        source: 'Comité Especial de Descolonización das Nacións Unidas',
      },
      chronology: [
        { year: '1884', title: 'O reparto de África', text: 'España reclama Río de Ouro na véspera da Conferencia de Berlín. A fronteira do futuro conflito debúxase nun despacho europeo.' },
        { year: '1958–1975', title: 'A provincia 53', text: 'O Sáhara pasa a ser «provincia española». O NO-DO fílmao como un decorado exótico no que a poboación local é paisaxe.' },
        { year: '1973', title: 'Fronte Polisario', text: 'Nace o 10 de maio. A loita pola independencia empeza, primeiro, contra a metrópole española.' },
        { year: '1975', title: 'A entrega', text: 'O 16 de outubro o TIX avala a autodeterminación. O 14 de novembro os Acordos de Madrid reparten o territorio entre Marrocos e Mauritania.' },
        { year: '1976', title: 'Éxodo e RASD', text: 'A poboación que foxe cara a Alxeria é bombardeada con napalm e fósforo branco. O 27 de febreiro procrámase a República Árabe Saharauí Democrática.' },
        { year: '1991', title: 'Alto o fogo', text: 'A ONU desprega a MINURSO para organizar un referendo de autodeterminación. Segue sen celebrarse.' },
        { year: '2003', title: 'FiSahara', text: 'Celébrase o primeiro festival internacional de cine nun campamento de refuxiados: pantalla ao aire libre, público á intemperie.' },
        { year: '2010', title: 'Gdeim Izik', text: 'O desmantelamento do campamento de protesta preto do Aaiún fílmase con teléfonos e circula fóra. As imaxes xa non dependen das televisións.' },
        { year: '2011', title: 'Escola Abidin Kaid Saleh', text: 'FiSahara abre no campamento de Boxador unha escola de cine con dous anos de formación para mozos saharauís.' },
        { year: '2020', title: 'Guerguerat', text: 'Rómpese o alto o fogo despois de vinte e nove anos. Volve a guerra no muro de area.' },
        { year: '2022', title: 'O xiro español', text: 'O Goberno de España respalda o plan de autonomía marroquí e apártase da posición que sostiña como antiga potencia administradora.' },
        { year: '2024', title: 'XVIII FiSahara', text: 'O festival volve aos campamentos tras as edicións celebradas en Madrid. A seguinte está anunciada para 2026.' },
      ],
      festival: {
        name: 'FiSahara · Festival Internacional de Cine do Sáhara',
        body: [
          'Celébrase desde 2003 nos campamentos de refuxiados saharauís de Tinduf, en Alxeria: unha pantalla montada ao aire libre entre as jaimas, con público sentado na area e as películas subtituladas en hasanía. Para boa parte dese público é o cine do ano. Organízano saharauís e sociedade civil española, co apoio das autoridades dos campamentos, e o seu premio, a Camela Branca, decídeo o voto do público; a camela de verdade entrégaselle á familia que aloxou a quen gaña.',
          'En 2011 o festival abriu a súa peza máis importante: a Escola de Formación Audiovisual Abidin Kaid Saleh, no campamento de Boxador, con dous anos de formación e internado para quen vén doutros campamentos. De aí saen as curtas que hoxe programa o propio festival. Houbo ademais edicións en Madrid —2021, 2023 e 2025—, que é unha forma bastante precisa de devolverlle o asunto á antiga metrópole.',
        ],
        facts: [
          ['Desde', '2003'],
          ['Onde', 'Campamentos de refuxiados de Tinduf (Alxeria)'],
          ['Premio', 'Camela Branca, por voto do público'],
          ['Escola', 'Abidin Kaid Saleh, campamento de Boxador (2011)'],
        ],
      },
      filmsIntro: 'Sete películas rodadas nos campamentos, no territorio ocupado e nos despachos onde se asinou o abandono.',
      films: [
        { tmdbId: 770271, note: 'Rodada de forma clandestina no Aaiún ocupado: os testemuños que a prensa estranxeira non pode recoller porque non a deixan entrar.' },
        { tmdbId: 104636, note: 'Unha moza criada en España volve aos campamentos tras a morte da súa nai. Rodada alí, con intérpretes saharauís non profesionais.' },
        { tmdbId: 111078, note: 'Álvaro Longoria e Javier Bardem seguen o rastro diplomático do abandono: quen asinou que, con quen e a cambio de que.' },
        { tmdbId: 903445, note: 'A poesía en hasanía como arquivo nacional. Un traballo colectivo hispano-saharauí sobre o que un pobo garda cando non ten territorio.' },
        { tmdbId: 365186, note: 'Iara Lee percorre a resistencia non violenta a un lado e outro do muro de area, coa música e a mocidade saharauí como fío.' },
        { tmdbId: 611022, note: 'Unha viaxe ao pozo de Leyuad, no territorio liberado, en compaña dos poetas que sosteñen a memoria do país.' },
        { tmdbId: 761303, note: 'Os activistas de Equipe Media filman ás agachadas no Sáhara ocupado e sacan as tarxetas fóra. O título conta o que lles custa.' },
      ],
    },
    eu: {
      kicker: 'Dosier berezia · Azken kolonia',
      title: 'Zinema saharauia',
      blurb: 'Errefuxiatu-esparru bateko zinema-jaialdia, basamortuko zinema-eskola bat eta oraindik bere erreferenduma zain duen herri baten filmak.',
      lead: 'Mendebaldeko Sahara Afrikan deskolonizatzeke dagoen azken lurraldea da. Haren zinema Tindufeko errefuxiatu-esparruetan eta hiri okupatuetan jaiotzen da, eta ez dago hor itxaronaldi bat kontatzeko: hausteko baizik.',
      body: [
        'Has gaitezen lehen nork filmatzen zuen galdetuz. 1958tik 1975era Sahara ofizialki espainiar probintzia bat izan zen, eta NO-DOk dekoratu gisa errodatu zuen: dunak, gameluak, Espainiaren zerbitzura zeuden tropa nomadak eta gauzak inauguratzen zituzten funtzionarioak. Ehunka planotan, saharauiak paisaia gisa agertzen dira —inoiz ez hitz egiten, erabakitzen edo desadostasuna adierazten duen jende gisa—. Hortik abiatzen da dosier hau: ugari filmatutako herri bat, ia inoiz bere irudien egile izan ez zena.',
        '1975eko urriaren 16an Nazioarteko Justizia Auzitegiak ebatzi zuen ez zegoela lurraldearen autodeterminazioa eragozten zuen subiranotasun-loturarik. Aste batzuk geroago Martxa Berdea eta Madrilgo Akordioak iritsi ziren: Espainiak, potentzia administratzaileak, Sahara Marokoren eta Mauritaniaren artean banatu eta alde egin zuen, hitzemandako erreferenduma egin gabe. Gero etorri ziren exodoa, ihesi zihoan biztanleriaren bonbardaketa eta Tindufeko esparruak, Aljeriako basamortu gogorrenean, non hiru belaunaldi jaio diren ordutik.',
        '1991ko su-etenak MINURSO ekarri zuen, erreferendum hori antolatzea beste zereginik ez duen NBEren misioa. Hogeita hamabost urte geroago oraindik ez da egin, eta giza eskubideak zaintzeko agindurik ez duen NBEren bake-misio bakarra da. 2020an gerra Guerguerat-en berpiztu zen; 2022an Espainiako Gobernuak Marokoren autonomia-plana babestu zuen, bere jarrera juridikoa bertan behera utzita. Espedientea zabalik dago Nazio Batuetan eta itxita albistegietan.',
        'Isiltasun horren aurka zinema-azpiegitura ezustekoa eraiki zen: FiSahara 2003tik, bi urteko prestakuntza duen zinema-eskola bat Bojador esparruan 2011tik, eta Equipe Media bezalako kolektiboak, telefonoekin filmatzen dutenak lurralde okupatuan, non atzerriko prentsak ez duen sartzerik. Ondorioa da axola duena: saharauiak besteren filmen objektu izateari utzi eta filmak sinatzen dituztenak izatera pasatu ziren.',
      ],
      quote: {
        text: 'Mendebaldeko Sahara deskolonizatzeke dagoen lurralde ez-autonomoa da oraindik.',
        source: 'Nazio Batuen Deskolonizazio Batzorde Berezia',
      },
      chronology: [
        { year: '1884', title: 'Afrikaren banaketa', text: 'Espainiak Rio de Oro erreklamatzen du Berlingo Konferentziaren atarian. Etorkizuneko gatazkaren muga bulego europar batean marrazten da.' },
        { year: '1958–1975', title: '53. probintzia', text: 'Sahara «espainiar probintzia» bihurtzen da. NO-DOk dekoratu exotiko gisa filmatzen du, bertako biztanleria paisaia delarik.' },
        { year: '1973', title: 'Polisario Frontea', text: 'Maiatzaren 10ean sortzen da. Independentziaren aldeko borroka, lehenik, metropoli espainiarraren aurka hasten da.' },
        { year: '1975', title: 'Eskualdaketa', text: 'Urriaren 16an NJAk autodeterminazioa berresten du. Azaroaren 14an Madrilgo Akordioek lurraldea Marokoren eta Mauritaniaren artean banatzen dute.' },
        { year: '1976', title: 'Exodoa eta SEDA', text: 'Aljeriara ihesi doan biztanleria napalmez eta fosforo zuriz bonbardatzen dute. Otsailaren 27an Sahara Errepublika Arabiar Demokratikoa aldarrikatzen da.' },
        { year: '1991', title: 'Su-etena', text: 'NBEk MINURSO zabaltzen du autodeterminazio-erreferendum bat antolatzeko. Oraindik ez da egin.' },
        { year: '2003', title: 'FiSahara', text: 'Errefuxiatu-esparru batean egindako lehen nazioarteko zinema-jaialdia: aire zabaleko pantaila, ikusleak zeru azpian.' },
        { year: '2010', title: 'Gdeim Izik', text: 'Aaiun ondoko protesta-kanpalekuaren desegitea telefonoekin filmatzen da eta kanpora zabaltzen. Irudiak jada ez daude telebisten esku.' },
        { year: '2011', title: 'Abidin Kaid Saleh eskola', text: 'FiSaharak zinema-eskola bat irekitzen du Bojador esparruan, gazte saharauientzako bi urteko prestakuntzarekin.' },
        { year: '2020', title: 'Guerguerat', text: 'Su-etena hausten da hogeita bederatzi urteren ondoren. Gerra itzultzen da hondar-harresira.' },
        { year: '2022', title: 'Espainiaren bira', text: 'Espainiako Gobernuak Marokoren autonomia-plana babesten du eta potentzia administratzaile ohi gisa zeukan jarreratik aldentzen da.' },
        { year: '2024', title: 'XVIII. FiSahara', text: 'Jaialdia esparruetara itzultzen da Madrilen egindako edizioen ondoren. Hurrengoa 2026rako iragarrita dago.' },
      ],
      festival: {
        name: 'FiSahara · Saharako Nazioarteko Zinema Jaialdia',
        body: [
          '2003tik ospatzen da Aljeriako Tindufeko errefuxiatu-esparru saharauietan: pantaila bat aire zabalean jaimen artean, ikusleak hondarrean eserita eta filmak hassaniera azpidatzita. Ikusle horietako askorentzat urteko zinema da. Saharauiek eta espainiar gizarte zibilak antolatzen dute, esparruetako agintarien laguntzarekin, eta bere saria, Gamelu Zuria, ikusleen botoak erabakitzen du; benetako gamelua irabazlea ostatatu duen familiari ematen zaio.',
          '2011n jaialdiak bere pieza garrantzitsuena ireki zuen: Abidin Kaid Saleh Ikus-entzunezko Prestakuntza Eskola, Bojador esparruan, bi urteko ikasketekin eta beste esparruetatik datozenentzako egoitzarekin. Handik ateratzen dira gaur egun jaialdiak berak programatzen dituen film laburrak. Madrilen ere izan dira edizioak —2021, 2023 eta 2025—, eta hori nahiko modu zehatza da gaia metropoli ohiari itzultzeko.',
        ],
        facts: [
          ['Noiztik', '2003'],
          ['Non', 'Tindufeko errefuxiatu-esparruak (Aljeria)'],
          ['Saria', 'Gamelu Zuria, ikusleen botoz'],
          ['Eskola', 'Abidin Kaid Saleh, Bojador esparrua (2011)'],
        ],
      },
      filmsIntro: 'Zazpi film, esparruetan, lurralde okupatuan eta abandonua sinatu zen bulegoetan errodatuak.',
      films: [
        { tmdbId: 770271, note: 'Aaiun okupatuan ezkutuan errodatua: atzerriko prentsak jaso ezin dituen lekukotasunak, sartzen uzten ez diotelako.' },
        { tmdbId: 104636, note: 'Espainian hazitako neska gazte bat esparruetara itzultzen da ama hil ondoren. Han errodatua, aktore saharaui ez-profesionalekin.' },
        { tmdbId: 111078, note: 'Álvaro Longoriak eta Javier Bardemek abandonuaren arrasto diplomatikoa jarraitzen dute: nork sinatu zuen zer, norekin eta zeren truke.' },
        { tmdbId: 903445, note: 'Hassaniera hizkuntzako poesia artxibo nazional gisa. Herri batek lurralderik ez duenean gordetzen duenari buruzko lan kolektibo hispano-saharauia.' },
        { tmdbId: 365186, note: 'Iara Leek indarkeriarik gabeko erresistentzia zeharkatzen du hondar-harresiaren bi aldeetan, musika eta gazteria saharauia hari gisa.' },
        { tmdbId: 611022, note: 'Bidaia bat Leyuadeko putzura, lurralde askatuan, herrialdearen memoria eusten duten poeten konpainian.' },
        { tmdbId: 761303, note: 'Equipe Mediako aktibistek ezkutuan filmatzen dute Sahara okupatuan eta txartelak kanpora ateratzen dituzte. Izenburuak zenbat kostatzen zaien kontatzen du.' },
      ],
    },
    ca: {
      kicker: 'Dossier especial · L’última colònia',
      title: 'Cinema sahrauí',
      blurb: 'Un festival de cinema en un camp de refugiats, una escola de cinema al desert i les pel·lícules d’un poble que continua esperant el seu referèndum.',
      lead: 'El Sàhara Occidental és l’últim territori pendent de descolonització a l’Àfrica. El seu cinema neix als campaments de refugiats de Tinduf i a les ciutats ocupades, i no hi és per narrar una espera: hi és per trencar-la.',
      body: [
        'Comencem per qui filmava abans. Entre 1958 i 1975 el Sàhara va ser oficialment una província espanyola i el NO-DO el va rodar com un decorat: dunes, camells, tropes nòmades al servei d’Espanya i funcionaris inaugurant coses. En centenars de plans, els sahrauís hi apareixen com a paisatge —mai com a gent que parla, decideix o discrepa. Aquest és el punt de partida del dossier: un poble filmat abundantment que gairebé mai no va ser autor de les seves pròpies imatges.',
        'El 16 d’octubre de 1975 la Cort Internacional de Justícia va dictaminar que no existien vincles de sobirania que impedissin l’autodeterminació del territori. Setmanes després van arribar la Marxa Verda i els Acords de Madrid: Espanya, la potència administradora, va repartir el Sàhara entre el Marroc i Mauritània i va marxar sense celebrar el referèndum al qual s’havia compromès. Van venir l’èxode, el bombardeig de la població que fugia i els campaments de Tinduf, al pitjor desert d’Algèria, on ja han nascut tres generacions.',
        'L’alto el foc del 1991 va portar la MINURSO, una missió de l’ONU l’única raó de ser de la qual és organitzar aquest referèndum. Trenta-cinc anys després continua sense celebrar-se, i és l’única missió de pau de l’ONU sense mandat de vigilar els drets humans. El 2020 la guerra es va reprendre a Guerguerat; el 2022 el Govern espanyol va donar suport al pla d’autonomia marroquí, abandonant la seva pròpia posició jurídica. L’expedient continua obert a les Nacions Unides i tancat als telenotícies.',
        'Contra aquest silenci s’hi va construir una infraestructura de cinema improbable: FiSahara des del 2003, una escola de cinema amb dos anys de formació al campament de Bojador des del 2011, i col·lectius com Equipe Media que filmen amb telèfons al territori ocupat, on la premsa estrangera no pot entrar. La conseqüència és la que importa: els sahrauís van deixar de ser l’objecte de les pel·lícules dels altres per ser qui les signa.',
      ],
      quote: {
        text: 'El Sàhara Occidental continua sent un territori no autònom pendent de descolonització.',
        source: 'Comitè Especial de Descolonització de les Nacions Unides',
      },
      chronology: [
        { year: '1884', title: 'El repartiment d’Àfrica', text: 'Espanya reclama Riu d’Or a les portes de la Conferència de Berlín. La frontera del futur conflicte es dibuixa en un despatx europeu.' },
        { year: '1958–1975', title: 'La província 53', text: 'El Sàhara passa a ser «província espanyola». El NO-DO el filma com un decorat exòtic en què la població local és paisatge.' },
        { year: '1973', title: 'Front Polisario', text: 'Neix el 10 de maig. La lluita per la independència comença, primer, contra la metròpoli espanyola.' },
        { year: '1975', title: 'El lliurament', text: 'El 16 d’octubre el TIJ avala l’autodeterminació. El 14 de novembre els Acords de Madrid reparteixen el territori entre el Marroc i Mauritània.' },
        { year: '1976', title: 'Èxode i RASD', text: 'La població que fuig cap a Algèria és bombardejada amb napalm i fòsfor blanc. El 27 de febrer es proclama la República Àrab Sahrauí Democràtica.' },
        { year: '1991', title: 'Alto el foc', text: 'L’ONU desplega la MINURSO per organitzar un referèndum d’autodeterminació. Continua sense celebrar-se.' },
        { year: '2003', title: 'FiSahara', text: 'Se celebra el primer festival internacional de cinema en un camp de refugiats: pantalla a l’aire lliure, públic a la intempèrie.' },
        { year: '2010', title: 'Gdeim Izik', text: 'El desmantellament del campament de protesta prop d’Al-Aaiun es filma amb telèfons i circula fora. Les imatges ja no depenen de les televisions.' },
        { year: '2011', title: 'Escola Abidin Kaid Saleh', text: 'FiSahara obre al campament de Bojador una escola de cinema amb dos anys de formació per a joves sahrauís.' },
        { year: '2020', title: 'Guerguerat', text: 'Es trenca l’alto el foc després de vint-i-nou anys. Torna la guerra al mur de sorra.' },
        { year: '2022', title: 'El gir espanyol', text: 'El Govern d’Espanya dona suport al pla d’autonomia marroquí i s’aparta de la posició que sostenia com a antiga potència administradora.' },
        { year: '2024', title: 'XVIII FiSahara', text: 'El festival torna als campaments després de les edicions celebrades a Madrid. La següent està anunciada per al 2026.' },
      ],
      festival: {
        name: 'FiSahara · Festival Internacional de Cinema del Sàhara',
        body: [
          'Se celebra des del 2003 als campaments de refugiats sahrauís de Tinduf, a Algèria: una pantalla muntada a l’aire lliure entre les jaimes, amb públic assegut a la sorra i les pel·lícules subtitulades en hassania. Per a bona part d’aquest públic és el cinema de l’any. L’organitzen sahrauís i societat civil espanyola, amb el suport de les autoritats dels campaments, i el seu premi, la Camella Blanca, el decideix el vot del públic; la camella de debò es lliura a la família que ha allotjat qui guanya.',
          'El 2011 el festival va obrir la seva peça més important: l’Escola de Formació Audiovisual Abidin Kaid Saleh, al campament de Bojador, amb dos anys de formació i internat per a qui ve d’altres campaments. D’allà surten els curts que avui programa el mateix festival. Hi ha hagut a més edicions a Madrid —2021, 2023 i 2025—, que és una manera bastant precisa de tornar l’assumpte a l’antiga metròpoli.',
        ],
        facts: [
          ['Des del', '2003'],
          ['On', 'Campaments de refugiats de Tinduf (Algèria)'],
          ['Premi', 'Camella Blanca, per vot del públic'],
          ['Escola', 'Abidin Kaid Saleh, campament de Bojador (2011)'],
        ],
      },
      filmsIntro: 'Set pel·lícules rodades als campaments, al territori ocupat i als despatxos on es va signar l’abandonament.',
      films: [
        { tmdbId: 770271, note: 'Rodada de manera clandestina a Al-Aaiun ocupat: els testimonis que la premsa estrangera no pot recollir perquè no la deixen entrar.' },
        { tmdbId: 104636, note: 'Una jove criada a Espanya torna als campaments després de la mort de la seva mare. Rodada allà, amb intèrprets sahrauís no professionals.' },
        { tmdbId: 111078, note: 'Álvaro Longoria i Javier Bardem segueixen el rastre diplomàtic de l’abandonament: qui va signar què, amb qui i a canvi de què.' },
        { tmdbId: 903445, note: 'La poesia en hassania com a arxiu nacional. Un treball col·lectiu hispanosahrauí sobre allò que un poble guarda quan no té territori.' },
        { tmdbId: 365186, note: 'Iara Lee recorre la resistència no violenta a banda i banda del mur de sorra, amb la música i el jovent sahrauí com a fil.' },
        { tmdbId: 611022, note: 'Un viatge al pou de Leyuad, al territori alliberat, en companyia dels poetes que sostenen la memòria del país.' },
        { tmdbId: 761303, note: 'Els activistes d’Equipe Media filmen d’amagat al Sàhara ocupat i treuen les targetes fora. El títol explica què els costa.' },
      ],
    },
  },
};

/** Los dosieres, en el orden en que se muestran. */
export const dossiers: Dossier[] = [palestina, sahara];
