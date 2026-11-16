import type { Lang } from '../i18n/ui';

/**
 * Números del boletín de novedades (lib/newsletter.ts). Cada número tiene un
 * id que no cambia: es lo que se apunta en newsletter_sends para no mandarlo
 * dos veces. El texto, en los cinco idiomas, en lenguaje llano, como el
 * changelog. Los enlaces son rutas sin idioma: el correo las pone en el de
 * cada persona.
 */
export interface NewsletterItem {
  title: string;
  text: string;
  /** Ruta sin idioma (`foro`, `estrenos#el-dia`). */
  path: string;
}

export interface NewsletterCopy {
  subject: string;
  /** Lo que se ve en la bandeja de entrada después del asunto. */
  preheader: string;
  title: string;
  intro: string;
  items: NewsletterItem[];
  outro: string;
}

export interface NewsletterIssue {
  id: string;
  copy: Record<Lang, NewsletterCopy>;
}

const foro2026: NewsletterIssue = {
  id: '2026-11-foro',
  copy: {
    es: {
      subject: 'Abre el cineclub de Cine Archive (y más novedades)',
      preheader: 'Una película a la vez para todos, los viernes a las 22:00. La primera, «El circo», de Chaplin.',
      title: 'Abre el cineclub',
      intro: 'Te escribimos porque tienes cuenta en Cine Archive y en las últimas semanas han cambiado bastantes cosas. Estas son las que más merecen la pena.',
      items: [
        { title: 'Foro y cineclub', text: 'Los viernes a las 22:00 y los domingos a las 18:00 vemos todos a la vez una película de dominio público, cada uno en su casa, con un chat al lado. La primera, este viernes 20: «El circo», de Chaplin.', path: 'foro' },
        { title: '¿Qué echaban en los cines el día que…?', text: 'Pon una fecha —el día que naciste, por ejemplo— y mira qué se estrenaba esas semanas. Está en Estrenos.', path: 'estrenos#el-dia' },
        { title: 'Dos juegos nuevos', text: 'Reparto (adivina la película por sus actores) y ¿En qué año? (di cuándo se estrenaron cinco películas), con reto diario e ilimitado.', path: 'games' },
        { title: 'Diez películas más para ver gratis', text: 'Chaplin, tres Keaton, los hermanos Marx, von Sternberg y «El cantor de jazz», enteras y legales en Cine abierto.', path: 'articles/diez-peliculas-nuevas-en-cine-abierto' },
        { title: 'El palmarés del Festival de Sevilla', text: 'Estuvimos acreditados como prensa gráfica. Aquí está lo que ganó y por qué.', path: 'articles/festival-sevilla-2026-palmares' },
        { title: 'Tu diario, mejor', text: 'Si vuelves a ver una película, pulsa «Vista otra vez» en su ficha: se apunta en tu diario con su nueva nota. Y escribir una reseña ya no la manda a pendientes.', path: 'diary' },
      ],
      outro: 'Gracias por estar ahí. Si algo no funciona o echas algo de menos, contesta a este correo.',
    },
    en: {
      subject: 'The Cine Archive film club opens (and more news)',
      preheader: 'One film at the same time for everyone, Fridays at 22:00. First up, Chaplin’s “The Circus”.',
      title: 'The film club opens',
      intro: 'We are writing because you have a Cine Archive account and quite a lot has changed in the last few weeks. These are the things most worth your time.',
      items: [
        { title: 'Forum and film club', text: 'On Fridays at 22:00 and Sundays at 18:00 we all watch a public-domain film at the same time, each at home, with a chat alongside. The first one, this Friday the 20th: Chaplin’s “The Circus”.', path: 'foro' },
        { title: 'What was showing in cinemas the day…?', text: 'Pick a date —your birthday, say— and see what was opening in those weeks. It is under New in cinemas.', path: 'estrenos#el-dia' },
        { title: 'Two new games', text: 'Cast (guess the film from its actors) and What year? (say when five films came out), with a daily challenge and unlimited play.', path: 'games' },
        { title: 'Ten more films to watch for free', text: 'Chaplin, three Keatons, the Marx Brothers, von Sternberg and “The Jazz Singer”, complete and legal in Open Cinema.', path: 'articles/diez-peliculas-nuevas-en-cine-abierto' },
        { title: 'The Seville Film Festival winners', text: 'We were accredited as press photographers. Here is what won and why.', path: 'articles/festival-sevilla-2026-palmares' },
        { title: 'A better diary', text: 'If you watch a film again, press “Watched again” on its page: it goes into your diary with its new rating. And writing a review no longer sends the film to your watchlist.', path: 'diary' },
      ],
      outro: 'Thanks for being there. If something does not work or you miss something, just reply to this email.',
    },
    gl: {
      subject: 'Abre o cineclube de Cine Archive (e máis novidades)',
      preheader: 'Unha película á vez para todos, os venres ás 22:00. A primeira, «O circo», de Chaplin.',
      title: 'Abre o cineclube',
      intro: 'Escribímoste porque tes conta en Cine Archive e nas últimas semanas cambiaron bastantes cousas. Estas son as que máis pagan a pena.',
      items: [
        { title: 'Foro e cineclube', text: 'Os venres ás 22:00 e os domingos ás 18:00 vemos todos á vez unha película de dominio público, cada un na súa casa, cun chat ao lado. A primeira, este venres 20: «O circo», de Chaplin.', path: 'foro' },
        { title: 'Que botaban nos cines o día que…?', text: 'Pon unha data —o día que naciches, por exemplo— e mira que se estreaba esas semanas. Está en Estreas.', path: 'estrenos#el-dia' },
        { title: 'Dous xogos novos', text: 'Reparto (adiviña a película polos seus actores) e En que ano? (di cando se estrearon cinco películas), con reto diario e ilimitado.', path: 'games' },
        { title: 'Dez películas máis para ver de balde', text: 'Chaplin, tres Keaton, os irmáns Marx, von Sternberg e «O cantor de jazz», enteiras e legais en Cine aberto.', path: 'articles/diez-peliculas-nuevas-en-cine-abierto' },
        { title: 'O palmarés do Festival de Sevilla', text: 'Estivemos acreditados como prensa gráfica. Aquí está o que gañou e por que.', path: 'articles/festival-sevilla-2026-palmares' },
        { title: 'O teu diario, mellor', text: 'Se volves ver unha película, preme «Vista outra vez» na súa ficha: apúntase no teu diario coa súa nova nota. E escribir unha recensión xa non a manda a pendentes.', path: 'diary' },
      ],
      outro: 'Grazas por estar aí. Se algo non funciona ou botas algo en falta, responde a este correo.',
    },
    eu: {
      subject: 'Cine Archiveren zineklub irekitzen da (eta berritasun gehiago)',
      preheader: 'Film bat guztiontzat batera, ostiraletan 22:00etan. Lehena, Chaplinen «Zirkua».',
      title: 'Zineklub irekitzen da',
      intro: 'Idazten dizugu Cine Archiven kontua duzulako eta azken asteetan dezente gauza aldatu direlako. Hauek dira merezi dutenak gehien.',
      items: [
        { title: 'Foroa eta zineklub', text: 'Ostiraletan 22:00etan eta igandeetan 18:00etan domeinu publikoko film bat ikusten dugu guztiok batera, bakoitza bere etxean, ondoan txat bat dugula. Lehena, ostiral honetan, 20an: Chaplinen «Zirkua».', path: 'foro' },
        { title: 'Zer ematen zuten zinemetan… egunean?', text: 'Jarri data bat —jaio zinen eguna, adibidez— eta ikusi zer estreinatzen zen aste haietan. Estreinaldietan dago.', path: 'estrenos#el-dia' },
        { title: 'Bi joko berri', text: 'Aktoreak (asmatu filma bere aktoreen bidez) eta Zein urtetan? (esan noiz estreinatu ziren bost filma), eguneko erronkarekin eta mugagabeak.', path: 'games' },
        { title: 'Doan ikusteko beste hamar film', text: 'Chaplin, hiru Keaton, Marx anaiak, von Sternberg eta «Jazz abeslaria», osorik eta legez Zinema irekian.', path: 'articles/diez-peliculas-nuevas-en-cine-abierto' },
        { title: 'Sevillako Jaialdiko sari-zerrenda', text: 'Prentsa grafiko gisa egon ginen akreditatuta. Hemen dago zer irabazi zuen eta zergatik.', path: 'articles/festival-sevilla-2026-palmares' },
        { title: 'Zure egunerokoa, hobea', text: 'Film bat berriro ikusten baduzu, sakatu «Berriro ikusia» haren fitxan: zure egunerokoan gehitzen da bere nota berriarekin. Eta kritika bat idazteak ez du jada filma ikusteko zerrendara bidaltzen.', path: 'diary' },
      ],
      outro: 'Eskerrik asko hor egoteagatik. Zerbaitek ez badu funtzionatzen edo zerbait faltan botatzen baduzu, erantzun mezu honi.',
    },
    ca: {
      subject: 'Obre el cineclub de Cine Archive (i més novetats)',
      preheader: 'Una pel·lícula alhora per a tothom, els divendres a les 22:00. La primera, «El circ», de Chaplin.',
      title: 'Obre el cineclub',
      intro: 'T’escrivim perquè tens compte a Cine Archive i en les últimes setmanes han canviat força coses. Aquestes són les que més valen la pena.',
      items: [
        { title: 'Fòrum i cineclub', text: 'Els divendres a les 22:00 i els diumenges a les 18:00 veiem tots alhora una pel·lícula de domini públic, cadascú a casa seva, amb un xat al costat. La primera, aquest divendres 20: «El circ», de Chaplin.', path: 'foro' },
        { title: 'Què feien als cinemes el dia que…?', text: 'Posa una data —el dia que vas néixer, per exemple— i mira què s’estrenava aquelles setmanes. És a Estrenes.', path: 'estrenos#el-dia' },
        { title: 'Dos jocs nous', text: 'Repartiment (endevina la pel·lícula pels seus actors) i En quin any? (digues quan es van estrenar cinc pel·lícules), amb repte diari i il·limitat.', path: 'games' },
        { title: 'Deu pel·lícules més per veure gratis', text: 'Chaplin, tres Keaton, els germans Marx, von Sternberg i «El cantor de jazz», senceres i legals a Cinema obert.', path: 'articles/diez-peliculas-nuevas-en-cine-abierto' },
        { title: 'El palmarès del Festival de Sevilla', text: 'Hi vam ser acreditats com a premsa gràfica. Aquí tens què va guanyar i per què.', path: 'articles/festival-sevilla-2026-palmares' },
        { title: 'El teu diari, millor', text: 'Si tornes a veure una pel·lícula, prem «Vista una altra vegada» a la seva fitxa: s’apunta al teu diari amb la nova nota. I escriure una ressenya ja no l’envia a pendents.', path: 'diary' },
      ],
      outro: 'Gràcies per ser-hi. Si alguna cosa no funciona o trobes a faltar res, respon aquest correu.',
    },
  },
};

/** El número que se envía ahora (el panel solo deja mandar este). */
export const CURRENT_ISSUE = foro2026;
export const ISSUES: NewsletterIssue[] = [foro2026];
