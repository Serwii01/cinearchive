/**
 * Textos legales e informativos (Privacidad, Accesibilidad, Términos), en los
 * cinco idiomas de la interfaz (es/en/gl/eu/ca). Plantilla honesta basada en lo
 * que la app realmente hace. Revísala con un profesional antes de un uso
 * comercial serio; las versiones en gallego, euskera y catalán son traducciones
 * no revisadas jurídicamente.
 *
 * Cambia CONTACT_EMAIL por tu dirección de contacto real.
 */
import type { Lang } from '../i18n/ui';

export const CONTACT_EMAIL = 'sfmrbb@gmail.com / contacto@cinearchive.es';

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

/** Etiqueta "Última actualización" por idioma. */
const UPDATED: Record<Lang, string> = {
  es: 'Última actualización',
  en: 'Last updated',
  gl: 'Última actualización',
  eu: 'Azken eguneratzea',
  ca: 'Última actualització',
};

/** Fecha de los textos legales (privacidad y términos). */
const DATE_LEGAL: Record<Lang, string> = {
  es: '30 de junio de 2026',
  en: 'June 30, 2026',
  gl: '30 de xuño de 2026',
  eu: '2026ko ekainaren 30a',
  ca: '30 de juny de 2026',
};

/** Fecha de la declaración de accesibilidad (revisada al añadir la capa multilingüe). */
const DATE_ACCESS: Record<Lang, string> = {
  es: '3 de julio de 2026',
  en: 'July 3, 2026',
  gl: '3 de xullo de 2026',
  eu: '2026ko uztailaren 3a',
  ca: '3 de juliol de 2026',
};

