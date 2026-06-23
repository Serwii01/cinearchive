/**
 * Textos legales (Política de Privacidad y Términos y Condiciones), en ES/EN.
 * Plantilla honesta basada en lo que la app realmente hace. Revísala con un
 * profesional antes de un uso comercial serio.
 *
 * Cambia CONTACT_EMAIL por tu dirección de contacto real.
 */
export const CONTACT_EMAIL = 'sfmrbb@gmail.com';

export interface LegalSection {
  heading: string;
  body: string[];
}
export interface LegalDoc {
  title: string;
  updated: string; // etiqueta "Última actualización"
  date: string; // fecha mostrada
  intro: string;
  sections: LegalSection[];
}

const DATE_ES = '23 de junio de 2026';
const DATE_EN = 'June 23, 2026';

export const privacy: Record<'es' | 'en', LegalDoc> = {
  es: {
    title: 'Política de Privacidad',
    updated: 'Última actualización',
    date: DATE_ES,
    intro:
      'Esta política explica qué datos personales tratamos en Cine Archive, con qué fin y qué derechos tienes. Cine Archive es un proyecto editorial independiente, sin publicidad ni rastreadores.',
    sections: [
      {
        heading: 'Responsable del tratamiento',
        body: [
          `El responsable de este sitio gestiona los datos descritos aquí. Para cualquier consulta sobre privacidad puedes escribir a ${CONTACT_EMAIL}.`,
        ],
      },
      {
        heading: 'Qué datos recogemos',
        body: [
          'Datos de cuenta: tu nombre, tu correo electrónico y una versión cifrada (hash) de tu contraseña. Nunca almacenamos la contraseña en claro.',
          'Datos de uso del servicio: tu lista de películas (guardadas, vistas, favoritas), tus valoraciones y notas, y tus preferencias (géneros y directores favoritos, idioma y tema claro/oscuro).',
          'Datos técnicos mínimos: una cookie de sesión para mantenerte identificado y registros temporales en memoria para limitar el abuso (rate limiting) por dirección IP.',
        ],
      },
      {
        heading: 'Para qué los usamos',
        body: [
          'Para crear y mantener tu cuenta, guardar tu lista y preferencias, y generar tus recomendaciones personalizadas.',
          'Para proteger el servicio frente a usos abusivos y mantenerlo disponible.',
          'No usamos tus datos con fines publicitarios, no los vendemos y no hacemos perfilado más allá de las recomendaciones de películas dentro del propio sitio.',
        ],
      },
      {
        heading: 'Base legal',
        body: [
          'Tratamos tus datos para ejecutar el servicio que solicitas al registrarte (relación contractual) y, en lo relativo a seguridad, por nuestro interés legítimo en proteger la plataforma.',
        ],
      },
      {
        heading: 'Servicios de terceros',
        body: [
          'La información de las películas procede de The Movie Database (TMDB), OMDb y Watchmode. Estas consultas se hacen desde nuestro servidor: no enviamos tus datos personales a esos servicios, solo identificadores o términos de búsqueda de películas.',
          'La hemeroteca incrusta el visor de Internet Archive (archive.org). Al abrir un número, tu navegador se conecta a archive.org, que aplica su propia política de privacidad.',
          'Si inicias sesión con Google o GitHub, esos proveedores nos facilitan los datos básicos de tu perfil (nombre y correo) según su propia política.',
        ],
      },
      {
        heading: 'Cookies',
        body: [
          'Usamos una única cookie técnica de sesión, imprescindible para mantener tu inicio de sesión. No usamos cookies de publicidad ni de analítica.',
          'Tu preferencia de tema (claro/oscuro) se guarda localmente en tu navegador (localStorage), no en una cookie.',
        ],
      },
      {
        heading: 'Conservación',
        body: [
          'Conservamos tus datos mientras tu cuenta esté activa. Si eliminas tu cuenta, borramos tus datos asociados (lista, valoraciones, preferencias y sesiones).',
        ],
      },
      {
        heading: 'Tus derechos',
        body: [
          'Puedes acceder, rectificar o eliminar tus datos, así como solicitar su portabilidad u oponerte a su tratamiento. Para ejercerlos, escríbenos a ' +
            CONTACT_EMAIL +
            '.',
          'Si resides en la UE, también puedes reclamar ante la autoridad de protección de datos de tu país.',
        ],
      },
      {
        heading: 'Cambios en esta política',
        body: [
          'Podemos actualizar esta política. Publicaremos siempre la versión vigente en esta página, con su fecha de última actualización.',
        ],
      },
    ],
  },
  en: {
    title: 'Privacy Policy',
    updated: 'Last updated',
    date: DATE_EN,
    intro:
      'This policy explains what personal data we process at Cine Archive, why, and what rights you have. Cine Archive is an independent editorial project with no advertising and no trackers.',
    sections: [
      {
        heading: 'Data controller',
        body: [
          `The operator of this site manages the data described here. For any privacy enquiry, write to ${CONTACT_EMAIL}.`,
        ],
      },
      {
        heading: 'What we collect',
        body: [
          'Account data: your name, your email and a hashed version of your password. We never store your password in plain text.',
          'Service data: your film list (saved, seen, favourite), your ratings and notes, and your preferences (favourite genres and directors, language and light/dark theme).',
          'Minimal technical data: a session cookie to keep you signed in, and temporary in-memory records to rate-limit abuse by IP address.',
        ],
      },
      {
        heading: 'How we use it',
        body: [
          'To create and maintain your account, store your list and preferences, and generate your personalised recommendations.',
          'To protect the service against abuse and keep it available.',
          'We do not use your data for advertising, we do not sell it, and we do no profiling beyond film recommendations within the site itself.',
        ],
      },
      {
        heading: 'Legal basis',
        body: [
          'We process your data to deliver the service you request when signing up (contractual necessity) and, for security, under our legitimate interest in protecting the platform.',
        ],
      },
      {
        heading: 'Third-party services',
        body: [
          'Film information comes from The Movie Database (TMDB), OMDb and Watchmode. These queries run from our server: we do not send your personal data to them, only film identifiers or search terms.',
          'The periodicals section embeds the Internet Archive viewer (archive.org). When you open an issue, your browser connects to archive.org, which applies its own privacy policy.',
          'If you sign in with Google or GitHub, those providers share basic profile data (name and email) with us under their own policies.',
        ],
      },
      {
        heading: 'Cookies',
        body: [
          'We use a single technical session cookie, essential to keep you signed in. We use no advertising or analytics cookies.',
          'Your theme preference (light/dark) is stored locally in your browser (localStorage), not in a cookie.',
        ],
      },
      {
        heading: 'Retention',
        body: [
          'We keep your data while your account is active. If you delete your account, we erase your associated data (list, ratings, preferences and sessions).',
        ],
      },
      {
        heading: 'Your rights',
        body: [
          'You may access, rectify or delete your data, and request its portability or object to its processing. To exercise these, contact us at ' +
            CONTACT_EMAIL +
            '.',
          'If you live in the EU, you may also lodge a complaint with your national data protection authority.',
        ],
      },
      {
        heading: 'Changes to this policy',
        body: [
          'We may update this policy. The current version will always be published on this page, with its last-updated date.',
        ],
      },
    ],
  },
};

