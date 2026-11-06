# Estado del proyecto

> Lo mantiene Claude al terminar cada tarea, sin esperar a `/cerrar`. Es la memoria de trabajo: dónde se quedó y qué viene después.

## Estado actual
En producción en cinearchive.es, con 1.095.271 visitas el 5 nov. En main está la retirada de la Fonoteca, la v1.19 corregida, la CI y better-auth 1.7.18; hay que desplegarlo para que llegue a la web. Tests (550) y build en verde.

## Siguientes pasos
- [ ] Seguridad: migrar Astro 5 a 7 (y `@astrojs/node`), aparte: es lo que cierra el aviso crítico y casi todos los que quedan. `npm audit` da 8 en producción (1 crítico, 4 altos). Tras desplegar, probar el acceso con Google y GitHub, y el correo de confirmación y el de restablecer contraseña.
- [ ] Revisar en Umami qué secciones se usan y dónde se va la gente antes de añadir nada nuevo.
- [ ] Productora: que Piensa asocie productora.cinearchive.es al hosting WordPress con SSL (el HSTS de cinearchive.es exige HTTPS), subir el tema 1.3.0 y rellenar «Ese no era».
- [ ] Revisar que Umami (`analitica.<dominio>`) recoge visitas y que el CRM lee sus números.
- [x] Enviar los correos para el código de GTA VI (Xbox España: microsoft@comunicacionrrpp.es, CC xbox@comunicacionrrpp.es; Rockstar: pr@rockstargames.com, sin verificar).
- [ ] Valorar crear una asociación cultural y pedir ISSN para optar a la subvención de revistas de cultura 2027 y a Claude for Nonprofits.
- [ ] Si crece el tráfico: que Caddy sirva directamente lo prerenderizado y /_astro (sin pasar por Node), o Cloudflare delante.

## Última sesión

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

### 2026-10-29
- Changelog v1.16 en los 5 idiomas (diario, Letterboxd, Tu año en cine, medias estrellas, buscador, cuenta, Filmoteca traducida, artículos con vídeo).
- Títulos por idioma: films_cache guarda `titles` {es,en,gl,eu,ca} (lib/titles.ts, migración 0021); listas, diario y perfil ya no mezclan idiomas tras importar de Letterboxd. Las fichas antiguas se completan solas (40 al momento, el resto en segundo plano).
- Sagas: bajo «Dónde ver», el resto de la colección de TMDB con carteles pequeños (getSaga, sagaName, partTitle en lib/tmdb.ts).
- Perfil público resumido: cifras, últimos visionados, favoritas, pendientes (12 de cada) y solo reseñas con texto; «Ver todo» en /u/<usuario>/viewings|favorites|pending y /u/<usuario>/reviews, de 48/24 en 24.
- Rejillas que cierran en rectángulo (components/PosterGrid.astro, lib/grid.ts) y carteles nítidos y estrellas alineadas en Tu año en cine.
- /u/<usuario>/<otra cosa> da 404 (PROFILE_SUBPAGES en lib/routes.ts): antes servía páginas de primer nivel y /u/x/diary daba 500.
- Prueba de carga local: ~1.000–2.000 visitantes simultáneos estimados en el VPS; el cuello real es TMDB con fichas sin cachear.
- Investigadas ayudas: revistas de cultura del Ministerio (próxima en primavera de 2027, pide entidad) y Claude for Nonprofits; conviene crear una asociación cultural.

### 2026-10-27
- Mi cine: diario de visionados (`/diary`, revisionados, migración 0020), medias estrellas, importar desde Letterboxd (ZIP leído en el navegador, vista previa y sin duplicar) y «Tu año en cine» (`/year/2026`, versión pública e imagen 1080×1920 para Instagram).
- Cuenta: cambiar contraseña, descargar los datos (`/api/me/export`) y borrar la cuenta.
- Búsqueda: «En el archivo» primero en `/search` (hemeroteca, artículos, glosario…; `/api/search/site`). Encuentra tu cine: búsqueda en la URL, ampliación automática a 50 km, «Ver en el mapa» y espejos de Overpass más rápidos.
- Idiomas: Filmoteca con títulos y países traducidos y premios de OMDb reescritos; fichas en gallego, euskera y catalán con su texto o con noindex.
- Recomendaciones: suman las coincidencias, baja lo parecido a lo mal valorado y peticiones a TMDB de seis en seis.
- Contenido: 20 fanzines de culto en la hemeroteca (CC en Internet Archive), 13 películas más en Cine abierto, colecciones con mosaico de carteles, hemeroteca que alterna el fondo clásico; artículos con vídeo, fotogramas y firma, y artículos sobre el Festival de Sevilla 2026 y el tráiler de GTA VI.
- Móvil: título de la ficha a la vista, filtros plegables en Descubrir y zonas de pulsación de 44 px.

### 2026-10-25
- Descubrir: las plataformas aparecen al elegir país (`/api/films/providers`) y las recomendaciones recuerdan mejor los gustos (`lib/recs.ts`).
- Analítica propia con Umami en el VPS, sin cookies, con su política en `legal.ts`.
- Repaso de la portada, el glosario, la 404 y la navegación («Que cada cosa esté donde tiene que estar»), portadas y reparto más nítidos, enlaces que faltaban y 230 textos sobrantes eliminados.
- 23 oct: PWA (página `/offline` en tu idioma, barra inferior en móvil, botón de volver) y arreglos del contador de visitas.

## Decisiones
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
