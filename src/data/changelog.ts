/**
 * Historial de versiones de Cine Archive, en los cinco idiomas de la interfaz
 * (es/en/gl/eu/ca). Se muestra en /changelog, enlazado desde el pie. La primera
 * entrada es la versión actual.
 */
import type { Lang } from '../i18n/ui';

export interface Release {
  version: string;
  /** Fecha ISO (YYYY-MM-DD). Aproximada para las versiones antiguas. */
  date: string;
  title: Record<Lang, string>;
  changes: Record<Lang, string[]>;
}

export const CHANGELOG: Release[] = [
  {
    version: '1.3',
    date: '2026-07-03',
    title: {
      es: 'Reseñas con vida propia',
      en: 'Reviews come into their own',
      gl: 'Recensións con vida propia',
      eu: 'Iruzkinek bizitza propioa hartzen dute',
      ca: 'Les ressenyes prenen vida pròpia',
    },
    changes: {
      es: [
        'Cada reseña tiene ahora su propia página, con la fecha en que la escribiste, accesible desde tu perfil o el de cualquier persona.',
        'Desde una reseña puedes saltar directamente a la ficha de la película.',
        'Tus películas favoritas y tu lista de pendientes se muestran en tu perfil público.',
        'La interfaz está disponible en cinco idiomas —español, inglés, gallego, euskera y catalán— con un nuevo selector de idioma.',
        'Al abrir una lista desde un perfil, el enlace de vuelta te devuelve a ese perfil.',
      ],
      en: [
        'Every review now has its own page, showing the date you wrote it, reachable from your profile or anyone else’s.',
        'From a review you can jump straight to the film’s page.',
        'Your favourite films and your watchlist now appear on your public profile.',
        'The interface is available in five languages —Spanish, English, Galician, Basque and Catalan— with a new language switcher.',
        'Opening a list from a profile now takes you back to that profile.',
      ],
      gl: [
        'Cada recensión ten agora a súa propia páxina, coa data en que a escribiches, accesible desde o teu perfil ou o de calquera persoa.',
        'Desde unha recensión podes saltar directamente á ficha da película.',
        'As túas películas favoritas e a túa lista de pendentes móstranse no teu perfil público.',
        'A interface está dispoñible en cinco idiomas —español, inglés, galego, éuscaro e catalán— cun novo selector de idioma.',
        'Ao abrir unha lista desde un perfil, a ligazón de volta devólveche a ese perfil.',
      ],
      eu: [
        'Iruzkin bakoitzak orain bere orrialdea du, idatzi zenuen datarekin, zure profiletik edo edonorenetik eskuragarri.',
        'Iruzkin batetik zuzenean filmaren fitxara salta zaitezke.',
        'Zure gogoko filmak eta zure zerrenda pendentea zure profil publikoan erakusten dira.',
        'Interfazea bost hizkuntzatan dago eskuragarri —gaztelania, ingelesa, galiziera, euskara eta katalana— hizkuntza-hautatzaile berri batekin.',
        'Profil batetik zerrenda bat irekitzean, itzultzeko estekak profil horretara eramaten zaitu.',
      ],
      ca: [
        'Cada ressenya té ara la seva pròpia pàgina, amb la data en què la vas escriure, accessible des del teu perfil o el de qualsevol persona.',
        "Des d'una ressenya pots saltar directament a la fitxa de la pel·lícula.",
        'Les teves pel·lícules preferides i la teva llista de pendents es mostren al teu perfil públic.',
        "La interfície està disponible en cinc idiomes —espanyol, anglès, gallec, basc i català— amb un nou selector d'idioma.",
        "En obrir una llista des d'un perfil, l'enllaç de tornada et porta a aquest perfil.",
      ],
    },
  },
  {
    version: '1.2.1',
    date: '2026-07-02',
    title: {
      es: 'Perfiles y comunidad, afinados',
      en: 'Profiles and community, refined',
      gl: 'Perfís e comunidade, afinados',
      eu: 'Profilak eta komunitatea, fintuak',
      ca: 'Perfils i comunitat, afinats',
    },
    changes: {
      es: [
        'Enlaza tu cuenta de Instagram desde los ajustes de tu perfil público.',
        'Amplía la foto de perfil de cualquier usuario con un clic.',
        'Gestiona tus conexiones: elimina seguidores o deja de seguir, con confirmación.',
        'La ventana de seguidores y seguidos ahora aparece centrada.',
        'Recomendaciones más variadas: se tienen en cuenta todos tus géneros y directores favoritos, no solo unos pocos.',
        'Nueva página de versiones (esta), accesible desde el pie de página.',
      ],
      en: [
        'Link your Instagram account from your public profile settings.',
        'Enlarge any user’s profile photo with a click.',
        'Manage your connections: remove followers or unfollow, with confirmation.',
        'The followers and following window now appears centred.',
        'More varied recommendations: all your favourite genres and directors are considered, not just a few.',
        'New changelog page (this one), reachable from the footer.',
      ],
      gl: [
        'Liga a túa conta de Instagram desde os axustes do teu perfil público.',
        'Amplía a foto de perfil de calquera usuario cun clic.',
        'Xestiona as túas conexións: elimina seguidores ou deixa de seguir, con confirmación.',
        'A xanela de seguidores e seguidos aparece agora centrada.',
        'Recomendacións máis variadas: téñense en conta todos os teus xéneros e directores favoritos, non só uns poucos.',
        'Nova páxina de versións (esta), accesible desde o pé de páxina.',
      ],
      eu: [
        'Lotu zure Instagram kontua zure profil publikoaren ezarpenetatik.',
        'Handitu edozein erabiltzaileren profileko argazkia klik batekin.',
        'Kudeatu zure konexioak: kendu jarraitzaileak edo utzi jarraitzeari, berrespenarekin.',
        'Jarraitzaileen eta jarraituen leihoa orain zentratuta agertzen da.',
        'Gomendio anitzagoak: zure gogoko genero eta zuzendari guztiak hartzen dira kontuan, ez batzuk soilik.',
        'Bertsioen orrialde berria (hau), orri-oinetik eskuragarri.',
      ],
      ca: [
        "Enllaça el teu compte d'Instagram des de la configuració del teu perfil públic.",
        'Amplia la foto de perfil de qualsevol usuari amb un clic.',
        'Gestiona les teves connexions: elimina seguidors o deixa de seguir, amb confirmació.',
        'La finestra de seguidors i seguits ara apareix centrada.',
        'Recomanacions més variades: es tenen en compte tots els teus gèneres i directors preferits, no només uns quants.',
        'Nova pàgina de versions (aquesta), accessible des del peu de pàgina.',
      ],
    },
  },
  {
    version: '1.2',
    date: '2026-06-28',
    title: {
      es: 'Capa social',
      en: 'Social layer',
      gl: 'Capa social',
      eu: 'Geruza soziala',
      ca: 'Capa social',
    },
    changes: {
      es: [
        'Perfiles públicos o privados con nombre de usuario (@).',
        'Sigue a otras personas; en los perfiles privados, mediante solicitud de seguimiento.',
        'Foto de perfil, biografía y buscador de usuarios en la barra de navegación.',
        'Tus reseñas y listas marcadas como públicas se muestran en tu perfil.',
        'Notificaciones de solicitudes y de nuevos seguidores.',
      ],
      en: [
        'Public or private profiles with a username (@).',
        'Follow other people; on private profiles, through a follow request.',
        'Profile photo, bio and a user search box in the navigation bar.',
        'Your reviews and lists marked as public are shown on your profile.',
        'Notifications for requests and new followers.',
      ],
      gl: [
        'Perfís públicos ou privados con nome de usuario (@).',
        'Segue a outras persoas; nos perfís privados, mediante solicitude de seguimento.',
        'Foto de perfil, biografía e buscador de usuarios na barra de navegación.',
        'As túas recensións e listas marcadas como públicas móstranse no teu perfil.',
        'Notificacións de solicitudes e de novos seguidores.',
      ],
      eu: [
        'Profil publiko edo pribatuak erabiltzaile-izenarekin (@).',
        'Jarraitu beste pertsona batzuei; profil pribatuetan, jarraipen-eskaeraren bidez.',
        'Profileko argazkia, biografia eta erabiltzaile-bilatzailea nabigazio-barran.',
        'Publiko gisa markatutako zure iruzkinak eta zerrendak zure profilean erakusten dira.',
        'Eskaeren eta jarraitzaile berrien jakinarazpenak.',
      ],
      ca: [
        "Perfils públics o privats amb nom d'usuari (@).",
        'Segueix altres persones; als perfils privats, mitjançant sol·licitud de seguiment.',
        "Foto de perfil, biografia i cercador d'usuaris a la barra de navegació.",
        'Les teves ressenyes i llistes marcades com a públiques es mostren al teu perfil.',
        'Notificacions de sol·licituds i de nous seguidors.',
      ],
    },
  },
  {
    version: '1.1',
    date: '2026-06-10',
    title: {
      es: 'El archivo crece',
      en: 'The archive grows',
      gl: 'O arquivo crece',
      eu: 'Artxiboa hazten da',
      ca: "L'arxiu creix",
    },
    changes: {
      es: [
        'Cine abierto: visor de películas de dominio público desde la Filmoteca.',
        'Biblioteca de lecturas, dosieres temáticos y figuras del cine.',
        'Atlas de localizaciones de rodaje, glosario y cronología de movimientos.',
        'Palmarés: Óscar a la mejor película, Palma de Oro y Goya.',
        'Efemérides «un día como hoy» en la portada.',
      ],
      en: [
        'Open cinema: a public-domain film viewer within the Film Library.',
        'Reading library, themed dossiers and film figures.',
        'Atlas of filming locations, glossary and timeline of movements.',
        'Awards: Academy Award for Best Picture, Palme d’Or and Goya.',
        '“On this day” ephemeris on the home page.',
      ],
      gl: [
        'Cine aberto: visor de películas de dominio público desde a Filmoteca.',
        'Biblioteca de lecturas, dosieres temáticos e figuras do cine.',
        'Atlas de localizacións de rodaxe, glosario e cronoloxía de movementos.',
        'Palmarés: Óscar á mellor película, Palma de Ouro e Goya.',
        'Efemérides «un día coma hoxe» na portada.',
      ],
      eu: [
        'Zinema irekia: domeinu publikoko filmen ikustailea Filmotekatik.',
        'Irakurgaien liburutegia, dosier tematikoak eta zinemako figurak.',
        'Filmaketa-kokapenen atlasa, glosarioa eta mugimenduen kronologia.',
        'Palmaresa: film onenaren Oscarra, Urrezko Palma eta Goya.',
        '«Gaur bezalako egun batean» efemerideak azalean.',
      ],
      ca: [
        'Cinema obert: visor de pel·lícules de domini públic des de la Filmoteca.',
        'Biblioteca de lectures, dossiers temàtics i figures del cinema.',
        'Atles de localitzacions de rodatge, glossari i cronologia de moviments.',
        "Palmarès: Oscar a la millor pel·lícula, Palma d'Or i Goya.",
        'Efemèrides «un dia com avui» a la portada.',
      ],
    },
  },
  {
    version: '1.0',
    date: '2026-05-15',
    title: {
      es: 'Lanzamiento',
      en: 'Launch',
      gl: 'Lanzamento',
      eu: 'Abiaraztea',
      ca: 'Llançament',
    },
    changes: {
      es: [
        'Archivo de cine editorial y brutalista, bilingüe (español e inglés).',
        'Catálogo de películas con fichas, valoraciones y reseñas personales.',
        'Listas personalizadas y lista de seguimiento.',
        'Recomendaciones según tus gustos y estadísticas de tu actividad.',
        'Hemeroteca de revistas de cine de dominio público.',
      ],
      en: [
        'An editorial, brutalist film archive, bilingual (Spanish and English).',
        'Film catalogue with detail pages, ratings and personal reviews.',
        'Custom lists and a watchlist.',
        'Recommendations based on your taste and stats on your activity.',
        'A periodicals library of public-domain film magazines.',
      ],
      gl: [
        'Arquivo de cine editorial e brutalista, bilingüe (español e inglés).',
        'Catálogo de películas con fichas, valoracións e recensións persoais.',
        'Listas personalizadas e lista de seguimento.',
        'Recomendacións segundo os teus gustos e estatísticas da túa actividade.',
        'Hemeroteca de revistas de cine de dominio público.',
      ],
      eu: [
        'Zinema-artxibo editorial eta brutalista, elebiduna (gaztelania eta ingelesa).',
        'Filmen katalogoa fitxekin, balorazioekin eta iruzkin pertsonalekin.',
        'Zerrenda pertsonalizatuak eta jarraipen-zerrenda.',
        'Zure gustuen araberako gomendioak eta zure jardueraren estatistikak.',
        'Domeinu publikoko zinema-aldizkarien hemeroteka.',
      ],
      ca: [
        'Arxiu de cinema editorial i brutalista, bilingüe (espanyol i anglès).',
        'Catàleg de pel·lícules amb fitxes, valoracions i ressenyes personals.',
        'Llistes personalitzades i llista de seguiment.',
        'Recomanacions segons els teus gustos i estadístiques de la teva activitat.',
        'Hemeroteca de revistes de cinema de domini públic.',
      ],
    },
  },
];

/** Versión actual (la primera del historial). */
export const CURRENT_VERSION = CHANGELOG[0].version;
