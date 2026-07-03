/**
 * Historial de versiones de Cine Archive (bilingüe). Se muestra en /changelog,
 * enlazado desde el pie. La primera entrada es la versión actual.
 */
export interface Release {
  version: string;
  /** Fecha ISO (YYYY-MM-DD). Aproximada para las versiones antiguas. */
  date: string;
  title_es: string;
  title_en: string;
  changes_es: string[];
  changes_en: string[];
}

export const CHANGELOG: Release[] = [
  {
    version: '1.3',
    date: '2026-07-03',
    title_es: 'Reseñas con vida propia',
    title_en: 'Reviews come into their own',
    changes_es: [
      'Cada reseña tiene ahora su propia página, con la fecha en que la escribiste, accesible desde tu perfil o el de cualquier persona.',
      'Desde una reseña puedes saltar directamente a la ficha de la película.',
      'Tus películas favoritas y tu lista de pendientes se muestran en tu perfil público.',
      'La interfaz está disponible en cinco idiomas —español, inglés, gallego, euskera y catalán— con un nuevo selector de idioma.',
      'Al abrir una lista desde un perfil, el enlace de vuelta te devuelve a ese perfil.',
    ],
    changes_en: [
      'Every review now has its own page, showing the date you wrote it, reachable from your profile or anyone else’s.',
      'From a review you can jump straight to the film’s page.',
      'Your favourite films and your watchlist now appear on your public profile.',
      'The interface is available in five languages —Spanish, English, Galician, Basque and Catalan— with a new language switcher.',
      'Opening a list from a profile now takes you back to that profile.',
    ],
  },
  {
    version: '1.2.1',
    date: '2026-07-02',
    title_es: 'Perfiles y comunidad, afinados',
    title_en: 'Profiles and community, refined',
    changes_es: [
      'Enlaza tu cuenta de Instagram desde los ajustes de tu perfil público.',
      'Amplía la foto de perfil de cualquier usuario con un clic.',
      'Gestiona tus conexiones: elimina seguidores o deja de seguir, con confirmación.',
      'La ventana de seguidores y seguidos ahora aparece centrada.',
      'Recomendaciones más variadas: se tienen en cuenta todos tus géneros y directores favoritos, no solo unos pocos.',
      'Nueva página de versiones (esta), accesible desde el pie de página.',
    ],
    changes_en: [
      'Link your Instagram account from your public profile settings.',
      'Enlarge any user’s profile photo with a click.',
      'Manage your connections: remove followers or unfollow, with confirmation.',
      'The followers and following window now appears centred.',
      'More varied recommendations: all your favourite genres and directors are considered, not just a few.',
      'New changelog page (this one), reachable from the footer.',
    ],
  },
  {
    version: '1.2',
    date: '2026-06-28',
    title_es: 'Capa social',
    title_en: 'Social layer',
    changes_es: [
      'Perfiles públicos o privados con nombre de usuario (@).',
      'Sigue a otras personas; en los perfiles privados, mediante solicitud de seguimiento.',
      'Foto de perfil, biografía y buscador de usuarios en la barra de navegación.',
      'Tus reseñas y listas marcadas como públicas se muestran en tu perfil.',
      'Notificaciones de solicitudes y de nuevos seguidores.',
    ],
    changes_en: [
      'Public or private profiles with a username (@).',
      'Follow other people; on private profiles, through a follow request.',
      'Profile photo, bio and a user search box in the navigation bar.',
      'Your reviews and lists marked as public are shown on your profile.',
      'Notifications for requests and new followers.',
    ],
  },
  {
    version: '1.1',
    date: '2026-06-10',
    title_es: 'El archivo crece',
    title_en: 'The archive grows',
    changes_es: [
      'Cine abierto: visor de películas de dominio público desde la Filmoteca.',
      'Biblioteca de lecturas, dosieres temáticos y figuras del cine.',
      'Atlas de localizaciones de rodaje, glosario y cronología de movimientos.',
      'Palmarés: Óscar a la mejor película, Palma de Oro y Goya.',
      'Efemérides «un día como hoy» en la portada.',
    ],
    changes_en: [
      'Open cinema: a public-domain film viewer within the Film Library.',
      'Reading library, themed dossiers and film figures.',
      'Atlas of filming locations, glossary and timeline of movements.',
      'Awards: Academy Award for Best Picture, Palme d’Or and Goya.',
      '“On this day” ephemeris on the home page.',
    ],
  },
  {
    version: '1.0',
    date: '2026-05-15',
    title_es: 'Lanzamiento',
    title_en: 'Launch',
    changes_es: [
      'Archivo de cine editorial y brutalista, bilingüe (español e inglés).',
      'Catálogo de películas con fichas, valoraciones y reseñas personales.',
      'Listas personalizadas y lista de seguimiento.',
      'Recomendaciones según tus gustos y estadísticas de tu actividad.',
      'Hemeroteca de revistas de cine de dominio público.',
    ],
    changes_en: [
      'An editorial, brutalist film archive, bilingual (Spanish and English).',
      'Film catalogue with detail pages, ratings and personal reviews.',
      'Custom lists and a watchlist.',
      'Recommendations based on your taste and stats on your activity.',
      'A periodicals library of public-domain film magazines.',
    ],
  },
];

/** Versión actual (la primera del historial). */
export const CURRENT_VERSION = CHANGELOG[0].version;
