# Estado del proyecto

> Lo mantiene Claude al terminar cada tarea, sin esperar a `/cerrar`. Es la memoria de trabajo: dónde se quedó y qué viene después.

## Estado actual
En producción en cinearchive.es, al día con main (8495436 desplegado o por desplegar): Astro 7, despliegues sin compilar en el VPS (menos de 1 min), contador sin visitas de rastreadores, films_cache con tope (disco al 21 %), copias nocturnas, vigilancia por correo y menos CPU en Postgres. Contador en unas 1.574.000 el 7 nov.

## Siguientes pasos
- [ ] Sergio: dar de alta la web en Google Search Console y Bing Webmaster Tools (verificación por DNS) y enviar sitemap-index.xml. Con eso, ver qué búsquedas traen gente y escribir artículos para ellas.
- [ ] Difundir la web: lista de sitios en el vault (SEO y difusión).
- [ ] (Aparcado) Más cine con permiso: la NFB de Canadá deja incrustar (nfb.ca/film/<slug>/embed/player/, oEmbed con datos). Probado el 8 nov desde España: 44 de 50 se ven (todas las clásicas de McLaren, Óscar…). Sus condiciones piden uso no comercial y enlace a la NFB; antes, pedirles permiso por escrito. El reproductor carga Google Tag Manager: cargarlo solo al pulsar, frame-src en la CSP y mención en privacidad.
- [ ] Comparar el contador con Umami para saber desde cuándo había visitas falsas (Sergio pasa los números).
- [ ] Copia de las copias fuera del VPS: el CRM 0.4.0 (cinearchiveCRM ff27fed) ya las baja desde la pestaña Servidor; probado. Queda decidir si se hace solo cada semana.
- [ ] Tras desplegar lo del 8 nov (Wikidata al llegar, IP de Oracle fuera, films_cache): repetir «Rastreadores» y la consulta de films_cache por horas y comparar la carga con el 7 nov (1,5, CPU al 100 % a ráfagas).
- [ ] Pendiente de decidir: Disallow en robots.txt para /gl/, /eu/ y /ca/ en film/ y person/ (más de la mitad del rastreo, pero Google dejaría de indexar las pocas fichas traducidas). Baidu se deja entrar (decisión de Sergio).
- [ ] OMDb: los bots gastan la cuota diaria (1.000) en fichas sueltas. Valorar pedir las notas también al llegar, como Wikidata.
- [ ] Umami a dieta: límite de memoria de su Node, como la app (hoy ~140 MB).
- [ ] Revisar en Umami qué secciones se usan y dónde se va la gente antes de añadir nada nuevo.
- [ ] Productora: que Piensa asocie productora.cinearchive.es al hosting WordPress con SSL (el HSTS de cinearchive.es exige HTTPS), subir el tema 1.3.0 y rellenar «Ese no era».
- [x] Enviar los correos para el código de GTA VI (Xbox España: microsoft@comunicacionrrpp.es, CC xbox@comunicacionrrpp.es; Rockstar: pr@rockstargames.com, sin verificar).
- [ ] Valorar crear una asociación cultural y pedir ISSN para optar a la subvención de revistas de cultura 2027 y a Claude for Nonprofits.
- [ ] Si crece el tráfico: que Caddy sirva directamente lo prerenderizado y /_astro (sin pasar por Node), o Cloudflare delante.

## Última sesión

