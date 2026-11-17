# Estado del proyecto

> Lo mantiene Claude al terminar cada tarea, sin esperar a `/cerrar`. Es la memoria de trabajo: dónde se quedó y qué viene después.

## Estado actual
En producción en cinearchive.es (main en 4229ba3, desplegar tras la CI): Foro con cineclub sincronizado y hilos, «¿Qué echaban el día que…?», juegos Reparto y ¿En qué año?, 20 colecciones, Cine abierto con 124 películas, diario con una sola regla (vista = visionado con fecha) y correos a usuarios desde /admin (boletín «2026-11-foro» escrito y SIN ENVIAR). Todo en la v1.20 del changelog. Astro 7, despliegue desde GHCR, films_cache con tope.

## Siguientes pasos
- [ ] Search Console (alta y sitemap el 11 nov; verificada con public/googlea443dd55fa015b63.html, que no se debe borrar; Bing no). 16 nov: 1.842 bloqueadas por robots (las privadas y /login?next=…, a propósito), 1.723 con redirección (arreglado: ver sesión del 16), 179 noindex (gl/eu/ca sin traducir y privadas), 38.188 rastreadas sin indexar (decisión de Google: fichas parecidas a TMDB en 5 idiomas). Tras desplegar: pedir validación de «Página con redirección» y, a final de mes, ver qué búsquedas traen gente y escribir artículos para ellas.
- [ ] Foro: pensar en avisos (respuestas a tus hilos en Notificaciones) y en moderación desde /admin si hay movimiento.
- [ ] Cine abierto subtitulado por la comunidad (idea 1) y visionado comentado (idea 2): aparcadas hasta que haya comunidad.
- [ ] Difundir la web: lista de sitios en el vault (SEO y difusión).
- [ ] (Aparcado) Más cine con permiso: la NFB de Canadá deja incrustar (nfb.ca/film/<slug>/embed/player/, oEmbed con datos). Probado el 8 nov desde España: 44 de 50 se ven (todas las clásicas de McLaren, Óscar…). Sus condiciones piden uso no comercial y enlace a la NFB; antes, pedirles permiso por escrito. El reproductor carga Google Tag Manager: cargarlo solo al pulsar, frame-src en la CSP y mención en privacidad.
- [ ] Comparar el contador con Umami para saber desde cuándo había visitas falsas (Sergio pasa los números).
- [ ] Copia de las copias fuera del VPS: el CRM 0.4.0 (cinearchiveCRM ff27fed) ya las baja desde la pestaña Servidor; probado. Queda decidir si se hace solo cada semana.
- [ ] Tras desplegar lo del 8 nov (Wikidata al llegar, IP de Oracle fuera, films_cache): repetir «Rastreadores» y la consulta de films_cache por horas y comparar la carga con el 7 nov (1,5, CPU al 100 % a ráfagas).
- [ ] Tras desplegar lo del 12 nov: comparar la CPU del VPS con la de antes (las fichas en gl/eu/ca/es ya no piden TMDB si la fila de films_cache tiene menos de un día y su `_lang`; el inglés sí). Las filas viejas se rehacen solas la primera vez que se abren.
- [ ] Pendiente de decidir: Disallow en robots.txt para /gl/, /eu/ y /ca/ en film/ y person/ (más de la mitad del rastreo, pero Google dejaría de indexar las pocas fichas traducidas). Baidu se deja entrar (decisión de Sergio).
- [ ] Umami a dieta: límite de memoria de su Node, como la app (hoy ~140 MB).
- [ ] Revisar en Umami qué secciones se usan y dónde se va la gente antes de añadir nada nuevo.
- [ ] Productora: que Piensa asocie productora.cinearchive.es al hosting WordPress con SSL (el HSTS de cinearchive.es exige HTTPS), subir el tema 1.3.0 y rellenar «Ese no era».
- [ ] Valorar crear una asociación cultural y pedir ISSN para optar a la subvención de revistas de cultura 2027 y a Claude for Nonprofits.
- [ ] Si crece el tráfico: que Caddy sirva directamente lo prerenderizado y /_astro (sin pasar por Node), o Cloudflare delante.
- [ ] Tras desplegar 44d6c9e y 8ce9483: probar en producción /games (Fotograma actuales y clásicos, Cronología y la nota, diario e ilimitado), el foco con tabulador en la portada, /search?q=kubrick sin saltos y que cerrar sesión siga funcionando.
- [ ] Juegos, siguiente fase: estadísticas en la cuenta con insignias y clasificación entre la gente que sigues (Reparto ya está hecho).
- [ ] Valorar un generador para las crónicas con fotos: de zip + nombres por foto a fotos en tres tamaños y galería escrita en articles.ts.
- [ ] Comprobar en producción con sesión real que la cabecera no salta y que llegan las notas de OMDb (el 8 nov la cuota estaba agotada).
- [ ] Probar el correo por seguidor nuevo en producción (casilla en Preferencias y que otra cuenta te siga): en local no hay Resend.
- [ ] Tras desplegar 4229ba3: en /admin → Correos, ver la vista previa del boletín «2026-11-foro», mandarse la prueba y enviarlo a todos; escribir y borrar un borrador de prueba (la pantalla no se probó a clics).
- [ ] Tras desplegar: comprobar en el diario que marcar «Vista» apunta el visionado y que las vistas antiguas aparecen; si molestan las de Letterboxd sin diario, se reconocen por user_viewings.source = 'auto'.
- [ ] Primera sesión real del cineclub: viernes 20 nov 22:00 («El circo»); comprobar vídeo (media-src en Caddy), sincronía y chat con varias personas.
- [ ] Crónicas con fotos del Festival de Sevilla si Ana Gómez Collado pasa más (campo photos, fotos a 3600/1800/900 px).

