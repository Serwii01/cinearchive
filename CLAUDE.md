# Cine Archive

Archivo de cine abierto y multilingüe (ES/EN/GL/EU/CA): cine, prensa y libros de dominio público,
filmoteca sobre TMDB, palmarés, cuentas de usuario y recomendaciones. Producción: https://cinearchive.es
(VPS propio con Docker). El README tiene la descripción completa para humanos.

## Stack
- **Astro 5 en modo SSR** (`@astrojs/node` standalone). El contenido editorial se prerenderiza; lo dinámico va por servidor.
- **PostgreSQL 16 + Drizzle ORM** (`src/db/schema.ts`, migraciones en `drizzle/`).
- **Better Auth**: email+contraseña, Google/GitHub opcionales y confirmación de correo vía Resend.
- **Tailwind 3**: el design system (paleta, tipografía) vive en `tailwind.config.mjs`. La estética es *Cinematic Archival Brutalism*.
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
- En el VPS: `git pull && docker compose up -d --build`. Las migraciones se aplican al arrancar `app`.
- Logs: `docker compose logs -f app`. Backup: `pg_dump` dentro del contenedor `db`.
- Postgres solo escucha en `127.0.0.1:5432` del VPS. El CRM entra por túnel SSH.
- Variables de entorno: ver `.env.example`. El `.env` nunca se versiona.

> El estado del trabajo (qué se hizo, qué falta) está en `STATUS.md`.