### 2026-11-08
- Servidor: las fichas ya no consultan Wikidata al pintarse (lo pide el navegador al llegar a «Localizaciones», por /api/films/[id]/locations, un trozo de página con rateLimit; components/FilmLocations.astro). films_cache solo se reescribe si cambia algo o tiene más de un día, y las notas de OMDb tienen su propia fecha (omdb_fetched_at, migración 0024) y vuelven a refrescarse cada 30 días. Caddy corta la IP 141.148.181.241. rastreadores.sh dice el periodo que cubre el registro y las peticiones por hora (sin probar: aquí no hay Python); el CRM ya no dice «24 h» (cinearchiveCRM). Tests (603), build y navegador OK.
- Informes del CRM («24 h», pero el registro de Caddy solo guarda las últimas horas: 4 × 25 MB son unas 35.000 peticiones): 35.179 peticiones, el 82 % fichas de película y persona, casi todas de bots. Lo más gordo: una IP de Oracle Cloud (141.148.181.241, 16 %, navegador Linux «compatible…»), Baidu (redes 116.179.32-33, 113.24.225 y 39.156.65, unas 6.700), PerplexityBot (18.97.9.0/24, 11 %), Exa y Claude-SearchBot (3,5 % cada uno) y Chrome de Mac repetidos (36 %, sin identificar). 2.528 respuestas 429: el límite de Caddy funciona. rastreadores.sh funciona en el VPS (hay Python). Postgres apenas gasta (unos 700 s en total): el gasto está en Node sirviendo fichas a bots. Upsert en films_cache en cada carga de ficha (436.872), aunque no cambie nada; y como fetchedAt se renueva siempre, las notas de OMDb de las fichas visitadas no se refrescan nunca. Umami: las consultas de periodos largos del CRM tardan de 6 a 22 s y leen hasta 8,5 GB.
- films_cache: de 20.235 a 296.558 películas en un día. Se escriben entre 8.000 y 27.000 por hora, sin parar, desde el 7 nov a las 19:00 (UTC); 199.512 de 300.334 son de fichas completas (con Wikidata) y solo 227 de usuarios: son bots abriendo fichas sueltas del catálogo de TMDB, sobre todo en en/gl/eu/ca (en castellano, solo 259 fichas en el registro). Cada ficha nueva pide TMDB, OMDb y Wikidata: unas 200.000 consultas al día a Wikidata. Eso es lo que gasta CPU.
- Cine abierto con el título de cada idioma: `titles` en pdfilms.json, traídos de TMDB (scripts/fetch-pd-titles.mjs, variante de España primero) y revisados a mano (fuera títulos de Latinoamérica, subtítulos largos en inglés y un catalán que mezclaba dos películas). pdTitle: gl/eu/ca caen en el castellano si falta; si no, el título de siempre. Se usa en tarjetas, fichas, páginas por tipo y década, portada, teletipo, buscador del sitio y JSON-LD; el buscador encuentra la película por cualquiera de sus títulos. «Battleship Potemkin» sale como «El acorazado Potemkin» en castellano y «El cuirassat Potemkin» en catalán. Tests (596), build y navegador OK. Anotado en la v1.20.
- Changelog: lo de Cine abierto (41 películas, filtros, páginas por tipo y década, fichas, enlace desde la ficha completa, imágenes nítidas) entra en la v1.20 en vez de abrir la v1.21. La v1.20 se titula ahora «Más cine abierto y una web más rápida y segura». Sergio no quiere versiones cada dos días.
- SEO: la ficha de cada película que está en Cine abierto enlaza con «Ver la película completa» (pdFilmByTmdbId). Páginas propias por tipo y por década en Cine abierto (/cinema/tipo/<tipo>, /cinema/decada/<década>; 15 tipos con muda y cortos, 10 décadas, mínimo 3 películas), con título y descripción propios, ItemList y enlaces entre ellas (CinemaGroup, CinemaGroupNav); las etiquetas de la ficha llevan ahí en vez de a ?tipo=. JSON-LD e imagen social en Biblioteca (Book), Hemeroteca (PublicationIssue) y Glosario (DefinedTermSet). Tests (593) y build en verde; revisado en el navegador en escritorio y móvil.