## Última sesión

### 2026-11-17
- Diario con una sola regla: vista (marcar, puntuar, reseñar o favorita) = visionado con fecha → diario, «Últimos visionados» y reseñas. Nota al último visionado apuntado; «Quitar» borra también los visionados (doble clic).
- Migración 0028: visionados para las vistas que no tenían (source = 'auto'; las vistas importadas de Letterboxd sin diario toman la fecha de importación).
- /admin → Correos: escribir correos propios con la plantilla (borradores en newsletter_issues, migración 0029; castellano obligatorio, resto cae en él), duplicar, vista previa, prueba y envío.
- Probado en local los 8 casos del diario y la API de correos con cuenta admin de prueba. Tests 717 y build OK. Subido en 4229ba3.

### 2026-11-16
- Diario: «Vista otra vez» (revisionados), la nota va al visionado, «Cuándo la viste» mueve el visionado; reseñas arregladas (ya no van a «Pendiente», guardar vacío no crea nada, aviso si no se guarda, tope 2.000).
- Search Console: de 271 enlaces internos que redirigían a 0 (selector de idioma con las alternativas de la página, lib/filmlinks.ts, palmarés con titles en 5 idiomas).
- Foro (/foro, en portada): hilos por categoría y cineclub sincronizado (viernes 22:00 y domingos 18:00, MP4 de Internet Archive, chat por sondeo); «¿Qué echaban el día que…?» en Estrenos. Migración 0026.
- Contenido: palmarés de Sevilla, «Abre el cineclub», «Diez películas nuevas», «1928»; Cine abierto 114 → 124 (copias completas comprobadas).
- Boletín de novedades: news_email (encendido por defecto), baja firmada en un clic, envío desde /admin. Migración 0027. Subido en bc4d5ae.

