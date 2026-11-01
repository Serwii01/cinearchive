# Estado del proyecto

> Lo mantiene Claude con `/cerrar`. Es la memoria de trabajo: dónde se quedó y qué viene después.

## Estado actual
En producción en cinearchive.es, pero el VPS va por detrás de main: falta desplegar del 29 al 31 oct (títulos por idioma con la migración 0021, sagas, perfil, carteles nítidos, 404 por idioma, navegación sin bucles, Instagram y la página del equipo). El changelog se quedó en la v1.16.

## Siguientes pasos
- [x] Desplegar en el VPS lo del 23–27 oct y aplicar la migración `0020_viewings_diary` (`git pull && docker compose up -d --build`); comprobar diario, importación de Letterboxd y /year
- [ ] Revisar que Umami (`analitica.<dominio>`) recoge visitas y que el CRM lee sus números.
- [ ] Enviar los correos para el código de GTA VI (Xbox España: microsoft@comunicacionrrpp.es, CC xbox@comunicacionrrpp.es; Rockstar: pr@rockstargames.com, sin verificar).
- [ ] Valorar crear una asociación cultural y pedir ISSN para optar a la subvención de revistas de cultura 2027 y a Claude for Nonprofits.
- [ ] Si crece el tráfico: que Caddy sirva directamente lo prerenderizado y /_astro (sin pasar por Node), o Cloudflare delante.
- [ ] Desplegar en el VPS todo lo que hay en main hasta b25a439 (`git pull && docker compose up -d --build`, aplica la migración 0021). Después comprobar: títulos y sagas, «volver» entre películas parecidas, la página del equipo y el enlace a Instagram.
- [ ] Anotar en el changelog lo posterior a la v1.16, en los 5 idiomas: v1.17 (títulos en tu idioma, sagas, perfil con «Ver todo») y v1.18 (navegación sin bucles, búsqueda que se recuerda, Instagram, equipo, carteles nítidos, 404 por idioma).
- [ ] Corregir en awards.json el director de Wings (1929): es William A. Wellman.
- [ ] Productora: que Piensa asocie productora.cinearchive.es al hosting WordPress con SSL (el HSTS de cinearchive.es exige HTTPS), subir el tema 1.3.0 y rellenar «Ese no era».

## Última sesión

### 2026-11-01
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
- Una nota sin texto no es una reseña: en el perfil sale como estrellas en los visionados, no como tarjeta.
- «Volver» usa history.back() solo si el enlace apunta exactamente a la página anterior (mismo origen, ruta y consulta); si no, navega al href. Así no hay bucles y se conserva el scroll.
- Todo ?next= pasa por safeNext(): solo rutas que empiezan por / en el propio sitio, sin // ni /\ ni /login.

## Problemas conocidos
- Margen de RAM y conexiones muy justo en el VPS: cualquier servicio nuevo tiene que caber en lo que queda.
- El contenido editorial solo existe en ES/EN; en GL/EU/CA la interfaz está traducida pero los artículos no.
- Si no hay `RESEND_API_KEY`, la confirmación de correo se desactiva sola (se avisa en el log).
- Nombres de personas de TMDB en su alfabeto original (p. ej. «王家衛» para Wong Kar-wai en directores de Tu año en cine).
- Toda la web (incluido lo estático) pasa por un único proceso de Node en el VPS.
