# Cine Archive

Archivo de cine abierto y multilingüe (ES/EN/GL/EU/CA): cine, prensa y libros de dominio público,
filmoteca sobre TMDB, palmarés, cuentas de usuario y recomendaciones. Producción: https://cinearchive.es
(VPS propio con Docker). El README tiene la descripción completa para humanos.

## Stack
- **Astro 7 en modo SSR** (`@astrojs/node` 11 standalone). El contenido editorial se prerenderiza; lo dinámico va por servidor.
- **PostgreSQL 16 + Drizzle ORM** (`src/db/schema.ts`, migraciones en `drizzle/`).
- **Better Auth**: email+contraseña, Google/GitHub opcionales y confirmación de correo vía Resend.
- **Tailwind 3**, por PostCSS (`postcss.config.mjs`; la integración @astrojs/tailwind no admite Astro 7): el design system (paleta, tipografía) vive en `tailwind.config.mjs`. La estética es *Cinematic Archival Brutalism*.
- **Caddy + Docker Compose** en el VPS: `db`, `app`, `umami` (analítica propia sin cookies, en `analitica.<dominio>`) y `caddy`.
- **Vitest** para los tests (`tests/*.test.ts`).
- Fuentes de datos, siempre desde el servidor y cacheadas: TMDB (incluye "dónde ver" de JustWatch), OMDb, Wikidata/Wikipedia e Internet Archive.

## Estructura
- `src/pages/[...lang]/`: todas las páginas, con prefijo de idioma. El castellano va sin prefijo (URL canónica `cinearchive.es/...`).
- `src/pages/api/`: rutas de servidor (proxys a TMDB/OMDb, `me/*`, `admin/*`, `auth/[...all]`, `visits`, `health`).
- `src/lib/`: lógica (tmdb, omdb, wikidata, recs, stats, ratelimit, caches, visits, routes…), una pieza por archivo.
- `src/data/`: contenido curado en JSON/TS (catálogo, dosieres, glosario, palmarés, artículos, `changelog.json`).
- `src/i18n/ui.ts`: diccionario de la interfaz en los 5 idiomas.
- `src/middleware.ts`: carga la sesión y protege las rutas privadas.
- `scripts/`: generadores que se ejecutan a mano, no en runtime (`fetch-*`, `build-*`, `migrate.mjs`).
- Juegos (`/games`): páginas estáticas que piden el reto a `/api/games/*`; lógica en `src/lib/games.ts` y `src/lib/gamepool.ts`. Datos en `src/data/games/`: `pool.json` (de `scripts/build-game-pool.mjs`; regenerarlo cambia los retos de los días siguientes; con `--refrescar` solo se ponen al día títulos y sagas, sin cambiar retos, y `scripts/vps/refrescar-juegos.sh` lo hace en el VPS con su .env) y `clasicos.json` (de `scripts/build-game-frames.mjs`, revisar la hoja de contactos; los fotogramas llevan nombres al azar para no delatar la solución).
- `integrations/sw-version.mjs`: en cada build calcula la versión de caché del service worker (PWA) a partir del contenido.

## Comandos
```bash
npm install
npm run dev           # http://localhost:4321 (lee .env si existe)
npm run build && npm start
npm test              # vitest run
npm run db:generate   # tras tocar src/db/schema.ts (commitea drizzle/)
npm run db:migrate
node --env-file=.env scripts/<script>.mjs   # generadores que usan TMDB
```
Para la BD en local: `docker run -e POSTGRES_PASSWORD=dev -e POSTGRES_DB=cine -p 5432:5432 postgres:16-alpine`.

## Convenciones
- **Ninguna clave llega al navegador.** Nada de variables `PUBLIC_` para secretos: el cliente solo habla con `/api/*`.
- CSP estricta, sin `unsafe-inline` en scripts. Los scripts del cliente no pueden ir en línea.
- Todo texto visible pasa por `src/i18n/ui.ts` y se traduce a **los 5 idiomas** (hay test de i18n). El contenido editorial (artículos, dosieres) también existe en los 5 idiomas.
- Los commits van en castellano y describen el efecto para el usuario, no el cambio técnico (p. ej. «Info: el contador ya no enseña 30.800 mientras carga»).
- Los comentarios del código, en castellano, explican el **porqué** (ver `docker-compose.yml` o `integrations/sw-version.mjs`).
- Cada versión publicada se anota en `src/data/changelog.json` (5 idiomas, lenguaje llano) y se muestra en `/changelog`. El CRM (`adminscinearchive`) también edita ese archivo.
- El VPS tiene 1,8 GB de RAM: hay techos de memoria por contenedor y Postgres admite 25 conexiones (app 10, Umami 4). Cuidado al añadir servicios o pools.
- Lo nuevo en `src/lib/` lleva su test en `tests/`.

## Despliegue
- GitHub Actions pasa los tests y construye las imágenes `app` y `caddy` en GHCR (`.github/workflows/ci.yml`). El VPS no compila: `git pull && docker compose up -d --build` solo descarga la última imagen (`pull_policy: always`). Hay que esperar a que la CI salga en verde, o bajará la imagen anterior. Las migraciones se aplican al arrancar `app`.
- Reserva si GitHub o GHCR fallan: `docker compose -f docker-compose.yml -f docker-compose.build.yml up -d --build --no-deps app`. Evita compilar Caddy en el VPS: ahoga la web.
- Sergio despliega justo después de cada commit de Claude: el VPS siempre va al día con `main`. No hace falta anotar «desplegar» como paso pendiente.
- Volver atrás: `scripts/vps/volver.sh <commit>` pone la imagen de ese commit (`APP_TAG`); el siguiente Autodeploy vuelve a latest.
- Rastreadores: Caddy corta los que no respetan robots.txt y registra las peticiones (un par de días); `scripts/vps/rastreadores.sh` las resume. La CI valida el Caddyfile: si sale en rojo, no despliegues.
- CPU: `scripts/vps/consultas.sh` lista las consultas que más tiempo de Postgres gastan (pg_stat_statements).
- Logs: `docker compose logs -f app`. Copias: `scripts/vps/backup.sh` cada noche (cron de `scripts/vps/instalar-cron.sh`), 7 días en `backups/` del VPS, sin los datos de `films_cache`; se restauran con `scripts/vps/restaurar.sh`. El mismo cron limpia Docker los domingos.
- Disco: `films_cache` se poda sola cada día (`src/lib/cachecap.ts`, tope de 20.000 películas sin dueño) y `/api/health` avisa si queda menos del 15 % libre.
- Postgres solo escucha en `127.0.0.1:5432` del VPS. El CRM entra por túnel SSH.
- Variables de entorno: ver `.env.example`. El `.env` nunca se versiona.

> El estado del trabajo (qué se hizo, qué falta) está en `STATUS.md`. Hay que actualizarlo al terminar cada tarea, sin esperar a `/cerrar`: siempre refleja lo último que se ha hecho.