### 2026-11-12
- CPU de las fichas (medido en local con build de producción y carga como la de los bots): una ficha ya en films_cache costaba ~3 ms, pero cada vez que caducaba la memoria de 10 min se volvía a pedir a TMDB la ficha entera (~100 kB de JSON, más traducciones y nombres latinos), y los bots abren cada película en los 5 idiomas. Ahora films_cache guarda el idioma (`_lang`) y las traducciones gl/eu/ca (`_tr`) dentro de `tmdb` (sin migración) y `sirveLaCache` pinta desde ahí si la fila tiene menos de un día: es/gl/eu/ca comparten la de castellano, el inglés tiene la suya (si se guarda en inglés, la próxima en castellano la sustituye). Medido: las mismas fichas en gl/ca/eu pasan de 10-28 a 240-290 páginas/s. Personas: la memoria va por idioma de TMDB (es/gl/eu/ca comparten) y una sola petición si llegan dos a la vez. `fmtMoney` reutiliza el Intl.NumberFormat (`numberFormat`/`formatUsd` en lib/format.ts). Tests en films-cache.test.ts.
- Juegos nuevos: Reparto (/games/reparto, los 6 primeros del reparto del sexto al protagonista, uno más por fallo; 1.376 películas: sin animación, documentales ni nombres en otro alfabeto) y ¿En qué año? (/games/anyo, 5 películas de años distintos, 10 puntos menos uno por año de diferencia; sal distinta de Cronología). Diario e ilimitado, APIs /api/games/reparto y /api/games/anyo, textos en 5 idiomas. pool.json con `reparto` (build-game-pool.mjs --refrescar, mismas películas y orden, ningún título cambiado). El buscador de títulos sale de Fotograma a lib/ui/guessbox.ts y lo usan los dos. Probado en el navegador (fallar, acertar, partida completa de ¿En qué año? y Fotograma tras el cambio). Tests (675) y build OK.

### 2026-11-11
- Colecciones: 8 nuevas (de 12 a 20), todas con 8 o 9 películas y textos en los 5 idiomas: nuevo-hollywood, nuevo-cine-aleman, cine-latinoamericano, cine-irani, western, hitchcock, musical-clasico y terror-clasico. IDs de TMDB comprobados uno a uno con director y año; carteles del mosaico bajados solo para las nuevas. Ya no hace falta que las películas estén en films.json (getFilmsBrief las pide y cachea); cambiada la nota de collections.json. Algunas repiten con otras colecciones (Taxi Driver, Psicosis, Vértigo, La ventana indiscreta, El sabor de las cerezas, Nader y Simin). Changelog: una línea en la v1.20. Probado en local (/collections con 20, /collections/western con carteles, /eu/collections/cine-irani). Tests (661) OK.
- Search Console dado de alta con el archivo de verificación en public/ (1a2dbcf). Bing no.

