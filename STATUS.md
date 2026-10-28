# Estado del proyecto

> Lo mantiene Claude con `/cerrar`. Es la memoria de trabajo: dónde se quedó y qué viene después.

## Estado actual
En producción en cinearchive.es, con todas las secciones funcionando (cine abierto, hemeroteca, biblioteca, filmoteca, Descubrir, dosieres, palmarés, cuentas, recomendaciones, panel de administración). El changelog llega a la **v1.15** (25 oct). Lo del 27 oct (diario de visionados, importar de Letterboxd, Tu año en cine, medias estrellas, buscador del archivo, seguridad de la cuenta…) aún no tiene entrada en el changelog y trae la migración `drizzle/0020_viewings_diary.sql`.

## Siguientes pasos
- [ ] Desplegar en el VPS lo del 23–27 oct y aplicar la migración `0020_viewings_diary` (`git pull && docker compose up -d --build`); comprobar diario, importación de Letterboxd y /year
- [ ] Anotar la **v1.16** en `src/data/changelog.json` (5 idiomas): diario de visionados, importar de Letterboxd, Tu año en cine, medias estrellas, buscador del archivo, seguridad y datos de la cuenta, Filmoteca traducida, artículos con vídeo
- [ ] Revisar que Umami (`analitica.<dominio>`) recoge visitas y que el CRM lee sus números.

## Última sesión

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

## Problemas conocidos
- Margen de RAM y conexiones muy justo en el VPS: cualquier servicio nuevo tiene que caber en lo que queda.
- El contenido editorial solo existe en ES/EN; en GL/EU/CA la interfaz está traducida pero los artículos no.
- Si no hay `RESEND_API_KEY`, la confirmación de correo se desactiva sola (se avisa en el log).