export const privacy: Record<Lang, LegalDoc> = {
  es: {
    title: 'Política de Privacidad',
    updated: UPDATED.es,
    date: DATE_LEGAL.es,
    intro:
      'Esta política explica qué datos personales tratamos en Cine Archive, con qué fin y qué derechos tienes. Cine Archive es un proyecto editorial independiente, sin publicidad ni rastreadores.',
    sections: [
      {
        heading: 'Responsable del tratamiento',
        body: [
          `El responsable del tratamiento es Sergio Fernández Morales, titular y operador de cinearchive.es. Para cualquier consulta sobre privacidad o para ejercer tus derechos, puedes escribir a ${CONTACT_EMAIL}.`,
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
          'Para enviar correos transaccionales (como el de restablecer la contraseña) usamos Resend como proveedor de envío; solo trata tu dirección de correo y el contenido del mensaje, en nuestro nombre.',
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
    updated: UPDATED.en,
    date: DATE_LEGAL.en,
    intro:
      'This policy explains what personal data we process at Cine Archive, why, and what rights you have. Cine Archive is an independent editorial project with no advertising and no trackers.',
    sections: [
      {
        heading: 'Data controller',
        body: [
          `The data controller is Sergio Fernández Morales, owner and operator of cinearchive.es. For any privacy enquiry or to exercise your rights, write to ${CONTACT_EMAIL}.`,
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
          'To send transactional emails (such as the password reset) we use Resend as our delivery provider; it processes only your email address and the message content, on our behalf.',
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
  gl: {
    title: 'Política de Privacidade',
    updated: UPDATED.gl,
    date: DATE_LEGAL.gl,
    intro:
      'Esta política explica que datos persoais tratamos en Cine Archive, con que fin e que dereitos tes. Cine Archive é un proxecto editorial independente, sen publicidade nin rastrexadores.',
    sections: [
      {
        heading: 'Responsable do tratamento',
        body: [
          `O responsable do tratamento é Sergio Fernández Morales, titular e operador de cinearchive.es. Para calquera consulta sobre privacidade ou para exercer os teus dereitos, podes escribir a ${CONTACT_EMAIL}.`,
        ],
      },
      {
        heading: 'Que datos recollemos',
        body: [
          'Datos de conta: o teu nome, o teu correo electrónico e unha versión cifrada (hash) do teu contrasinal. Nunca almacenamos o contrasinal en claro.',
          'Datos de uso do servizo: a túa lista de películas (gardadas, vistas, favoritas), as túas valoracións e notas, e as túas preferencias (xéneros e directores favoritos, idioma e tema claro/escuro).',
          'Datos técnicos mínimos: unha cookie de sesión para manterte identificado e rexistros temporais en memoria para limitar o abuso (rate limiting) por enderezo IP.',
        ],
      },
      {
        heading: 'Para que os usamos',
        body: [
          'Para crear e manter a túa conta, gardar a túa lista e preferencias, e xerar as túas recomendacións personalizadas.',
          'Para protexer o servizo fronte a usos abusivos e mantelo dispoñible.',
          'Non usamos os teus datos con fins publicitarios, non os vendemos e non facemos perfilado máis alá das recomendacións de películas dentro do propio sitio.',
        ],
      },
      {
        heading: 'Base legal',
        body: [
          'Tratamos os teus datos para executar o servizo que solicitas ao rexistrarte (relación contractual) e, no relativo á seguranza, polo noso interese lexítimo en protexer a plataforma.',
        ],
      },
      {
        heading: 'Servizos de terceiros',
        body: [
          'A información das películas procede de The Movie Database (TMDB), OMDb e Watchmode. Estas consultas fanse desde o noso servidor: non enviamos os teus datos persoais a eses servizos, só identificadores ou termos de busca de películas.',
          'A hemeroteca incrusta o visor de Internet Archive (archive.org). Ao abrir un número, o teu navegador conéctase a archive.org, que aplica a súa propia política de privacidade.',
          'Se inicias sesión con Google ou GitHub, eses provedores facilítannos os datos básicos do teu perfil (nome e correo) segundo a súa propia política.',
          'Para enviar correos transaccionais (como o de restablecer o contrasinal) usamos Resend como provedor de envío; só trata o teu enderezo de correo e o contido da mensaxe, no noso nome.',
        ],
      },
      {
        heading: 'Cookies',
        body: [
          'Usamos unha única cookie técnica de sesión, imprescindible para manter o teu inicio de sesión. Non usamos cookies de publicidade nin de analítica.',
          'A túa preferencia de tema (claro/escuro) gárdase localmente no teu navegador (localStorage), non nunha cookie.',
        ],
      },
      {
        heading: 'Conservación',
        body: [
          'Conservamos os teus datos mentres a túa conta estea activa. Se eliminas a túa conta, borramos os teus datos asociados (lista, valoracións, preferencias e sesións).',
        ],
      },
      {
        heading: 'Os teus dereitos',
        body: [
          'Podes acceder, rectificar ou eliminar os teus datos, así como solicitar a súa portabilidade ou oporte ao seu tratamento. Para exercelos, escríbenos a ' +
            CONTACT_EMAIL +
            '.',
          'Se resides na UE, tamén podes reclamar ante a autoridade de protección de datos do teu país.',
        ],
      },
      {
        heading: 'Cambios nesta política',
        body: [
          'Podemos actualizar esta política. Publicaremos sempre a versión vixente nesta páxina, coa súa data de última actualización.',
        ],
      },
    ],
  },
  eu: {
    title: 'Pribatutasun Politika',
    updated: UPDATED.eu,
    date: DATE_LEGAL.eu,
    intro:
      'Politika honek azaltzen du zein datu pertsonal tratatzen ditugun Cine Archive-n, zertarako eta zein eskubide dituzun. Cine Archive proiektu editorial independentea da, publizitaterik eta jarraipen-tresnarik gabea.',
    sections: [
      {
        heading: 'Tratamenduaren arduraduna',
        body: [
          `Tratamenduaren arduraduna Sergio Fernández Morales da, cinearchive.es-en titularra eta operadorea. Pribatutasunari buruzko edozein galderatarako edo zure eskubideak baliatzeko, idatzi ${CONTACT_EMAIL} helbidera.`,
        ],
      },
      {
        heading: 'Zein datu biltzen ditugun',
        body: [
          'Kontuaren datuak: zure izena, zure helbide elektronikoa eta pasahitzaren bertsio zifratua (hash-a). Ez dugu inoiz pasahitza testu argian gordetzen.',
          'Zerbitzuaren erabilera-datuak: zure filmen zerrenda (gordeak, ikusiak, gogokoak), zure balorazioak eta oharrak, eta zure hobespenak (gogoko generoak eta zuzendariak, hizkuntza eta gai argia/iluna).',
          'Gutxieneko datu teknikoak: saioari eusteko cookie bat eta memorian aldi baterako erregistroak, IP helbidearen bidez gehiegikeria mugatzeko (rate limiting).',
        ],
      },
      {
        heading: 'Zertarako erabiltzen ditugun',
        body: [
          'Zure kontua sortu eta mantentzeko, zure zerrenda eta hobespenak gordetzeko, eta zure gomendio pertsonalizatuak sortzeko.',
          'Zerbitzua gehiegikerietatik babesteko eta erabilgarri mantentzeko.',
          'Ez ditugu zure datuak publizitate-helburuetarako erabiltzen, ez ditugu saltzen eta ez dugu profilik egiten, gunearen barruko filmen gomendioetatik harago.',
        ],
      },
      {
        heading: 'Oinarri legala',
        body: [
          'Zure datuak izena ematean eskatzen duzun zerbitzua betetzeko tratatzen ditugu (kontratu-harremana) eta, segurtasunari dagokionez, plataforma babesteko dugun interes legitimoagatik.',
        ],
      },
      {
        heading: 'Hirugarrenen zerbitzuak',
        body: [
          'Filmen informazioa The Movie Database (TMDB), OMDb eta Watchmode-tik dator. Kontsulta horiek gure zerbitzaritik egiten dira: ez dizkiegu zure datu pertsonalak bidaltzen, filmen identifikatzaileak edo bilaketa-terminoak baizik.',
          'Hemerotekak Internet Archive-ren (archive.org) ikustailea txertatzen du. Ale bat irekitzean, zure nabigatzailea archive.org-era konektatzen da, eta hark bere pribatutasun-politika aplikatzen du.',
          'Google edo GitHub-ekin saioa hasten baduzu, hornitzaile horiek zure profileko oinarrizko datuak (izena eta korreoa) ematen dizkigute beren politikaren arabera.',
          'Posta transakzionalak bidaltzeko (pasahitza berrezartzekoa, adibidez) Resend erabiltzen dugu bidalketa-hornitzaile gisa; zure posta-helbidea eta mezuaren edukia soilik tratatzen ditu, gure izenean.',
        ],
      },
      {
        heading: 'Cookieak',
        body: [
          'Saioko cookie tekniko bakarra erabiltzen dugu, zure saioa mantentzeko ezinbestekoa. Ez dugu publizitate- edo analitika-cookierik erabiltzen.',
          'Zure gaiaren hobespena (argia/iluna) zure nabigatzailean gordetzen da lokalean (localStorage), ez cookie batean.',
        ],
      },
      {
        heading: 'Kontserbazioa',
        body: [
          'Zure datuak zure kontua aktibo dagoen bitartean gordetzen ditugu. Zure kontua ezabatzen baduzu, hari lotutako datuak ezabatzen ditugu (zerrenda, balorazioak, hobespenak eta saioak).',
        ],
      },
      {
        heading: 'Zure eskubideak',
        body: [
          'Zure datuak atzitu, zuzendu edo ezaba ditzakezu, baita haien eramangarritasuna eskatu edo haien tratamenduaren aurka egin ere. Baliatzeko, idatzi ' +
            CONTACT_EMAIL +
            ' helbidera.',
          'EBn bizi bazara, zure herrialdeko datuak babesteko agintaritzaren aurrean ere erreklama dezakezu.',
        ],
      },
      {
        heading: 'Politika honetako aldaketak',
        body: [
          'Politika hau egunera dezakegu. Une bakoitzean indarrean dagoen bertsioa orrialde honetan argitaratuko dugu beti, azken eguneratze-datarekin.',
        ],
      },
    ],
  },
  ca: {
    title: 'Política de Privadesa',
    updated: UPDATED.ca,
    date: DATE_LEGAL.ca,
    intro:
      'Aquesta política explica quines dades personals tractem a Cine Archive, amb quina finalitat i quins drets tens. Cine Archive és un projecte editorial independent, sense publicitat ni rastrejadors.',
    sections: [
      {
        heading: 'Responsable del tractament',
        body: [
          `El responsable del tractament és Sergio Fernández Morales, titular i operador de cinearchive.es. Per a qualsevol consulta sobre privadesa o per exercir els teus drets, pots escriure a ${CONTACT_EMAIL}.`,
        ],
      },
      {
        heading: 'Quines dades recollim',
        body: [
          'Dades de compte: el teu nom, el teu correu electrònic i una versió xifrada (hash) de la teva contrasenya. Mai no emmagatzemem la contrasenya en clar.',
          "Dades d'ús del servei: la teva llista de pel·lícules (desades, vistes, preferides), les teves valoracions i notes, i les teves preferències (gèneres i directors preferits, idioma i tema clar/fosc).",
          "Dades tècniques mínimes: una galeta de sessió per mantenir-te identificat i registres temporals en memòria per limitar l'abús (rate limiting) per adreça IP.",
        ],
      },
      {
        heading: 'Per a què les fem servir',
        body: [
          'Per crear i mantenir el teu compte, desar la teva llista i preferències, i generar les teves recomanacions personalitzades.',
          "Per protegir el servei davant d'usos abusius i mantenir-lo disponible.",
          'No fem servir les teves dades amb finalitats publicitàries, no les venem i no fem perfilat més enllà de les recomanacions de pel·lícules dins del mateix lloc.',
        ],
      },
      {
        heading: 'Base legal',
        body: [
          'Tractem les teves dades per executar el servei que sol·licites en registrar-te (relació contractual) i, pel que fa a la seguretat, pel nostre interès legítim a protegir la plataforma.',
        ],
      },
      {
        heading: 'Serveis de tercers',
        body: [
          'La informació de les pel·lícules prové de The Movie Database (TMDB), OMDb i Watchmode. Aquestes consultes es fan des del nostre servidor: no enviem les teves dades personals a aquests serveis, només identificadors o termes de cerca de pel·lícules.',
          "L'hemeroteca incrusta el visor d'Internet Archive (archive.org). En obrir un número, el teu navegador es connecta a archive.org, que aplica la seva pròpia política de privadesa.",
          'Si inicies sessió amb Google o GitHub, aquests proveïdors ens faciliten les dades bàsiques del teu perfil (nom i correu) segons la seva pròpia política.',
          "Per enviar correus transaccionals (com el de restablir la contrasenya) fem servir Resend com a proveïdor d'enviament; només tracta la teva adreça de correu i el contingut del missatge, en nom nostre.",
        ],
      },
      {
        heading: 'Galetes',
        body: [
          'Fem servir una única galeta tècnica de sessió, imprescindible per mantenir el teu inici de sessió. No fem servir galetes de publicitat ni d’analítica.',
          'La teva preferència de tema (clar/fosc) es desa localment al teu navegador (localStorage), no en una galeta.',
        ],
      },
      {
        heading: 'Conservació',
        body: [
          'Conservem les teves dades mentre el teu compte estigui actiu. Si elimines el teu compte, esborrem les teves dades associades (llista, valoracions, preferències i sessions).',
        ],
      },
      {
        heading: 'Els teus drets',
        body: [
          'Pots accedir, rectificar o eliminar les teves dades, així com sol·licitar-ne la portabilitat o oposar-te al seu tractament. Per exercir-los, escriu-nos a ' +
            CONTACT_EMAIL +
            '.',
          "Si resideixes a la UE, també pots reclamar davant l'autoritat de protecció de dades del teu país.",
        ],
      },
      {
        heading: 'Canvis en aquesta política',
        body: [
          'Podem actualitzar aquesta política. Publicarem sempre la versió vigent en aquesta pàgina, amb la seva data de darrera actualització.',
        ],
      },
    ],
  },
};

export const accessibility: Record<Lang, LegalDoc> = {
  es: {
    title: 'Accesibilidad',
    updated: UPDATED.es,
    date: DATE_ACCESS.es,
    intro:
      'Cine Archive aspira a ser un archivo abierto a todo el mundo. La accesibilidad forma parte de esa idea de lo público: un sitio que cualquiera pueda leer y usar, con o sin ayudas técnicas. Esta declaración describe lo que hacemos, lo que sabemos que aún falta y cómo avisarnos.',
    sections: [
      {
        heading: 'Nuestro compromiso',
        body: [
          'Trabajamos para acercarnos al nivel AA de las Pautas de Accesibilidad para el Contenido Web (WCAG 2.1). Es un objetivo de mejora continua, no una certificación: revisamos la accesibilidad al añadir funciones nuevas.',
        ],
      },
      {
        heading: 'Qué hemos tenido en cuenta',
        body: [
          'HTML semántico: encabezados jerárquicos, regiones (cabecera, navegación, principal, pie) y listas reales, para que los lectores de pantalla anuncien la estructura.',
          'Navegación con teclado: puedes recorrer enlaces, botones y formularios con el tabulador, con un indicador de foco visible. No hay trampas de teclado.',
          'Texto alternativo en carteles y portadas, y etiquetas (aria-label) en los controles que no llevan texto visible.',
          'Tema claro y oscuro, y un diseño con tipografía amplia pensado para ofrecer buen contraste en ambos modos.',
          'Diseño adaptable (responsive) que funciona con zoom y en pantallas pequeñas sin pérdida de contenido.',
          'Respetamos «prefers-reduced-motion»: si tu sistema pide menos animación, reducimos los movimientos.',
          'Las funciones sociales (perfiles, listas, reseñas) siguen los mismos principios de HTML semántico y navegación por teclado.',
        ],
      },
      {
        heading: 'Idiomas',
        body: [
          'La interfaz y las páginas informativas y legales de Cine Archive están disponibles en cinco idiomas: español, inglés, gallego, euskera y catalán.',
          'Los datos del catálogo que provienen de The Movie Database (TMDB) —sinopsis y biografías del reparto y del equipo— y algunas descripciones de la hemeroteca solo están disponibles en español e inglés. Cuando navegas en gallego, euskera o catalán, ese contenido concreto se muestra en español.',
          'Ampliamos la cobertura de idiomas de forma progresiva.',
        ],
      },
      {
        heading: 'Limitaciones conocidas',
        body: [
          'El visor de la hemeroteca se incrusta desde Internet Archive (archive.org). Su accesibilidad depende de ese servicio y queda fuera de nuestro control.',
          'Los tráileres se reproducen mediante el reproductor incrustado de YouTube, sujeto a la accesibilidad de YouTube.',
          'Aún no hemos realizado una auditoría externa completa, así que pueden quedar problemas que desconocemos. Por eso tu aviso nos ayuda.',
        ],
      },
      {
        heading: 'Cómo avisarnos',
        body: [
          'Si encuentras una barrera de accesibilidad —algo que no puedes leer, enfocar o usar— escríbenos a ' +
            CONTACT_EMAIL +
            '. Indícanos la página, qué intentabas hacer y, si puedes, el navegador o la ayuda técnica que usas. Intentamos responder y corregir lo antes posible.',
        ],
      },
    ],
  },
  en: {
    title: 'Accessibility',
    updated: UPDATED.en,
    date: DATE_ACCESS.en,
    intro:
      'Cine Archive aims to be an archive open to everyone. Accessibility is part of that idea of the public good: a site anyone can read and use, with or without assistive technology. This statement describes what we do, what we know is still missing, and how to tell us.',
    sections: [
      {
        heading: 'Our commitment',
        body: [
          'We work towards level AA of the Web Content Accessibility Guidelines (WCAG 2.1). This is an ongoing goal, not a certification: we review accessibility whenever we add new features.',
        ],
      },
      {
        heading: 'What we have considered',
        body: [
          'Semantic HTML: hierarchical headings, landmark regions (header, navigation, main, footer) and real lists, so screen readers can announce the structure.',
          'Keyboard navigation: you can reach links, buttons and forms with the Tab key, with a visible focus indicator. There are no keyboard traps.',
          'Alternative text on posters and covers, and labels (aria-label) on controls that have no visible text.',
          'Light and dark themes, and a generous typographic design intended to keep good contrast in both modes.',
          'Responsive layout that works with zoom and on small screens without loss of content.',
          'We honour «prefers-reduced-motion»: if your system asks for less animation, we reduce motion.',
          'The social features (profiles, lists, reviews) follow the same principles of semantic HTML and keyboard navigation.',
        ],
      },
      {
        heading: 'Languages',
        body: [
          'The interface and the informational and legal pages of Cine Archive are available in five languages: Spanish, English, Galician, Basque and Catalan.',
          'Catalogue data coming from The Movie Database (TMDB) —synopses and cast and crew biographies— and some periodicals descriptions are available only in Spanish and English. When you browse in Galician, Basque or Catalan, that specific content is shown in Spanish.',
          'We are expanding language coverage progressively.',
        ],
      },
      {
        heading: 'Known limitations',
        body: [
          'The periodicals viewer is embedded from the Internet Archive (archive.org). Its accessibility depends on that service and is outside our control.',
          'Trailers play through the embedded YouTube player, subject to YouTube’s own accessibility.',
          'We have not yet carried out a full external audit, so issues we are not aware of may remain. That is why your report helps.',
        ],
      },
      {
        heading: 'How to tell us',
        body: [
          'If you hit an accessibility barrier —something you cannot read, focus or use— write to ' +
            CONTACT_EMAIL +
            '. Tell us the page, what you were trying to do and, if you can, the browser or assistive technology you use. We try to respond and fix things as soon as possible.',
        ],
      },
    ],
  },
  gl: {
    title: 'Accesibilidade',
    updated: UPDATED.gl,
    date: DATE_ACCESS.gl,
    intro:
      'Cine Archive aspira a ser un arquivo aberto a todo o mundo. A accesibilidade forma parte desa idea do público: un sitio que calquera poida ler e usar, con ou sen axudas técnicas. Esta declaración describe o que facemos, o que sabemos que aínda falta e como avisarnos.',
    sections: [
      {
        heading: 'O noso compromiso',
        body: [
          'Traballamos para achegarnos ao nivel AA das Pautas de Accesibilidade para o Contido Web (WCAG 2.1). É un obxectivo de mellora continua, non unha certificación: revisamos a accesibilidade ao engadir funcións novas.',
        ],
      },
      {
        heading: 'Que tivemos en conta',
        body: [
          'HTML semántico: encabezados xerárquicos, rexións (cabeceira, navegación, principal, pé) e listas reais, para que os lectores de pantalla anuncien a estrutura.',
          'Navegación co teclado: podes percorrer ligazóns, botóns e formularios co tabulador, cun indicador de foco visible. Non hai trampas de teclado.',
          'Texto alternativo en carteis e portadas, e etiquetas (aria-label) nos controis que non levan texto visible.',
          'Tema claro e escuro, e un deseño con tipografía ampla pensado para ofrecer bo contraste en ambos os modos.',
          'Deseño adaptable (responsive) que funciona con zoom e en pantallas pequenas sen perda de contido.',
          'Respectamos «prefers-reduced-motion»: se o teu sistema pide menos animación, reducimos os movementos.',
          'As funcións sociais (perfís, listas, recensións) seguen os mesmos principios de HTML semántico e navegación por teclado.',
        ],
      },
      {
        heading: 'Idiomas',
        body: [
          'A interface e as páxinas informativas e legais de Cine Archive están dispoñibles en cinco idiomas: español, inglés, galego, éuscaro e catalán.',
          'Os datos do catálogo que proveñen de The Movie Database (TMDB) —sinopses e biografías do reparto e do equipo— e algunhas descricións da hemeroteca só están dispoñibles en español e inglés. Cando navegas en galego, éuscaro ou catalán, ese contido concreto móstrase en español.',
          'Ampliamos a cobertura de idiomas de forma progresiva.',
        ],
      },
      {
        heading: 'Limitacións coñecidas',
        body: [
          'O visor da hemeroteca incrústase desde Internet Archive (archive.org). A súa accesibilidade depende dese servizo e queda fóra do noso control.',
          'Os tráilers reprodúcense mediante o reprodutor incrustado de YouTube, suxeito á accesibilidade de YouTube.',
          'Aínda non realizamos unha auditoría externa completa, así que poden quedar problemas que descoñecemos. Por iso o teu aviso axúdanos.',
        ],
      },
      {
        heading: 'Como avisarnos',
        body: [
          'Se atopas unha barreira de accesibilidade —algo que non podes ler, enfocar ou usar— escríbenos a ' +
            CONTACT_EMAIL +
            '. Indícanos a páxina, que intentabas facer e, se podes, o navegador ou a axuda técnica que usas. Intentamos responder e corrixir o antes posible.',
        ],
      },
    ],
  },
  eu: {
    title: 'Irisgarritasuna',
    updated: UPDATED.eu,
    date: DATE_ACCESS.eu,
    intro:
      'Cine Archive-k mundu guztiari irekitako artxibo bat izan nahi du. Irisgarritasuna ideia publiko horren parte da: edonork irakur eta erabil dezakeen gunea, laguntza teknikoekin edo gabe. Adierazpen honek deskribatzen du zer egiten dugun, oraindik zer falta den dakiguna eta nola abisatu.',
    sections: [
      {
        heading: 'Gure konpromisoa',
        body: [
          'Web Edukirako Irisgarritasun Jarraibideen (WCAG 2.1) AA mailara hurbiltzeko lan egiten dugu. Etengabeko hobekuntza-helburua da, ez ziurtagiria: funtzio berriak gehitzean irisgarritasuna berrikusten dugu.',
        ],
      },
      {
        heading: 'Zer izan dugun kontuan',
        body: [
          'HTML semantikoa: goiburu hierarkikoak, eskualdeak (goiburua, nabigazioa, edukia, oina) eta benetako zerrendak, pantaila-irakurgailuek egitura iragar dezaten.',
          'Teklatu bidezko nabigazioa: estekak, botoiak eta inprimakiak tabuladorearekin zeharka ditzakezu, foku-adierazle ikusgai batekin. Ez dago teklatu-tranparik.',
          'Testu alternatiboa kartel eta azaletan, eta etiketak (aria-label) testu ikusgairik ez duten kontroletan.',
          'Gai argia eta iluna, eta tipografia zabaleko diseinua, bi moduetan kontraste ona eskaintzeko pentsatua.',
          'Diseinu moldagarria (responsive), zoomarekin eta pantaila txikietan edukirik galdu gabe funtzionatzen duena.',
          '«prefers-reduced-motion» errespetatzen dugu: zure sistemak animazio gutxiago eskatzen badu, mugimenduak murrizten ditugu.',
          'Funtzio sozialek (profilak, zerrendak, iruzkinak) HTML semantikoaren eta teklatu bidezko nabigazioaren printzipio berak jarraitzen dituzte.',
        ],
      },
      {
        heading: 'Hizkuntzak',
        body: [
          'Cine Archive-ren interfazea eta orrialde informatibo eta legalak bost hizkuntzatan daude eskuragarri: gaztelania, ingelesa, galiziera, euskara eta katalana.',
          'The Movie Database-tik (TMDB) datozen katalogoko datuak —sinopsiak eta aktoreen eta taldearen biografiak— eta hemerotekako deskribapen batzuk gaztelaniaz eta ingelesez baino ez daude eskuragarri. Galizieraz, euskaraz edo katalanez nabigatzen duzunean, eduki hori gaztelaniaz erakusten da.',
          'Hizkuntza-estaldura pixkanaka zabaltzen ari gara.',
        ],
      },
      {
        heading: 'Muga ezagunak',
        body: [
          'Hemerotekaren ikustailea Internet Archive-tik (archive.org) txertatzen da. Haren irisgarritasuna zerbitzu horren mende dago eta gure kontroletik kanpo geratzen da.',
          'Trailerrak YouTuberen ikustaile txertatuaren bidez erreproduzitzen dira, YouTuberen irisgarritasunaren mende.',
          'Oraindik ez dugu kanpoko auditoria osorik egin, beraz, ezagutzen ez ditugun arazoak gera daitezke. Horregatik laguntzen digu zure abisuak.',
        ],
      },
      {
        heading: 'Nola abisatu',
        body: [
          'Irisgarritasun-oztopo bat aurkitzen baduzu —irakurri, fokatu edo erabili ezin duzun zerbait— idatzi ' +
            CONTACT_EMAIL +
            ' helbidera. Adierazi orrialdea, zer egiten saiatzen ari zinen eta, ahal baduzu, erabiltzen duzun nabigatzailea edo laguntza teknikoa. Ahalik eta lasterren erantzun eta konpontzen saiatzen gara.',
        ],
      },
    ],
  },
  ca: {
    title: 'Accessibilitat',
    updated: UPDATED.ca,
    date: DATE_ACCESS.ca,
    intro:
      "Cine Archive aspira a ser un arxiu obert a tothom. L'accessibilitat forma part d'aquesta idea d'allò públic: un lloc que qualsevol pugui llegir i utilitzar, amb o sense ajudes tècniques. Aquesta declaració descriu què fem, què sabem que encara falta i com avisar-nos.",
    sections: [
      {
        heading: 'El nostre compromís',
        body: [
          "Treballem per acostar-nos al nivell AA de les Pautes d'Accessibilitat per al Contingut Web (WCAG 2.1). És un objectiu de millora contínua, no una certificació: revisem l'accessibilitat en afegir funcions noves.",
        ],
      },
      {
        heading: 'Què hem tingut en compte',
        body: [
          "HTML semàntic: encapçalaments jeràrquics, regions (capçalera, navegació, principal, peu) i llistes reals, perquè els lectors de pantalla anunciïn l'estructura.",
          'Navegació amb teclat: pots recórrer enllaços, botons i formularis amb el tabulador, amb un indicador de focus visible. No hi ha paranys de teclat.',
          'Text alternatiu en cartells i portades, i etiquetes (aria-label) als controls que no porten text visible.',
          'Tema clar i fosc, i un disseny amb tipografia àmplia pensat per oferir bon contrast en tots dos modes.',
          'Disseny adaptable (responsive) que funciona amb zoom i en pantalles petites sense pèrdua de contingut.',
          'Respectem «prefers-reduced-motion»: si el teu sistema demana menys animació, reduïm els moviments.',
          "Les funcions socials (perfils, llistes, ressenyes) segueixen els mateixos principis d'HTML semàntic i navegació per teclat.",
        ],
      },
      {
        heading: 'Idiomes',
        body: [
          'La interfície i les pàgines informatives i legals de Cine Archive estan disponibles en cinc idiomes: espanyol, anglès, gallec, basc i català.',
          'Les dades del catàleg que provenen de The Movie Database (TMDB) —sinopsis i biografies del repartiment i de l’equip— i algunes descripcions de l’hemeroteca només estan disponibles en espanyol i anglès. Quan navegues en gallec, basc o català, aquest contingut concret es mostra en espanyol.',
          "Ampliem la cobertura d'idiomes de manera progressiva.",
        ],
      },
      {
        heading: 'Limitacions conegudes',
        body: [
          "El visor de l'hemeroteca s'incrusta des d'Internet Archive (archive.org). La seva accessibilitat depèn d'aquest servei i queda fora del nostre control.",
          "Els tràilers es reprodueixen mitjançant el reproductor incrustat de YouTube, subjecte a l'accessibilitat de YouTube.",
          'Encara no hem dut a terme una auditoria externa completa, així que poden quedar problemes que desconeixem. Per això el teu avís ens ajuda.',
        ],
      },
      {
        heading: 'Com avisar-nos',
        body: [
          "Si trobes una barrera d'accessibilitat —alguna cosa que no pots llegir, enfocar o utilitzar— escriu-nos a " +
            CONTACT_EMAIL +
            ". Indica'ns la pàgina, què intentaves fer i, si pots, el navegador o l'ajuda tècnica que utilitzes. Intentem respondre i corregir com més aviat millor.",
        ],
      },
    ],
  },
};

export const terms: Record<Lang, LegalDoc> = {
  es: {
    title: 'Términos y Condiciones',
    updated: UPDATED.es,
    date: DATE_LEGAL.es,
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
    updated: UPDATED.en,
    date: DATE_LEGAL.en,
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
  gl: {
    title: 'Termos e Condicións',
    updated: UPDATED.gl,
    date: DATE_LEGAL.gl,
    intro:
      'Estes termos regulan o uso de Cine Archive. Ao usar o sitio ou crear unha conta, aceptas estas condicións.',
    sections: [
      {
        heading: 'O servizo',
        body: [
          'Cine Archive é un arquivo editorial de cine: cataloga obras, datos e información de películas e ofrece unha hemeroteca de publicacións de dominio público. Non aloxamos nin distribuímos películas para o seu visionado.',
        ],
      },
      {
        heading: 'A túa conta',
        body: [
          'Es responsable da veracidade dos datos que facilitas e de manter a confidencialidade do teu contrasinal. Debes ser maior de idade ou contar con autorización para rexistrarte.',
          'Podes eliminar a túa conta en calquera momento; con iso bórranse os teus datos asociados.',
        ],
      },
      {
        heading: 'Uso aceptable',
        body: [
          'Non podes usar o sitio para fins ilícitos, intentar vulnerar a súa seguranza, automatizar peticións de forma abusiva nin sobrecargar o servizo.',
          'Reservámonos o dereito de suspender contas que incumpran estas condicións.',
        ],
      },
      {
        heading: 'Contido de terceiros',
        body: [
          'Os datos de películas obtéñense de The Movie Database (TMDB), OMDb e Watchmode, cada un cos seus propios termos. Este produto usa a API de TMDB pero non está avalado nin certificado por TMDB.',
          'As revistas e xornais históricos móstranse a través de Internet Archive (Media History Digital Library) e son, na súa maioría, de dominio público. As revistas actuais ligan ao seu sitio oficial e pertencen aos seus respectivos editores.',
        ],
      },
      {
        heading: 'Propiedade intelectual',
        body: [
          'Os textos editoriais propios do sitio e o seu deseño pertencen a Cine Archive. As marcas, carteis e imaxes de películas pertencen aos seus titulares e úsanse con fins informativos.',
        ],
      },
      {
        heading: 'Sen garantías',
        body: [
          'O servizo ofrécese "tal cal", sen garantía de dispoñibilidade continua nin de exactitude dos datos de terceiros. Non nos facemos responsables de danos derivados do uso do sitio na medida que permita a lei.',
        ],
      },
      {
        heading: 'Cambios',
        body: [
          'Podemos modificar estes termos. A versión vixente publicarase nesta páxina coa súa data. O uso continuado do sitio implica a aceptación dos cambios.',
        ],
      },
      {
        heading: 'Lexislación aplicable',
        body: [
          'Estes termos réxense pola lexislación española. Para calquera cuestión podes escribir a ' +
            CONTACT_EMAIL +
            '.',
        ],
      },
    ],
  },
  eu: {
    title: 'Baldintzak eta Kondizioak',
    updated: UPDATED.eu,
    date: DATE_LEGAL.eu,
    intro:
      'Baldintza hauek Cine Archive-ren erabilera arautzen dute. Gunea erabiliz edo kontu bat sortuz, baldintza hauek onartzen dituzu.',
    sections: [
      {
        heading: 'Zerbitzua',
        body: [
          'Cine Archive zinemaren artxibo editorial bat da: lanak, datuak eta filmen informazioa katalogatzen ditu eta domeinu publikoko argitalpenen hemeroteka bat eskaintzen du. Ez dugu filmik ostatatzen edo banatzen ikusteko.',
        ],
      },
      {
        heading: 'Zure kontua',
        body: [
          'Ematen dituzun datuen egiazkotasunaz eta zure pasahitzaren konfidentzialtasunaz arduratzen zara. Adin nagusikoa izan behar duzu edo izena emateko baimena eduki.',
          'Zure kontua edozein unetan ezaba dezakezu; horrekin hari lotutako datuak ezabatzen dira.',
        ],
      },
      {
        heading: 'Erabilera onargarria',
        body: [
          'Ezin duzu gunea helburu ez-zilegietarako erabili, haren segurtasuna urratzen saiatu, eskaerak modu abusiboan automatizatu edo zerbitzua gainkargatu.',
          'Baldintza hauek urratzen dituzten kontuak etetzeko eskubidea gordetzen dugu.',
        ],
      },
      {
        heading: 'Hirugarrenen edukia',
        body: [
          'Filmen datuak The Movie Database (TMDB), OMDb eta Watchmode-tik lortzen dira, bakoitza bere baldintzekin. Produktu honek TMDBren APIa erabiltzen du, baina ez dago TMDBk babestua edo ziurtatua.',
          'Aldizkari eta egunkari historikoak Internet Archive-ren bidez (Media History Digital Library) erakusten dira eta, gehienak, domeinu publikokoak dira. Gaur egungo aldizkariak beren gune ofizialera estekatzen dira eta beren argitaratzaileei dagozkie.',
        ],
      },
      {
        heading: 'Jabetza intelektuala',
        body: [
          'Gunearen testu editorial propioak eta haren diseinua Cine Archive-renak dira. Filmen markak, kartelak eta irudiak beren titularrenak dira eta informazio-helburuetarako erabiltzen dira.',
        ],
      },
      {
        heading: 'Bermerik gabe',
        body: [
          'Zerbitzua "dagoen dagoenean" eskaintzen da, etengabeko erabilgarritasun-bermerik gabe eta hirugarrenen datuen zehaztasun-bermerik gabe. Ez gara gunearen erabileratik eratorritako kalteen erantzule, legeak baimentzen duen neurrian.',
        ],
      },
      {
        heading: 'Aldaketak',
        body: [
          'Baldintza hauek alda ditzakegu. Indarrean dagoen bertsioa orrialde honetan argitaratuko da bere datarekin. Gunearen erabilera jarraituak aldaketen onarpena dakar.',
        ],
      },
      {
        heading: 'Lege aplikagarria',
        body: [
          'Baldintza hauek Espainiako legediak arautzen ditu. Edozein galderatarako, idatzi ' +
            CONTACT_EMAIL +
            ' helbidera.',
        ],
      },
    ],
  },
  ca: {
    title: 'Termes i Condicions',
    updated: UPDATED.ca,
    date: DATE_LEGAL.ca,
    intro:
      "Aquests termes regulen l'ús de Cine Archive. En utilitzar el lloc o crear un compte, acceptes aquestes condicions.",
    sections: [
      {
        heading: 'El servei',
        body: [
          'Cine Archive és un arxiu editorial de cinema: cataloga obres, dades i informació de pel·lícules i ofereix una hemeroteca de publicacions de domini públic. No allotgem ni distribuïm pel·lícules per al seu visionament.',
        ],
      },
      {
        heading: 'El teu compte',
        body: [
          "Ets responsable de la veracitat de les dades que facilites i de mantenir la confidencialitat de la teva contrasenya. Has de ser major d'edat o tenir autorització per registrar-te.",
          "Pots eliminar el teu compte en qualsevol moment; amb això s'esborren les teves dades associades.",
        ],
      },
      {
        heading: 'Ús acceptable',
        body: [
          "No pots utilitzar el lloc per a finalitats il·lícites, intentar vulnerar-ne la seguretat, automatitzar peticions de manera abusiva ni sobrecarregar el servei.",
          'Ens reservem el dret de suspendre comptes que incompleixin aquestes condicions.',
        ],
      },
      {
        heading: 'Contingut de tercers',
        body: [
          "Les dades de pel·lícules s'obtenen de The Movie Database (TMDB), OMDb i Watchmode, cadascun amb els seus propis termes. Aquest producte utilitza l'API de TMDB però no està avalat ni certificat per TMDB.",
          "Les revistes i diaris històrics es mostren a través d'Internet Archive (Media History Digital Library) i són, majoritàriament, de domini públic. Les revistes actuals s'enllacen al seu lloc oficial i pertanyen als seus respectius editors.",
        ],
      },
      {
        heading: 'Propietat intel·lectual',
        body: [
          "Els textos editorials propis del lloc i el seu disseny pertanyen a Cine Archive. Les marques, cartells i imatges de pel·lícules pertanyen als seus titulars i s'utilitzen amb finalitats informatives.",
        ],
      },
      {
        heading: 'Sense garanties',
        body: [
          'El servei s\'ofereix "tal com és", sense garantia de disponibilitat contínua ni d\'exactitud de les dades de tercers. No ens fem responsables de danys derivats de l\'ús del lloc en la mesura que permeti la llei.',
        ],
      },
      {
        heading: 'Canvis',
        body: [
          "Podem modificar aquests termes. La versió vigent es publicarà en aquesta pàgina amb la seva data. L'ús continuat del lloc implica l'acceptació dels canvis.",
        ],
      },
      {
        heading: 'Legislació aplicable',
        body: [
          'Aquests termes es regeixen per la legislació espanyola. Per a qualsevol qüestió pots escriure a ' +
            CONTACT_EMAIL +
            '.',
        ],
      },
    ],
  },
};