### 2026-11-09
- Juegos, arreglos tras probarlos Sergio. Fotograma: el buscador perdona el orden de las palabras, las cortas que faltan («señor anillos»), espacios y guiones («spiderman»), romanos («padrino 2») y erratas («pulp fixion», hasta 2 en palabras de 5 letras o más), y busca también por el título de los otros idiomas (`aka` en /api/games/titles); nombres normalizados una vez por película (de ~50 a ~16 ms por búsqueda entre 1.587). Aviso «No es X, pero vas bien: es de la misma saga» (◆ en la lista; `collection` en pool.json, `fotoSameSaga`, solo actuales). Teclado: Intro prueba la primera sugerencia aunque la lista se haya cerrado o los títulos no hubieran llegado, flecha abajo la reabre, el campo tiene el foco al cargar (solo con ratón: en el móvil abriría el teclado) y al terminar el foco va a «Otra película» (Intro) y vuelve al campo. ¿Cuál tiene mejor nota?: el rival era cualquiera de la bolsa, y con una campeona de 8,3 bastaba elegir siempre la izquierda (racha de 300). Ahora la mitad de las veces tiene más nota y la otra mitad menos, y la diferencia se estrecha con la racha (margen de 1,5 a 0,4 a partir de 11 aciertos; el navegador manda `streak`). Simulado contra la API eligiendo siempre la campeona: rachas de 0 a 4. build-game-pool.mjs: títulos con la regla de lib/titles.ts (España; si allí se estrenó con el original, el original), saga, `--refrescar` (mismas películas y orden) y `--salida`; scripts/vps/refrescar-juegos.sh para lanzarlo en el VPS con su .env. pool.json sin regenerar: en este equipo no hay .env. Probado en local con el navegador (Node 22.23.4 portátil en %LOCALAPPDATA%\node-portable, porque el del equipo es 22.12 y Astro 7 pide 22.23.4). Tests (657) y build OK.
- Juegos, segunda tanda. ¿Cuál tiene mejor nota?: la racha la lleva el servidor en un vale firmado (HMAC con BETTER_AUTH_SECRET: pareja, racha y hora; caduca a las 24 h; `notaToken`/`notaVerify`): un vale cambiado a mano o de otra pareja da 400, y sin vale (página abierta de antes) la racha cuenta desde 0. Hace falta antes de cualquier clasificación. Se elige con ← y → (aviso solo con ratón, `pointer-fine`) y al fallar el foco va a «Otra partida». Fotograma ilimitado: el navegador guarda las semillas jugadas (`cine:games:foto:vistas:<modo>`, últimas 250) y las manda en `?seen=`; el servidor descarta las que repetirían película (`freshFotoSeed`, solo las recientes hasta el 80 % del modo, para que en clásicos no se agoten). Probado en el navegador y contra la API. Tests (661) y build OK; nada de la bolsa ni de la firma en el JS del navegador.
- Bolsa refrescada en el VPS con scripts/vps/refrescar-juegos.sh y traída por scp: mismas 1.587 películas y orden (los retos no cambian), 178 títulos en castellano pasan al de España («American Psycho», «Pulp Fiction», «Gladiator», «Interstellar», «Tadeo Jones 3»), 697 películas con saga. Revisado el diff entero; tests (661) y build OK.
- Sección de Juegos (/games, 5 idiomas): Fotograma (actuales con fondos de TMDB sin texto y clásicos con fotogramas propios de Cine abierto), Cronología y ¿Cuál tiene mejor nota? Reto diario igual para todos, cambia a medianoche de Madrid (n.º 1 = 9 nov). Páginas estáticas + /api/games/*; soluciones solo en el servidor; progreso en localStorage. Bolsa de 1.587 películas (scripts/build-game-pool.mjs → src/data/games/pool.json); fotogramas de clásicos con ffmpeg (scripts/build-game-frames.mjs). Enlaces en portada, Descubrir y pie; anotado en la v1.20 del changelog (con lo social y el buscador, que faltaban) y en privacidad. Probado en escritorio y móvil. Después: modo ilimitado en Fotograma (actuales y clásicos) y Cronología (/ilimitado: retos al azar con semilla; la película sale de un HMAC con BETTER_AUTH_SECRET para que la semilla no delate la solución), y arreglos (clásicos sin fotogramas daba 500 → 503 con aviso; doble clic en Comprobar gastaba dos intentos; arrastre que se perdía; mejor marca de la nota que no se guardaba a mitad de racha; sugerencias que se cerraban en el móvil; país de las pistas sin traducir; fondos a tamaño original para que el zoom no se pixele). Fotogramas de clásicos: 218 de las 114 películas, revisados con hoja de contactos (fuera 8 rótulos, créditos y logotipos; los de El fantasma de la ópera, sacados a mano) y con nombres al azar, porque con el de la película la solución se leía en la URL (hay test). Crédito propio en clásicos (Internet Archive, no TMDB). Tests (646) y build OK. Subido a main.
- Revisión de velocidad, enlaces y accesibilidad: ningún enlace roto en ~1.900 ni errores 500 en local. Arreglado: el cliente de sesión (29 kB, más de la mitad del JS de cada página) solo se carga al cerrar sesión; el buscador ya no salta al llegar con ?q= (CLS 0,19 → 0: la caja de resultados sale visible desde el servidor con alto mínimo); foco visible con teclado en toda la web (doble anillo tinta/ocre en :focus-visible); estrellas de las reseñas y avisos de /accessibility en ochre-dim (el ocre daba 1,8:1) y fechas en text-muted (text-outline daba 4,3:1); nombres para lectores de pantalla en la película del día, la nota de la ficha y «Nueva lista»; Esc cierra el menú del móvil y devuelve el foco. Tests (646) y build OK. Subido a main.

## Decisiones
- **films_cache con tope** (7 nov): 20.000 películas sin dueño como mucho; las de usuarios no se borran nunca. Las copias de seguridad no llevan sus datos.
- **Visitas solo con JavaScript** (7 nov): el contador cuenta el aviso del navegador, no las peticiones al servidor, para que los rastreadores no lo inflen. Lo inflado hasta entonces se queda.
- **SSR y claves solo en el servidor**: ninguna API key se expone al navegador; todo pasa por `/api/*`.
- **"Dónde ver" desde TMDB (JustWatch)** en lugar de Watchmode, porque su plan gratuito se agotaba.
- **Umami dentro del Postgres existente** (base propia, no servidor propio) para no gastar 150 MB más de RAM. Versión clavada en 3.4.0.
- **Versión del service worker calculada del build** (`integrations/sw-version.mjs`) para que la caché no crezca sin límite.
- **Castellano sin prefijo** en la URL canónica (`cinearchive.es/...`).
- Techos de memoria por contenedor y Postgres ajustado a un VPS de 1,8 GB.
- Importación de Letterboxd: lo que ya hay en Cine Archive gana; Letterboxd solo rellena huecos y reimportar no duplica.
- Fichas en gallego, euskera y catalán sin sinopsis traducida se sirven con noindex para no anunciar copias en castellano como traducciones.
- Las secciones bajo /u/<usuario>/ no pueden llamarse como una página de primer nivel (diary, watchlist…): el comodín de idioma [...lang] las captura. Por eso son viewings/favorites/pending.
- `typescript` va declarado en devDependencies a propósito: better-auth 1.7 se instala con `--legacy-peer-deps` por peers opcionales de frameworks que no usamos, y sin esa línea typescript se cae del lockfile y `npm ci` falla en Docker.
- Antes de añadir secciones nuevas, mirar qué se usa: la Fonoteca se publicó y se retiró en tres días.
- Una nota sin texto no es una reseña: en el perfil sale como estrellas en los visionados, no como tarjeta.
- «Volver» usa history.back() solo si el enlace apunta exactamente a la página anterior (mismo origen, ruta y consulta); si no, navega al href. Así no hay bucles y se conserva el scroll.
- Todo ?next= pasa por safeNext(): solo rutas que empiezan por / en el propio sitio, sin // ni /\ ni /login.
- Juegos con imágenes de TMDB (fondos sin texto) aunque sean de películas con derechos: Sergio asume el riesgo; crédito «Imágenes: TMDB» y retirada por contacto@cinearchive.es. Los clásicos usan fotogramas propios de Cine abierto (dominio público).
- Juegos sin cuenta: progreso y rachas solo en localStorage; las soluciones nunca viajan al navegador antes de terminar. El ilimitado elige la película con un HMAC de la semilla y BETTER_AUTH_SECRET.
- Los retos diarios salen de la bolsa src/data/games/pool.json: regenerarla cambia los retos de los días siguientes.
- Nada de emojis en la web: iconos en SVG y ▶/↗/✕ con el selector de texto U+FE0E.
- Boletín encendido por defecto para cuentas existentes (art. 21.2 LSSI, decisión de Sergio) con baja en un clic; nunca baja por GET.
- Cineclub sin WebSockets (sondeo cada 4 s) por la RAM del VPS; calendario sin base de datos, fijadas en src/data/cineclub.json.
- Ideas 1 y 2 (subtítulos de la comunidad, visionado comentado) aparcadas hasta que haya comunidad.

## Problemas conocidos
- Margen de RAM y conexiones muy justo en el VPS: cualquier servicio nuevo tiene que caber en lo que queda.
- Si no hay `RESEND_API_KEY`, la confirmación de correo se desactiva sola (se avisa en el log).
- Toda la web (incluido lo estático) pasa por un único proceso de Node en el VPS.
- El arrastre de Cronología solo se ha probado con eventos de puntero simulados (y con los botones de subir y bajar); falta probarlo con el dedo en un móvil real.
- No se han visto los errores de producción: hay que mirarlos en el VPS (docker compose logs --since 168h app | grep -ci error).