export const terms: Record<'es' | 'en', LegalDoc> = {
  es: {
    title: 'Términos y Condiciones',
    updated: 'Última actualización',
    date: DATE_ES,
    intro:
      'Estos términos regulan el uso de Cine Archive. Al usar el sitio o crear una cuenta, aceptas estas condiciones.',
    sections: [
      {
        heading: 'El servicio',
        body: [
          'Cine Archive es un archivo editorial de cine: cataloga obras, datos e información de películas y ofrece una hemeroteca de publicaciones de dominio público. No alojamos ni distribuimos películas para su visionado.',
        ],
      },
      {
        heading: 'Tu cuenta',
        body: [
          'Eres responsable de la veracidad de los datos que facilitas y de mantener la confidencialidad de tu contraseña. Debes ser mayor de edad o contar con autorización para registrarte.',
          'Puedes eliminar tu cuenta en cualquier momento; con ello se borran tus datos asociados.',
        ],
      },
      {
        heading: 'Uso aceptable',
        body: [
          'No puedes usar el sitio para fines ilícitos, intentar vulnerar su seguridad, automatizar peticiones de forma abusiva ni sobrecargar el servicio.',
          'Nos reservamos el derecho de suspender cuentas que incumplan estas condiciones.',
        ],
      },
      {
        heading: 'Contenido de terceros',
        body: [
          'Los datos de películas se obtienen de The Movie Database (TMDB), OMDb y Watchmode, cada uno con sus propios términos. Este producto usa la API de TMDB pero no está avalado ni certificado por TMDB.',
          'Las revistas y periódicos históricos se muestran a través de Internet Archive (Media History Digital Library) y son, en su mayoría, de dominio público. Las revistas actuales se enlazan a su sitio oficial y pertenecen a sus respectivos editores.',
        ],
      },
      {
        heading: 'Propiedad intelectual',
        body: [
          'Los textos editoriales propios del sitio y su diseño pertenecen a Cine Archive. Las marcas, carteles e imágenes de películas pertenecen a sus titulares y se usan con fines informativos.',
        ],
      },
      {
        heading: 'Sin garantías',
        body: [
          'El servicio se ofrece "tal cual", sin garantía de disponibilidad continua ni de exactitud de los datos de terceros. No nos hacemos responsables de daños derivados del uso del sitio en la medida que permita la ley.',
        ],
      },
      {
        heading: 'Cambios',
        body: [
          'Podemos modificar estos términos. La versión vigente se publicará en esta página con su fecha. El uso continuado del sitio implica la aceptación de los cambios.',
        ],
      },
      {
        heading: 'Legislación aplicable',
        body: [
          'Estos términos se rigen por la legislación española. Para cualquier cuestión puedes escribir a ' +
            CONTACT_EMAIL +
            '.',
        ],
      },
    ],
  },
  en: {
    title: 'Terms & Conditions',
    updated: 'Last updated',
    date: DATE_EN,
    intro:
      'These terms govern the use of Cine Archive. By using the site or creating an account, you accept these conditions.',
    sections: [
      {
        heading: 'The service',
        body: [
          'Cine Archive is an editorial film archive: it catalogues works, data and film information and offers a library of public-domain periodicals. We do not host or distribute films for viewing.',
        ],
      },
      {
        heading: 'Your account',
        body: [
          'You are responsible for the accuracy of the data you provide and for keeping your password confidential. You must be of legal age or have authorisation to register.',
          'You may delete your account at any time; doing so erases your associated data.',
        ],
      },
      {
        heading: 'Acceptable use',
        body: [
          'You may not use the site for unlawful purposes, attempt to breach its security, automate requests abusively, or overload the service.',
          'We reserve the right to suspend accounts that breach these conditions.',
        ],
      },
      {
        heading: 'Third-party content',
        body: [
          'Film data is sourced from The Movie Database (TMDB), OMDb and Watchmode, each with its own terms. This product uses the TMDB API but is not endorsed or certified by TMDB.',
          'Historical magazines and newspapers are shown via the Internet Archive (Media History Digital Library) and are mostly in the public domain. Current journals are linked to their official sites and belong to their respective publishers.',
        ],
      },
      {
        heading: 'Intellectual property',
        body: [
          "The site's own editorial texts and design belong to Cine Archive. Film trademarks, posters and images belong to their owners and are used for informational purposes.",
        ],
      },
      {
        heading: 'No warranty',
        body: [
          'The service is provided "as is", with no guarantee of continuous availability or of the accuracy of third-party data. We are not liable for damages arising from use of the site to the extent permitted by law.',
        ],
      },
      {
        heading: 'Changes',
        body: [
          'We may amend these terms. The current version will be published on this page with its date. Continued use of the site implies acceptance of the changes.',
        ],
      },
      {
        heading: 'Governing law',
        body: [
          'These terms are governed by Spanish law. For any question, write to ' + CONTACT_EMAIL + '.',
        ],
      },
    ],
  },
};
