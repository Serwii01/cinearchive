# Estado del proyecto

> Lo mantiene Claude con `/cerrar`. Es la memoria de trabajo: dónde se quedó y qué viene después.

## Estado actual
En producción en cinearchive.es, con todas las secciones funcionando (cine abierto, hemeroteca, biblioteca,
filmoteca, Descubrir, dosieres, palmarés, cuentas, recomendaciones, panel de administración). La última versión
anotada en el changelog es la **v1.14** (22 oct, la web se instala como aplicación). Lo hecho del 23 al 25 de
octubre aún no tiene entrada en el changelog.

## Siguientes pasos
- [ ] Comprobar que los commits del 23–25 oct están desplegados en el VPS (`git pull && docker compose up -d --build`).
- [ ] Anotar la **v1.15** en `src/data/changelog.json` (5 idiomas): barra inferior en móvil, analítica propia sin cookies, Descubrir con plataformas por país, recomendaciones con mejor memoria y el repaso de portadas, enlaces y textos.
- [ ] Revisar que Umami (`analitica.<dominio>`) recoge visitas y que el CRM lee sus números.

## Última sesión
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

## Problemas conocidos
- Margen de RAM y conexiones muy justo en el VPS: cualquier servicio nuevo tiene que caber en lo que queda.
- El contenido editorial solo existe en ES/EN; en GL/EU/CA la interfaz está traducida pero los artículos no.
- Si no hay `RESEND_API_KEY`, la confirmación de correo se desactiva sola (se avisa en el log).
