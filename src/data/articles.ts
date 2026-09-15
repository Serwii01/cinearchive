import type { Lang } from '../i18n/ui';

/**
 * Artículos de Cine Archive: piezas de actualidad firmadas por la casa.
 *
 * Como los dosieres especiales, van en TypeScript y no en JSON porque son
 * prosa larga en cinco idiomas. Un párrafo que empiece por «## » se pinta como
 * subtítulo. Las fuentes son comunes a todos los idiomas: son enlaces.
 *
 * Los datos de cada artículo se contrastaron el día de su fecha; los que
 * puedan cambiar (taquilla, estrenos) llevan esa fecha en el propio texto.
 */

export interface ArticleCopy {
  kicker: string;
  title: string;
  lead: string;
  /** Párrafos. «## Título» = subtítulo. */
  body: string[];
}

export interface Article {
  slug: string;
  /** Fecha de publicación, AAAA-MM-DD. */
  date: string;
  /** Película de TMDB cuyo fondo sirve de imagen de cabecera. */
  cover?: { tmdbId: number };
  /** Películas relacionadas, para enlazar a sus fichas al pie. */
  related?: number[];
  sources: { label: string; url: string }[];
  copy: Record<Lang, ArticleCopy>;
}

const emmys2026: Article = {
  slug: 'emmy-2026',
  date: '2026-09-15',
  sources: [
    { label: 'Television Academy · 78th Emmy Awards', url: 'https://www.televisionacademy.com/' },
    { label: 'TV Guide · Emmy Winners 2026: The Full List', url: 'https://www.tvguide.com/news/emmy-winners-2026-full-list-78th-primetime-emmy-awards/' },
    { label: 'CBS News · 2026 Emmy Awards winners list', url: 'https://www.cbsnews.com/live-updates/2026-emmy-awards-winners-list/' },
  ],
  copy: {
    es: {
      kicker: 'Artículo · Televisión',
      title: 'Emmy 2026: Apple gana la noche, la comedia ya no es comedia y Colbert se despide con premio',
      lead: 'Catorce estatuillas para una serie de terror que compite como comedia, un actor que gana dos categorías la misma noche y un programa cancelado que sale premiado. La 78.ª edición de los Emmy, celebrada el 14 de septiembre en Los Ángeles, dejó un mapa bastante claro de a dónde va la televisión estadounidense.',
      body: [
        'La noticia de la gala es una serie de la que hace un año nadie hablaba. «Widow\'s Bay», la comedia de terror de Katie Dippold para Apple TV con Matthew Rhys al frente y Hiro Murai detrás de la cámara, se llevó **catorce** Emmy, la cifra más alta que ha conseguido nunca una comedia. Ganó serie, dirección, guion, actor protagonista y actor de reparto (Stephen Root), y de paso dejó en evidencia una vieja trampa de los premios: lo que la Academia llama comedia es, cada vez más, cualquier cosa de media hora que no sea un drama. Una isla de Nueva Inglaterra con una maldición de siglos no es «Frasier».',
        'En drama no hubo sorpresa, y eso también cuenta una historia. «The Pitt», el drama hospitalario de HBO Max que ya había ganado el año pasado, repitió como mejor serie y repitió Noah Wyle como actor protagonista. Llegaba con 25 nominaciones, más que nadie. Lo que sí cambió fue la actriz: Rhea Seehorn ganó por «Pluribus», la serie de ciencia ficción que Vince Gilligan escribió pensando en ella tras «Better Call Saul». Es la confirmación de una carrera que la industria tardó demasiado en mirar.',
        '## La noche de Matthew Rhys',
        'Rhys hizo algo que no había hecho nadie: ganar la misma noche el Emmy al actor protagonista de comedia («Widow\'s Bay») y el de serie limitada («The Beast in Me», en Netflix). Dos registros opuestos, un mismo intérprete, y un recordatorio de que el galés lleva desde «The Americans» siendo uno de los actores más fiables de la televisión sin que se le note el esfuerzo.',
        'La otra cifra de la noche es de Jean Smart: **ocho** Emmy en su carrera, cinco de ellos por Deborah Vance en «Hacks». Sally Field ganó en serie limitada por «Remarkably Bright Creatures» y Allison Janney, de reparto en drama, por «The Diplomat». La serie limitada fue «DTF St. Louis», el triángulo amoroso con asesinato que Steven Conrad escribió y dirigió para HBO con Jason Bateman, David Harbour y Linda Cardellini.',
        '## Lo que dice el reparto de premios',
        'Apple TV acabó la temporada como la plataforma más premiada, con 28 Emmy contando las ceremonias técnicas. Hace seis años arrancaba con un puñado de series; hoy se lleva la comedia, la actriz de drama y el récord de la noche. HBO conserva el prestigio —drama y serie limitada— y Netflix, que gasta más que nadie, vuelve a irse con menos de lo que esperaba.',
        'Y luego está «The Late Show with Stephen Colbert», que ganó como mejor programa de variedades **después** de que CBS anunciara su cancelación. El premio a un programa que emitió su último episodio en mayo es, según se mire, un homenaje o un reproche. Probablemente las dos cosas.',
        'La gala la presentó Mariska Hargitay, la primera mujer en hacerlo desde Jane Lynch en 2011 y la primera persona que no es cómica desde Angela Lansbury en 1993. Michael J. Fox recibió el premio humanitario Bob Hope por tres décadas de trabajo contra el párkinson. Fue, con diferencia, el momento en que el Peacock Theater se puso en pie con menos protocolo.',
        'Desde aquí, una observación de archivo: cinco de los premios grandes de esta edición fueron para series que no existían hace dos años. La televisión que se premia se renueva más deprisa de lo que solía, y eso, para quien cataloga, es un problema agradable de tener.',
      ],
    },
    en: {
      kicker: 'Article · Television',
      title: 'Emmys 2026: Apple takes the night, comedy is no longer comedy and Colbert bows out with a prize',
      lead: 'Fourteen statuettes for a horror series competing as a comedy, an actor winning two categories on the same night and a cancelled show going home with an award. The 78th Emmys, held on 14 September in Los Angeles, drew a fairly clear map of where American television is heading.',
      body: [
        'The story of the night is a series nobody was talking about a year ago. “Widow\'s Bay”, Katie Dippold\'s horror comedy for Apple TV with Matthew Rhys up front and Hiro Murai behind the camera, took **fourteen** Emmys, the most any comedy has ever won. It won series, directing, writing, lead actor and supporting actor (Stephen Root), and in passing exposed an old trick of the awards: what the Academy calls comedy is, increasingly, anything half an hour long that isn\'t a drama. A New England island under a centuries-old curse is not “Frasier”.',
        'In drama there was no surprise, and that tells a story too. “The Pitt”, HBO Max\'s hospital drama that had already won last year, repeated as best series, and Noah Wyle repeated as lead actor. It arrived with 25 nominations, more than anyone. What did change was the actress: Rhea Seehorn won for “Pluribus”, the science-fiction series Vince Gilligan wrote with her in mind after “Better Call Saul”. It confirms a career the industry took far too long to notice.',
        '## Matthew Rhys\'s night',
        'Rhys did something no one had done before: win, on the same night, the Emmy for lead actor in a comedy (“Widow\'s Bay”) and in a limited series (“The Beast in Me”, on Netflix). Two opposite registers, one performer, and a reminder that the Welshman has been one of television\'s most reliable actors since “The Americans” without ever seeming to try.',
        'The other figure of the night belongs to Jean Smart: **eight** career Emmys, five of them for Deborah Vance in “Hacks”. Sally Field won in limited series for “Remarkably Bright Creatures” and Allison Janney, supporting in drama, for “The Diplomat”. Limited series went to “DTF St. Louis”, the love triangle with a murder that Steven Conrad wrote and directed for HBO with Jason Bateman, David Harbour and Linda Cardellini.',
        '## What the spread of prizes says',
        'Apple TV ended the season as the most awarded platform, with 28 Emmys counting the technical ceremonies. Six years ago it launched with a handful of shows; today it takes comedy, drama actress and the record of the night. HBO keeps the prestige —drama and limited series— and Netflix, which spends more than anyone, once again leaves with less than it hoped for.',
        'And then there is “The Late Show with Stephen Colbert”, which won best variety series **after** CBS announced its cancellation. An award for a show that aired its last episode in May is, depending on how you look at it, a tribute or a rebuke. Probably both.',
        'The ceremony was hosted by Mariska Hargitay, the first woman to do so since Jane Lynch in 2011 and the first non-comedian since Angela Lansbury in 1993. Michael J. Fox received the Bob Hope Humanitarian Award for three decades of work against Parkinson\'s. It was, by some distance, the moment the Peacock Theater stood up with the least protocol.',
        'From here, an archivist\'s observation: five of this year\'s big prizes went to series that did not exist two years ago. The television that gets rewarded renews itself faster than it used to, and for anyone keeping a catalogue that is a pleasant problem to have.',
      ],
    },
    gl: {
      kicker: 'Artigo · Televisión',
      title: 'Emmy 2026: Apple gaña a noite, a comedia xa non é comedia e Colbert despídese con premio',
      lead: 'Catorce estatuíñas para unha serie de terror que compite como comedia, un actor que gaña dúas categorías a mesma noite e un programa cancelado que sae premiado. A 78.ª edición dos Emmy, celebrada o 14 de setembro en Los Ángeles, deixou un mapa bastante claro de a onde vai a televisión estadounidense.',
      body: [
        'A noticia da gala é unha serie da que hai un ano ninguén falaba. «Widow\'s Bay», a comedia de terror de Katie Dippold para Apple TV con Matthew Rhys á fronte e Hiro Murai detrás da cámara, levou **catorce** Emmy, a cifra máis alta que conseguiu nunca unha comedia. Gañou serie, dirección, guión, actor protagonista e actor de reparto (Stephen Root), e de paso deixou en evidencia unha vella trampa dos premios: o que a Academia chama comedia é, cada vez máis, calquera cousa de media hora que non sexa un drama. Unha illa de Nova Inglaterra cunha maldición de séculos non é «Frasier».',
        'En drama non houbo sorpresa, e iso tamén conta unha historia. «The Pitt», o drama hospitalario de HBO Max que xa gañara o ano pasado, repetiu como mellor serie e repetiu Noah Wyle como actor protagonista. Chegaba con 25 nominacións, máis ca ninguén. O que si cambiou foi a actriz: Rhea Seehorn gañou por «Pluribus», a serie de ciencia ficción que Vince Gilligan escribiu pensando nela tras «Better Call Saul». É a confirmación dunha carreira que a industria tardou demasiado en mirar.',
        '## A noite de Matthew Rhys',
        'Rhys fixo algo que non fixera ninguén: gañar a mesma noite o Emmy ao actor protagonista de comedia («Widow\'s Bay») e o de serie limitada («The Beast in Me», en Netflix). Dous rexistros opostos, un mesmo intérprete, e un recordatorio de que o galés leva desde «The Americans» sendo un dos actores máis fiables da televisión sen que se lle note o esforzo.',
        'A outra cifra da noite é de Jean Smart: **oito** Emmy na súa carreira, cinco deles por Deborah Vance en «Hacks». Sally Field gañou en serie limitada por «Remarkably Bright Creatures» e Allison Janney, de reparto en drama, por «The Diplomat». A serie limitada foi «DTF St. Louis», o triángulo amoroso con asasinato que Steven Conrad escribiu e dirixiu para HBO con Jason Bateman, David Harbour e Linda Cardellini.',
        '## O que di o reparto de premios',
        'Apple TV acabou a tempada como a plataforma máis premiada, con 28 Emmy contando as cerimonias técnicas. Hai seis anos arrancaba cun puñado de series; hoxe leva a comedia, a actriz de drama e o récord da noite. HBO conserva o prestixio —drama e serie limitada— e Netflix, que gasta máis ca ninguén, volve marchar con menos do que esperaba.',
        'E logo está «The Late Show with Stephen Colbert», que gañou como mellor programa de variedades **despois** de que CBS anunciase a súa cancelación. O premio a un programa que emitiu o seu último episodio en maio é, segundo se mire, unha homenaxe ou un reproche. Probablemente as dúas cousas.',
        'A gala presentouna Mariska Hargitay, a primeira muller en facelo desde Jane Lynch en 2011 e a primeira persoa que non é cómica desde Angela Lansbury en 1993. Michael J. Fox recibiu o premio humanitario Bob Hope por tres décadas de traballo contra o párkinson. Foi, con diferenza, o momento en que o Peacock Theater se puxo en pé con menos protocolo.',
        'Desde aquí, unha observación de arquivo: cinco dos premios grandes desta edición foron para series que non existían hai dous anos. A televisión que se premia renóvase máis rápido do que adoitaba, e iso, para quen cataloga, é un problema agradable de ter.',
      ],
    },
    eu: {
      kicker: 'Artikulua · Telebista',
      title: 'Emmy 2026: Applek gaua irabazi du, komedia ez da jada komedia eta Colbert sariarekin agurtu da',
      lead: 'Hamalau estatuatxo komedia gisa lehiatzen den beldurrezko serie batentzat, gau berean bi kategoria irabazi dituen aktore bat eta bertan behera utzitako saio bat saritua. Emmy sarien 78. edizioak, irailaren 14an Los Angelesen ospatuak, mapa nahiko argia utzi zuen Estatu Batuetako telebista norantz doan jakiteko.',
      body: [
        'Galako albistea duela urtebete inork aipatzen ez zuen serie bat da. «Widow\'s Bay», Katie Dippolden beldurrezko komedia Apple TVrako, Matthew Rhys aurrean eta Hiro Murai kameraren atzean, **hamalau** Emmy eraman zituen, komedia batek inoiz lortu duen kopururik handiena. Seriea, zuzendaritza, gidoia, aktore protagonista eta bigarren mailako aktorea (Stephen Root) irabazi zituen, eta bide batez sarien tranpa zahar bat agerian utzi zuen: Akademiak komedia deitzen duena, gero eta gehiago, drama ez den ordu erdiko edozer da. Mendeetako madarikazio bat duen Ingalaterra Berriko uharte bat ez da «Frasier».',
        'Draman ez zen ezustekorik izan, eta horrek ere istorio bat kontatzen du. «The Pitt», HBO Maxen ospitale-dramak, iaz jada irabazi zuenak, serie onena errepikatu zuen eta Noah Wylek aktore protagonista gisa errepikatu zuen. 25 izendapenekin iritsi zen, inork baino gehiago. Aldatu zena aktoresa izan zen: Rhea Seehornek irabazi zuen «Pluribus»-engatik, Vince Gilliganek «Better Call Saul»-en ondoren berarengan pentsatuz idatzitako zientzia-fikziozko seriea. Industriak begiratzeko gehiegi luzatu zuen karrera baten berrespena da.',
        '## Matthew Rhysen gaua',
        'Rhysek inork egin ez zuena egin zuen: gau berean irabazi komediako aktore protagonistaren Emmya («Widow\'s Bay») eta serie mugatukoa («The Beast in Me», Netflixen). Bi erregistro kontrajarri, interprete bakarra, eta gogorarazpen bat: galestarra «The Americans»-etik telebistako aktore fidagarrienetakoa da, ahaleginik nabaritu gabe.',
        'Gaueko beste zifra Jean Smartena da: **zortzi** Emmy bere karreran, horietako bost «Hacks»-eko Deborah Vancerengatik. Sally Fieldek serie mugatuan irabazi zuen «Remarkably Bright Creatures»-engatik eta Allison Janneyk, dramako bigarren mailakoan, «The Diplomat»-engatik. Serie mugatua «DTF St. Louis» izan zen, Steven Conradek HBOrako idatzi eta zuzendutako hilketadun maitasun-triangelua, Jason Bateman, David Harbour eta Linda Cardellinirekin.',
        '## Sarien banaketak dioena',
        'Apple TVk denboraldia plataforma saritu bezala amaitu zuen, 28 Emmyrekin zeremonia teknikoak kontatuta. Duela sei urte serie sorta batekin abiatu zen; gaur komedia, dramako aktoresa eta gaueko errekorra eramaten ditu. HBOk prestigioa gordetzen du —drama eta serie mugatua— eta Netflix, inork baino gehiago gastatzen duenak, berriro espero zuena baino gutxiagorekin doa.',
        'Eta gero dago «The Late Show with Stephen Colbert», barietate-saio onena irabazi zuena CBSk bertan behera uztea iragarri **ondoren**. Maiatzean azken atala eman zuen saio batentzako saria, nola begiratzen den, omenaldia edo gaitzespena da. Ziurrenik biak.',
        'Gala Mariska Hargitayk aurkeztu zuen, Jane Lynchek 2011n egin zuenetik lehen emakumea eta Angela Lansburyk 1993an egin zuenetik umorista ez den lehen pertsona. Michael J. Foxek Bob Hope sari humanitarioa jaso zuen parkinsonaren aurkako hiru hamarkadako lanagatik. Alde handiz, Peacock Theater protokolo gutxienarekin zutitu zen unea izan zen.',
        'Hemendik, artxiboko ohar bat: edizio honetako sari handietako bost duela bi urte existitzen ez ziren serieentzat izan ziren. Saritzen den telebista lehen baino azkarrago berritzen da, eta hori, katalogatzen duenarentzat, izateko arazo atsegina da.',
      ],
    },
    ca: {
      kicker: 'Article · Televisió',
      title: 'Emmy 2026: Apple guanya la nit, la comèdia ja no és comèdia i Colbert s\'acomiada amb premi',
      lead: 'Catorze estatuetes per a una sèrie de terror que competeix com a comèdia, un actor que guanya dues categories la mateixa nit i un programa cancel·lat que surt premiat. La 78a edició dels Emmy, celebrada el 14 de setembre a Los Angeles, va deixar un mapa força clar de cap a on va la televisió nord-americana.',
      body: [
        'La notícia de la gala és una sèrie de la qual fa un any ningú no parlava. «Widow\'s Bay», la comèdia de terror de Katie Dippold per a Apple TV amb Matthew Rhys al capdavant i Hiro Murai darrere la càmera, es va endur **catorze** Emmy, la xifra més alta que ha aconseguit mai una comèdia. Va guanyar sèrie, direcció, guió, actor protagonista i actor de repartiment (Stephen Root), i de passada va deixar en evidència una vella trampa dels premis: el que l\'Acadèmia anomena comèdia és, cada cop més, qualsevol cosa de mitja hora que no sigui un drama. Una illa de Nova Anglaterra amb una maledicció de segles no és «Frasier».',
        'En drama no hi va haver sorpresa, i això també explica una història. «The Pitt», el drama hospitalari d\'HBO Max que ja havia guanyat l\'any passat, va repetir com a millor sèrie i va repetir Noah Wyle com a actor protagonista. Arribava amb 25 nominacions, més que ningú. El que sí que va canviar va ser l\'actriu: Rhea Seehorn va guanyar per «Pluribus», la sèrie de ciència-ficció que Vince Gilligan va escriure pensant en ella després de «Better Call Saul». És la confirmació d\'una carrera que la indústria va trigar massa a mirar.',
        '## La nit de Matthew Rhys',
        'Rhys va fer una cosa que no havia fet ningú: guanyar la mateixa nit l\'Emmy a l\'actor protagonista de comèdia («Widow\'s Bay») i el de sèrie limitada («The Beast in Me», a Netflix). Dos registres oposats, un mateix intèrpret, i un recordatori que el gal·lès porta des de «The Americans» sent un dels actors més fiables de la televisió sense que se li noti l\'esforç.',
        'L\'altra xifra de la nit és de Jean Smart: **vuit** Emmy en la seva carrera, cinc d\'ells per Deborah Vance a «Hacks». Sally Field va guanyar en sèrie limitada per «Remarkably Bright Creatures» i Allison Janney, de repartiment en drama, per «The Diplomat». La sèrie limitada va ser «DTF St. Louis», el triangle amorós amb assassinat que Steven Conrad va escriure i dirigir per a HBO amb Jason Bateman, David Harbour i Linda Cardellini.',
        '## El que diu el repartiment de premis',
        'Apple TV va acabar la temporada com la plataforma més premiada, amb 28 Emmy comptant les cerimònies tècniques. Fa sis anys arrencava amb un grapat de sèries; avui s\'endú la comèdia, l\'actriu de drama i el rècord de la nit. HBO conserva el prestigi —drama i sèrie limitada— i Netflix, que gasta més que ningú, torna a marxar amb menys del que esperava.',
        'I després hi ha «The Late Show with Stephen Colbert», que va guanyar com a millor programa de varietats **després** que CBS n\'anunciés la cancel·lació. El premi a un programa que va emetre el seu últim episodi al maig és, segons com es miri, un homenatge o un retret. Probablement totes dues coses.',
        'La gala la va presentar Mariska Hargitay, la primera dona a fer-ho des de Jane Lynch el 2011 i la primera persona que no és còmica des d\'Angela Lansbury el 1993. Michael J. Fox va rebre el premi humanitari Bob Hope per tres dècades de treball contra el pàrkinson. Va ser, amb diferència, el moment en què el Peacock Theater es va posar dret amb menys protocol.',
        'Des d\'aquí, una observació d\'arxiu: cinc dels premis grans d\'aquesta edició van ser per a sèries que no existien fa dos anys. La televisió que es premia es renova més de pressa del que solia, i això, per a qui cataloga, és un problema agradable de tenir.',
      ],
    },
  },
};