### 2026-11-07
- Imágenes de fuera: Cine abierto pasa de miniaturas de IA de 180 px a fotogramas de TMDB a 800 px en WebP (112 de 114; las otras 3, fotograma del vídeo con ffmpeg si está instalado; `"image": "ia"` fuerza IA, usado en Caminandes 1, que salía con el logo del episodio 3). Biblioteca: portada escaneada a 800 px como la hemeroteca (16 de 17), y portadilla (`"cover": "title"`) en 6 libros con tapa lisa o aviso de Google. 3,9 MB en total para Cine abierto. Revisadas todas a ojo en hojas de contactos.
- Cine abierto: 41 películas más (114 en total), verificadas en Internet Archive, con sinopsis en 5 idiomas; etiquetas de tipo, muda/sonora, idioma, imprescindibles, fecha de IA (fetch-pd.mjs) y enlace a TMDB (resolve-tmdb-ids.mjs --cine). Listado con filtros (tipo, sonido, duración, década, país, buscador) guardados en la URL y filas para empezar; ficha con botón a la ficha completa, «Si te gusta esta» y datos Movie+VideoObject para Google. Tests (584) y build en verde; revisado en el navegador en escritorio y móvil.
- Changelog v1.20 «Una web más rápida, más segura y más estable» (5 idiomas): listas/perfiles/diarios más rápidos, sin cortes al publicar, Astro 7 y cuentas actualizadas, copias nocturnas, contador solo de personas y portadas de la Biblioteca con marco.
- Sergio confirma que van bien la web en el móvil, el acceso con Google y GitHub y los correos.
- Disco del VPS al 71 % (41 de 58 GB): films_cache tenía 1.016.576 películas y 17 GB (los rastreadores recorren el catálogo de TMDB a través de las fichas) y Docker guardaba 12,6 GB de compilaciones viejas. Sergio liberó lo de Docker con `docker builder prune -af`.
- Poda diaria de films_cache (src/lib/cachecap.ts): se quedan las películas con dueño (perfil, listas, diario, catálogo del panel) y las 20.000 sueltas más recientes. La primera vez, a fondo (aparta, TRUNCATE, vuelve a meter): libera ~16 GB a los 10 min de desplegar, con la tabla bloqueada unos segundos. Probado en Postgres local con 150.000 filas.
- Desplegado: la poda a fondo dejó films_cache de 1.017.546 a 20.246 películas en 16 s; el disco pasó del 71 % al 21 % (46 GB libres). /api/health ya dice disk ok.
- Volver atrás: APP_TAG en docker-compose.yml y scripts/vps/volver.sh <commit> (comprueba que la imagen existe antes de tocar nada).
- Rastreadores: robots.txt cierra la puerta a 12 de entrenamiento de IA (no a buscadores ni asistentes); Caddy da 403 a 14 que no respetan robots.txt (Bytespider, herramientas SEO…); registro de peticiones de Caddy (4 x 25 MB, un par de días) y scripts/vps/rastreadores.sh para resumirlo. La CI valida el Caddyfile con la imagen de Caddy. rastreadores.sh sin probar: aquí no hay Python.
- CPU al 100 % a ráfagas (carga 1,5 en 1 núcleo, sin consultas largas en marcha): la app abría y cerraba hasta 10 conexiones a Postgres cada pocos segundos (pg las cierra a los 10 s). Ahora 2 fijas y las demás aguantan 5 min. Las listas pedían la ficha entera de cada película (16 kB); ahora Postgres devuelve solo lo que usa el resumen (probado en local contra la ficha entera). pg_stat_statements activado y scripts/vps/consultas.sh para ver qué gasta.
- Cron instalado en el VPS. Primera copia: cine 2,7 MB y umami 87 MB (unos 630 MB con los 7 días).
- /api/health dice `disk` (ok/low/unknown; aviso por debajo del 15 % libre) y la vigilancia de GitHub avisa por correo.
- scripts/vps: backup.sh (cada noche a las 3:30, 7 días, sin datos de films_cache, no copia si queda menos de 1 GB), restaurar.sh (pide confirmación, para el servicio), limpieza.sh (domingos: caché de compilación e imágenes sin usar de más de una semana) e instalar-cron.sh. Volcado y restauración probados en local.
- Contador de visitas: subía unas 2,9 por segundo (1.572.824 a las 16:02, unas 250.000 al día desde el 5 nov). Causa probable: un rastreador que cambia de IP y se hace pasar por Chrome; el middleware contaba las páginas del servidor sin JavaScript y cada petición suya era una huella nueva.
- Arreglo (ddcd6ed, desplegado): ya no cuenta el middleware; todas las páginas avisan desde el navegador con el POST a /api/visits. Por decisión de Sergio, lo ya sumado se queda en el total. Tests (549) y build en verde. Tras desplegar, de unas 190 a unas 10 por minuto.
- Primer Autodeploy con imágenes de GHCR: menos de 1 minuto desde el CRM. El VPS es amd64.
- Astro 7 (704b48a, fusionado en main; CI en verde, imagen de app en 1 min 46 s): Astro 5.18 a 7.4, @astrojs/node 11, Tailwind por PostCSS (la integración no admite Astro 7), compressHTML true (el nuevo valor por defecto quita espacios entre elementos en línea) y cssTarget para Safari 14 (Vite 8 escribía media queries que Safari antiguo no entiende). El compilador nuevo encontró una etiqueta rota en el Archivo: las portadas de la Biblioteca habían perdido su marco desde ca28bfb; arreglado. npm audit en producción: de 8 avisos (1 crítico, 4 altos) a 1 moderado (satori).
- Vigilancia: .github/workflows/vigilancia.yml comprueba /api/health y la portada cada 5 min (3 intentos) y GitHub avisa por correo si falla.

### 2026-11-06
- Commit 7bf4a09 con todo lo del 5 nov; la primera CI en GitHub pasa en 33 s.
- Por qué tardó tanto: antes el deploy reutilizaba la caché de Docker; esta vez había que reinstalar dependencias (lockfile nuevo) y compilar Caddy. Sergio no llegó a cortarlo: terminó solo.
- Commit 3a99246: la CI construye `app` y `caddy` en GHCR si pasan los tests; docker-compose.yml usa esas imágenes con pull_policy always, así el Autodeploy del CRM sirve sin recompilarlo; docker-compose.build.yml queda de reserva. Primera ejecución correcta: app 1 min 20 s, Caddy algo más de 3 min.
- Incidente en el deploy: el VPS se puso a compilar Caddy desde cero (xcaddy) y, de 17 comprobaciones entre las 22:29 y las 22:35, 8 no respondieron. La versión nueva entró a las 22:35:12.