const pattinson2026: Article = {
  slug: 'robert-pattinson-2026',
  date: '2026-09-15',
  cover: { tmdbId: 1368337 },
  related: [1325734, 1368337, 1375441, 1170608],
  sources: [
    { label: 'Wikipedia · The Odyssey (2026 film)', url: 'https://en.wikipedia.org/wiki/The_Odyssey_(2026_film)' },
    { label: 'Wikipedia · Primetime (2026 film)', url: 'https://en.wikipedia.org/wiki/Primetime_(2026_film)' },
    { label: 'Wikipedia · The Batman: Part II', url: 'https://en.wikipedia.org/wiki/The_Batman:_Part_II' },
    { label: 'Deadline · Upcoming Robert Pattinson Movies', url: 'https://deadline.com/lists/robert-pattinson-upcoming-movies/' },
  ],
  copy: {
    es: {
      kicker: 'Artículo · Perfil',
      title: 'El año de Robert Pattinson: cuatro estrenos, un villano de Homero y el Batman que rueda entre medias',
      lead: 'Una comedia romántica con Zendaya en abril, el pretendiente más odioso de «La Odisea» en julio, un presentador de televisión real en septiembre y un cambiaformas de «Dune» en diciembre. Con el Batman de Matt Reeves rodándose en Londres desde junio. Ningún actor ha tenido en 2026 un calendario como el suyo, y ninguno lo ha llenado con papeles tan distintos.',
      body: [
        'Hace quince años Robert Pattinson era el vampiro de «Crepúsculo» y pasó la década siguiente haciendo todo lo posible por no serlo: Cronenberg, los Safdie, Claire Denis, «El faro». Aquello se leía como huida. Lo de 2026 ya no: es un actor de carácter con cara de protagonista que ha conseguido que los estudios le paguen por hacer exactamente lo que hacía en el cine independiente, solo que con doscientos millones de presupuesto.',
        '## Abril: «El drama»',
        'El año arrancó el 3 de abril con «The Drama», de Kristoffer Borgli para A24: una pareja a punto de casarse —Pattinson y Zendaya— a la que una revelación le revienta la semana de la boda. La película, presentada el 17 de marzo, costó 28 millones de dólares y recaudó 132 en todo el mundo, que para una comedia de autor sin efectos es un resultado poco habitual. Es también la primera vez que Pattinson hace de tipo normal en mucho tiempo, y lo interesante es que se le da bien.',
        '## Julio: Antínoo',
        'Luego vino la grande. «La Odisea» de Christopher Nolan se estrenó el 17 de julio, rodada íntegramente con cámaras IMAX de 70 mm —la primera película en hacerlo— y con Matt Damon como Ulises. Pattinson es Antínoo, el cabecilla de los pretendientes que asedian a Penélope, y él mismo ha contado que lo construyó a partir del Lester Diamond de James Woods en «Casino»: un tipo viscoso que sabe que está de más. Fue, según cuentan, el único del reparto que pidió leer el guion antes de firmar. A día de hoy la película lleva 1.687 millones de dólares, la segunda más taquillera del año y la película para adultos más taquillera de la historia. Que un pretendiente de Homero sea uno de sus personajes más comentados dice bastante de lo que Pattinson hace con un papel secundario.',
        '## Septiembre: un presentador real',
        'El 25 de septiembre llega «Primetime», de Lance Oppenheim, también con A24, que compitió en Venecia a principios de mes. Pattinson —que además produce— interpreta a Chris Hansen, el presentador de «To Catch a Predator», el programa que tendía trampas a pederastas ante las cámaras. Es un papel incómodo por diseño: un hombre real, vivo, convertido en personaje de una película sobre lo que la televisión hace con la vergüenza ajena. Las primeras críticas hablan de una actuación magnética y de una película más interesada en la psicología del espectáculo que en el escándalo.',
        '## Diciembre: Scytale',
        'Y el 18 de diciembre cierra el año «Dune: Parte tres», de Denis Villeneuve, donde es Scytale, el danzarín de rostro capaz de tomar cualquier forma. Su aparición en el tráiler fue lo más comentado del avance, y es el papel que mejor resume el año: un actor al que le gusta desaparecer dentro de la máscara y que, aun así, es reconocible en cuanto abre la boca.',
        '## Y Batman, entre medias',
        'Todo esto lo ha compaginado con «The Batman: Parte II», que empezó a rodarse el 12 de junio en los estudios Warner de Leavesden, con exteriores en Londres, Liverpool y Glasgow, y con Sebastian Stan y Scarlett Johansson como los Dent. Warner la ha fijado para el 18 de febrero de 2028. Es decir: mientras estrenaba cuatro películas, estaba rodando la quinta.',
        'Pattinson ha dicho que le habría devastado tener que renunciar a cualquiera de las cuatro. Se entiende. Es difícil recordar un año en que un mismo actor haya estado en una comedia de A24, en el mayor éxito de Nolan, en un retrato de un presentador de la televisión basura y en la tercera parte de «Dune». Lo raro no es que le hayan ofrecido los cuatro papeles; lo raro es que los cuatro le queden bien. Datos de taquilla y fechas comprobados el 15 de septiembre de 2026.',
      ],
    },
    en: {
      kicker: 'Article · Profile',
      title: 'Robert Pattinson\'s year: four releases, a Homeric villain and the Batman shooting in between',
      lead: 'A romantic comedy with Zendaya in April, the most hateful suitor in “The Odyssey” in July, a real television host in September and a “Dune” shapeshifter in December. With Matt Reeves\'s Batman shooting in London since June. No actor has had a 2026 calendar like his, and none has filled it with roles this different.',
      body: [
        'Fifteen years ago Robert Pattinson was the vampire from “Twilight” and spent the following decade doing everything possible not to be: Cronenberg, the Safdies, Claire Denis, “The Lighthouse”. That read as flight. 2026 does not: he is a character actor with a leading man\'s face who has got the studios to pay him for doing exactly what he did in independent cinema, only with two hundred million dollars behind it.',
        '## April: “The Drama”',
        'The year opened on 3 April with “The Drama”, Kristoffer Borgli\'s film for A24: a couple about to marry —Pattinson and Zendaya— whose wedding week is blown apart by a revelation. Premiered on 17 March, it cost 28 million dollars and took 132 million worldwide, an unusual result for an auteur comedy with no effects. It is also the first time in a long while that Pattinson plays a normal guy, and the interesting thing is that he is good at it.',
        '## July: Antinous',
        'Then came the big one. Christopher Nolan\'s “The Odyssey” opened on 17 July, shot entirely on IMAX 70mm cameras —the first film to do so— with Matt Damon as Odysseus. Pattinson is Antinous, the ringleader of the suitors besieging Penelope, and he has said he built him out of James Woods\'s Lester Diamond in “Casino”: a slimy man who knows he is not wanted. He was, reportedly, the only cast member who asked to read the script before signing. As of today the film stands at 1.687 billion dollars, the second-highest grosser of the year and the highest-grossing R-rated film ever. That a Homeric suitor is among its most talked-about characters says a lot about what Pattinson does with a supporting part.',
        '## September: a real host',
        'On 25 September comes “Primetime”, by Lance Oppenheim, also with A24, which competed at Venice earlier this month. Pattinson —who also produces— plays Chris Hansen, the host of “To Catch a Predator”, the show that set traps for child predators on camera. It is an uncomfortable part by design: a real, living man turned into a character in a film about what television does with other people\'s shame. Early reviews speak of a magnetic performance and of a film more interested in the psychology of the spectacle than in the scandal.',
        '## December: Scytale',
        'And on 18 December “Dune: Part Three”, by Denis Villeneuve, closes the year, with Pattinson as Scytale, the Face Dancer able to take any shape. His appearance in the trailer was its most discussed moment, and it is the role that best sums up the year: an actor who likes to disappear inside the mask and who is nonetheless recognisable the moment he opens his mouth.',
        '## And Batman, in between',
        'All of this he has juggled with “The Batman: Part II”, which started shooting on 12 June at Warner Bros. Studios Leavesden, with exteriors in London, Liverpool and Glasgow, and with Sebastian Stan and Scarlett Johansson as the Dents. Warner has dated it for 18 February 2028. In other words: while releasing four films, he was shooting the fifth.',
        'Pattinson has said it would have devastated him to give up any of the four. Understandably. It is hard to recall a year in which one actor was in an A24 comedy, in Nolan\'s biggest hit, in a portrait of a trash-TV host and in the third part of “Dune”. The strange thing is not that he was offered all four parts; the strange thing is that all four fit him. Box office and dates checked on 15 September 2026.',
      ],
    },
    gl: {
      kicker: 'Artigo · Perfil',
      title: 'O ano de Robert Pattinson: catro estreas, un vilán de Homero e o Batman que roda polo medio',
      lead: 'Unha comedia romántica con Zendaya en abril, o pretendente máis odioso de «A Odisea» en xullo, un presentador de televisión real en setembro e un cambiaformas de «Dune» en decembro. Co Batman de Matt Reeves rodándose en Londres desde xuño. Ningún actor tivo en 2026 un calendario coma o seu, e ningún o encheu con papeis tan distintos.',
      body: [
        'Hai quince anos Robert Pattinson era o vampiro de «Crepúsculo» e pasou a década seguinte facendo todo o posible por non selo: Cronenberg, os Safdie, Claire Denis, «O faro». Aquilo líase como fuxida. O de 2026 xa non: é un actor de carácter con cara de protagonista que conseguiu que os estudios lle paguen por facer exactamente o que facía no cine independente, só que con douscentos millóns de orzamento.',
        '## Abril: «O drama»',
        'O ano arrancou o 3 de abril con «The Drama», de Kristoffer Borgli para A24: unha parella a piques de casar —Pattinson e Zendaya— á que unha revelación lle rebenta a semana da voda. A película, presentada o 17 de marzo, custou 28 millóns de dólares e recadou 132 en todo o mundo, que para unha comedia de autor sen efectos é un resultado pouco habitual. É tamén a primeira vez que Pattinson fai de tipo normal en moito tempo, e o interesante é que se lle dá ben.',
        '## Xullo: Antínoo',
        'Logo veu a grande. «A Odisea» de Christopher Nolan estreouse o 17 de xullo, rodada integramente con cámaras IMAX de 70 mm —a primeira película en facelo— e con Matt Damon como Ulises. Pattinson é Antínoo, o cabecilla dos pretendentes que asedian a Penélope, e el mesmo contou que o construíu a partir do Lester Diamond de James Woods en «Casino»: un tipo viscoso que sabe que está de máis. Foi, segundo contan, o único do reparto que pediu ler o guión antes de asinar. A día de hoxe a película leva 1.687 millóns de dólares, a segunda máis taquilleira do ano e a película para adultos máis taquilleira da historia. Que un pretendente de Homero sexa un dos seus personaxes máis comentados di bastante do que Pattinson fai cun papel secundario.',
        '## Setembro: un presentador real',
        'O 25 de setembro chega «Primetime», de Lance Oppenheim, tamén con A24, que competiu en Venecia a principios de mes. Pattinson —que ademais produce— interpreta a Chris Hansen, o presentador de «To Catch a Predator», o programa que tendía trampas a pederastas ante as cámaras. É un papel incómodo por deseño: un home real, vivo, convertido en personaxe dunha película sobre o que a televisión fai coa vergonña allea. As primeiras críticas falan dunha actuación magnética e dunha película máis interesada na psicoloxía do espectáculo ca no escándalo.',
        '## Decembro: Scytale',
        'E o 18 de decembro pecha o ano «Dune: Parte tres», de Denis Villeneuve, onde é Scytale, o bailarín de rostro capaz de tomar calquera forma. A súa aparición no tráiler foi o máis comentado do avance, e é o papel que mellor resume o ano: un actor ao que lle gusta desaparecer dentro da máscara e que, aínda así, é recoñecible en canto abre a boca.',
        '## E Batman, polo medio',
        'Todo isto compaxinouno con «The Batman: Parte II», que empezou a rodarse o 12 de xuño nos estudios Warner de Leavesden, con exteriores en Londres, Liverpool e Glasgow, e con Sebastian Stan e Scarlett Johansson como os Dent. Warner fixouna para o 18 de febreiro de 2028. É dicir: mentres estreaba catro películas, estaba rodando a quinta.',
        'Pattinson dixo que o tería devastado ter que renunciar a calquera das catro. Enténdese. É difícil lembrar un ano en que un mesmo actor estivese nunha comedia de A24, no maior éxito de Nolan, nun retrato dun presentador da telelixo e na terceira parte de «Dune». O raro non é que lle ofrecesen os catro papeis; o raro é que os catro lle queden ben. Datos de taquilla e datas comprobados o 15 de setembro de 2026.',
      ],
    },
    eu: {
      kicker: 'Artikulua · Profila',
      title: 'Robert Pattinsonen urtea: lau estreinaldi, Homeroren gaizkile bat eta tartean filmatzen ari den Batman',
      lead: 'Komedia erromantiko bat Zendayarekin apirilean, «Odisea»-ko ezkongairik gorrotagarriena uztailean, benetako telebista-aurkezle bat irailean eta «Dune»-ko forma-aldatzaile bat abenduan. Matt Reevesen Batman Londresen filmatzen ekainetik. 2026an aktore batek ere ez du berea bezalako egutegirik izan, eta inork ez du hain paper desberdinekin bete.',
      body: [
        'Duela hamabost urte Robert Pattinson «Ilunabarra»-ko banpiroa zen eta hurrengo hamarkada hori ez izateko ahalegin guztiak egiten eman zuen: Cronenberg, Safdie anaiak, Claire Denis, «The Lighthouse». Hura ihes gisa irakurtzen zen. 2026koa ez: protagonista-aurpegia duen karaktere-aktore bat da, estudioek zinema independentean egiten zuen huraxe egiteagatik ordaintzea lortu duena, berrehun milioiko aurrekontuarekin.',
        '## Apirila: «The Drama»',
        'Urtea apirilaren 3an hasi zen «The Drama»-rekin, Kristoffer Borglirena A24rentzat: ezkontzear dagoen bikote bati —Pattinson eta Zendaya— errebelazio batek ezkontza-astea lehertzen dio. Martxoaren 17an aurkeztutako filmak 28 milioi dolar kostatu eta 132 bildu zituen mundu osoan, efekturik gabeko egile-komedia batentzat ezohiko emaitza. Aspaldian lehen aldia da Pattinsonek tipo normal batena egiten duela, eta interesgarriena da ondo egiten duela.',
        '## Uztaila: Antinoo',
        'Gero handia etorri zen. Christopher Nolanen «Odisea» uztailaren 17an estreinatu zen, osorik IMAX 70 mm-ko kamerekin filmatua —hori egin duen lehen filma— eta Matt Damon Ulises gisa. Pattinson Antinoo da, Penelope setiatzen duten ezkongaien buruzagia, eta berak kontatu du James Woodsen «Casino»-ko Lester Diamondetik eraiki zuela: soberan dagoela dakien tipo likatsu bat. Omen, sinatu aurretik gidoia irakurtzea eskatu zuen aktore bakarra izan zen. Gaur egun filmak 1.687 milioi dolar daramatza, urteko bigarren diru-bilketa handiena eta inoizko helduentzako filmik arrakastatsuena. Homeroren ezkongai bat pertsonaia aipatuenetakoa izateak asko esaten du Pattinsonek bigarren mailako paper batekin egiten duenaz.',
        '## Iraila: benetako aurkezle bat',
        'Irailaren 25ean «Primetime» dator, Lance Oppenheimena, A24rekin ere, hil hasieran Venezian lehiatu zena. Pattinsonek —ekoizle ere bada— Chris Hansen antzezten du, «To Catch a Predator» saioaren aurkezlea, pederastei kameren aurrean tranpak jartzen zizkien programa. Diseinuz deserosoa den papera da: benetako gizon bizi bat, telebistak besteen lotsarekin egiten duenari buruzko film bateko pertsonaia bihurtua. Lehen kritikek antzezpen magnetiko bat aipatzen dute, eta eskandaluan baino ikuskizunaren psikologian interes handiagoa duen filma.',
        '## Abendua: Scytale',
        'Eta abenduaren 18an «Dune: Hirugarren zatia»-k ixten du urtea, Denis Villeneuverena, non Scytale den, edozein forma har dezakeen aurpegi-dantzaria. Trailerreko agerpena aurrerapeneko unerik aipatuena izan zen, eta urtea ondoen laburbiltzen duen papera da: maskararen barruan desagertzea gustuko duen aktorea, eta hala ere ahoa irekitzean ezaguna dena.',
        '## Eta Batman, tartean',
        'Hori guztia «The Batman: Part II»-rekin uztartu du, ekainaren 12an Leavesdeneko Warner estudioetan filmatzen hasi zena, kanpoaldeak Londresen, Liverpoolen eta Glasgown, eta Sebastian Stan eta Scarlett Johansson Dent senar-emazte gisa. Warnerrek 2028ko otsailaren 18rako finkatu du. Hau da: lau film estreinatzen zituen bitartean, bosgarrena filmatzen ari zen.',
        'Pattinsonek esan du lau horietako edozeini uko egin behar izateak suntsituko zukeela. Ulertzekoa da. Zaila da gogoratzea aktore bera A24ko komedia batean, Nolanen arrakastarik handienean, telebista-zaborreko aurkezle baten erretratuan eta «Dune»-ren hirugarren zatian egon den urte bat. Arraroa ez da lau paperak eskaini izana; arraroa da laurak ondo geratzea. Diru-bilketa eta datak 2026ko irailaren 15ean egiaztatuak.',
      ],
    },
    ca: {
      kicker: 'Article · Perfil',
      title: 'L\'any de Robert Pattinson: quatre estrenes, un dolent d\'Homer i el Batman que roda entremig',
      lead: 'Una comèdia romàntica amb Zendaya a l\'abril, el pretendent més odiós de «L\'Odissea» al juliol, un presentador de televisió real al setembre i un canviaformes de «Dune» al desembre. Amb el Batman de Matt Reeves rodant-se a Londres des del juny. Cap actor no ha tingut el 2026 un calendari com el seu, i cap no l\'ha omplert amb papers tan diferents.',
      body: [
        'Fa quinze anys Robert Pattinson era el vampir de «Crepuscle» i va passar la dècada següent fent tot el possible per no ser-ho: Cronenberg, els Safdie, Claire Denis, «El far». Allò es llegia com a fugida. El del 2026 ja no: és un actor de caràcter amb cara de protagonista que ha aconseguit que els estudis li paguin per fer exactament el que feia al cinema independent, només que amb dos-cents milions de pressupost.',
        '## Abril: «The Drama»',
        'L\'any va arrencar el 3 d\'abril amb «The Drama», de Kristoffer Borgli per a A24: una parella a punt de casar-se —Pattinson i Zendaya— a qui una revelació li rebenta la setmana del casament. La pel·lícula, presentada el 17 de març, va costar 28 milions de dòlars i en va recaptar 132 a tot el món, que per a una comèdia d\'autor sense efectes és un resultat poc habitual. És també la primera vegada que Pattinson fa de tipus normal en molt de temps, i l\'interessant és que se li dona bé.',
        '## Juliol: Antínous',
        'Després va venir la gran. «L\'Odissea» de Christopher Nolan es va estrenar el 17 de juliol, rodada íntegrament amb càmeres IMAX de 70 mm —la primera pel·lícula a fer-ho— i amb Matt Damon com a Ulisses. Pattinson és Antínous, el capitost dels pretendents que assetgen Penèlope, i ell mateix ha explicat que el va construir a partir del Lester Diamond de James Woods a «Casino»: un tipus viscós que sap que hi sobra. Va ser, segons diuen, l\'únic del repartiment que va demanar llegir el guió abans de signar. A dia d\'avui la pel·lícula porta 1.687 milions de dòlars, la segona més taquillera de l\'any i la pel·lícula per a adults més taquillera de la història. Que un pretendent d\'Homer sigui un dels seus personatges més comentats diu força del que Pattinson fa amb un paper secundari.',
        '## Setembre: un presentador real',
        'El 25 de setembre arriba «Primetime», de Lance Oppenheim, també amb A24, que va competir a Venècia a principis de mes. Pattinson —que a més produeix— interpreta Chris Hansen, el presentador de «To Catch a Predator», el programa que parava trampes a pederastes davant les càmeres. És un paper incòmode per disseny: un home real, viu, convertit en personatge d\'una pel·lícula sobre el que la televisió fa amb la vergonya aliena. Les primeres crítiques parlen d\'una actuació magnètica i d\'una pel·lícula més interessada en la psicologia de l\'espectacle que en l\'escàndol.',
        '## Desembre: Scytale',
        'I el 18 de desembre tanca l\'any «Dune: Part tres», de Denis Villeneuve, on és Scytale, el dansaire de rostre capaç de prendre qualsevol forma. La seva aparició al tràiler va ser el més comentat de l\'avanç, i és el paper que millor resumeix l\'any: un actor a qui li agrada desaparèixer dins la màscara i que, tot i així, és recognoscible tan bon punt obre la boca.',
        '## I Batman, entremig',
        'Tot això ho ha compaginat amb «The Batman: Part II», que va començar a rodar-se el 12 de juny als estudis Warner de Leavesden, amb exteriors a Londres, Liverpool i Glasgow, i amb Sebastian Stan i Scarlett Johansson com els Dent. Warner l\'ha fixat per al 18 de febrer de 2028. És a dir: mentre estrenava quatre pel·lícules, estava rodant la cinquena.',
        'Pattinson ha dit que l\'hauria devastat haver de renunciar a qualsevol de les quatre. S\'entén. És difícil recordar un any en què un mateix actor hagi estat en una comèdia d\'A24, en el més gran èxit de Nolan, en un retrat d\'un presentador de la teleporqueria i en la tercera part de «Dune». L\'estrany no és que li hagin ofert els quatre papers; l\'estrany és que els quatre li escaiguin. Dades de taquilla i dates comprovades el 15 de setembre de 2026.',
      ],
    },
  },
};

/** Los artículos, del más reciente al más antiguo. */
export const articles: Article[] = [pattinson2026, emmys2026];