### 2026-11-05
- Fonoteca retirada: página, datos, imágenes, script, tests, enlaces en Filmoteca e Info, buscador, 90 textos y la demo del disco en /style. No convenció a Sergio; sigue en el historial (bbb8c8a, f2f4361). /fonoteca dará 404, sin redirección.
- Se conservan el crédito de «Música» en las fichas (viene de TMDB) y lib/curated.ts (lo usa el Atlas); sus tests pasan a tests/curated.test.ts.
- Changelog v1.19 subido (9aa30d1) y corregido para no anunciar la Fonoteca: «Un Atlas nuevo y tu propio mapa del cine».
- Producción: contador en 1.095.271; portada, /team, /atlas, /changelog y /api/health responden; Instagram enlazado; sitemap correcto en /sitemap-index.xml. Sergio confirma que sagas y «volver» están bien.
- Post de Instagram del millón (línea moderna, «1M» con portadas y fotogramas dentro), fuera del repo: Desktop/Cine-Archive-Posts/un-millon, con _build/gen-millon-v2.mjs.
- El navegador integrado tiene bloqueados cinearchive.es e Instagram por permisos de sitio.
- CI nueva en .github/workflows/ci.yml: tests y build con Node 22 en cada push y PR a main, sin secretos; probado en local sin .env. La primera ejecución real será al subirla.
- Auditoría del build (976 páginas prerenderizadas): ninguna imagen sin alt, ningún title, description ni h1 ausente. Quedan 13 números de una misma revista compartiendo descripción y /offline con dos h1.
- Dependencias: `npm audit` en producción baja de 28 a 8 avisos; better-auth pasa de 1.6.20 a 1.7.18. Probado en local con el build y un Postgres temporal: registro, entrar, salir, cambiar contraseña, /account, borrar cuenta, límite de intentos y un usuario con hash de la 1.6. No probados: acceso con Google/GitHub ni correos reales.
- Dos problemas conocidos ya estaban resueltos y se quitan de la lista: los artículos existen en los 5 idiomas, y los nombres en alfabeto no latino se corrigen desde el 29 oct (lib/personnames.ts), también en Tu año en cine.

### 2026-11-02
- Fonoteca y su búsqueda (retiradas el 5 nov).
- Fichas: crédito de «Música» desde TMDB. Visionados: se apuntan al puntuar y se quita «Añadir visionado».
- Perfil: «Crea tu perfil público» se explica mejor, y los errores al guardar y la foto avisan de qué falta.
- Listas: las rejillas recuperan el marco completo. Guía de estilo ampliada con formularios, avisos y movimiento.

### 2026-11-01
- Atlas por 27 movimientos y décadas, con «Tu mapa»; 16 películas y 9 libros más; palmarés corregido (Wings, Slumdog Millionaire y películas codirigidas).
- Fichas: «volver» usa el historial cuando el enlace apunta a la página anterior (lib/ui/backnav.ts, data-back en película y persona); se acabó el bucle entre películas parecidas.
- Búsqueda: la consulta se guarda en la URL también al escribir (replaceState), así volver desde una ficha no deja /search vacío.
- Login: ?next= validado con lib/safenext.ts (solo rutas propias, nunca /login ni otros dominios); el ?next= de búsqueda, listas, controles de ficha y middleware conserva la consulta.
- Cambiar de idioma conserva ?q= y el #ancla.
- Instagram @cinearchive.es en el pie (src/data/social.ts) y en sameAs de la Organization (lib/seo.ts).
- Commits 453ec6c y b25a439 subidos a main. También están en main sin desplegar los del 30–31 oct: carteles nítidos, fichas más rápidas, sitemap, 404 por idioma, Encuentra tu cine y la página del equipo.
- Fuera del repo: tema WordPress «cinearchive-productora» 1.3.0 para productora.cinearchive.es (metrajes editables desde el navegador). Registro A ya creado en el DNS de Piensa; documentado en el vault (Productora.md).

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

## Problemas conocidos
- Margen de RAM y conexiones muy justo en el VPS: cualquier servicio nuevo tiene que caber en lo que queda.
- Si no hay `RESEND_API_KEY`, la confirmación de correo se desactiva sola (se avisa en el log).
- Toda la web (incluido lo estático) pasa por un único proceso de Node en el VPS.
