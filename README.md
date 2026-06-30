# Cine Archive

**Archivo de cine abierto y bilingüe (ES/EN).** Cine, prensa y memoria de **dominio público**,
reunidos en una aplicación editorial con estética *Cinematic Archival Brutalism*. Sin muros, sin
publicidad, sin rastreadores. Pensado para autoalojarse pagando solo **VPS + dominio**.

> Producción: **[cinearchive.es](https://cinearchive.es)**

---

## Qué ofrece

- **Cine abierto** — películas de **dominio público** (1902–1963) con visor incrustado de Internet
  Archive: Méliès, Murnau, Eisenstein, Keaton, Lang, Welles, Corman…
- **Hemeroteca** — revistas y periódicos de cine en dominio público, para leer aquí mismo.
- **Biblioteca** — libros fundacionales de teoría e historia del cine (Lindsay, Münsterberg,
  Ramsaye…).
- **Filmoteca** — catálogo de referencia + buscador en vivo sobre toda la base de TMDB, con
  **fichas ricas**: presupuesto, taquilla, premios, localizaciones (Wikidata), reparto, tráiler
  (carga diferida) y "dónde ver" por región (Watchmode).
- **Descubrir** — explorador por género, década, país y orden.
- **Dosieres** — 12 colecciones temáticas comentadas que enlazan a fichas.
- **Figuras** — fichas de cineastas (biografía + filmografía).
- **Atlas** — mapa mundial del catálogo por país de origen (SVG, sin librerías ni teselas).
- **Glosario** (66 términos) y **Cronología** de movimientos del cine.
- **Palmarés** — Óscar, Palma de Oro y Goya a mejor película **completos desde su primera
  edición**, cada ganadora enlazada a su ficha (datos de Wikidata + Wikipedia).
- **Cuenta de usuario** — lista (guardadas/vistas/favoritas), valoraciones y notas, preferencias,
  **recomendaciones** personalizadas y **estadísticas** ("Tu cine en números").
- **Panel de administración** cifrado por lista de correos (`ADMIN_EMAILS`).
- Bilingüe ES/EN, **totalmente responsive**, accesibilidad declarada, 404, sitemap, OG.

## Principio de seguridad

**Ninguna API key se expone en el navegador.** La app es **SSR (Astro en modo servidor)**: las
claves viven en variables de entorno del servidor (sin prefijo `PUBLIC_`) y el navegador solo
habla con nuestras rutas `/api/*`, que son las que llaman a TMDB/OMDb/Watchmode. Además:

- Sesiones con cookies `httpOnly`/`secure` (Better Auth) y HTTPS automático con Caddy.
- **CSP estricta** (sin `unsafe-inline` en scripts) y cabeceras de seguridad en Caddy.
- **Rate limiting** en tres capas: borde (Caddy), rutas `/api/*` (`lib/ratelimit.ts`) y login
  (Better Auth).
- `.env` está en `.gitignore` **y** en `.dockerignore`; verificado que no hay secretos en
  `dist/client`.

## Stack

- **Astro 5 (SSR)** + adaptador `@astrojs/node` (standalone) — render híbrido: el contenido
  editorial se prerenderiza (estático) y lo dinámico se sirve por servidor.
- **PostgreSQL 16** + **Drizzle ORM** (migraciones con `drizzle-kit`).
- **Better Auth** — email+contraseña y login social (Google/GitHub).
- **Tailwind CSS** — el design system (paleta, tipografía fluida) vive en `tailwind.config.mjs`.
- **Caddy** + **Docker Compose** — TLS automático y despliegue de una orden.
- Fuentes autoalojadas (EB Garamond, Geist Sans, Space Mono); sin peticiones a Google Fonts.

### Fuentes de datos (todas server-side y cacheadas)

TMDB (fichas, créditos, tráiler, descubrir), OMDb (premios/taquilla), Watchmode (dónde ver),
Wikidata (localizaciones, palmarés Óscar/Cannes) e Internet Archive (cine y prensa de dominio
público). El palmarés del Goya se genera desde la Wikipedia en español.

## Estructura

```
src/
  pages/[lang]/        portada, archivo/ (+library, glossary, timeline, awards),
                       films (+cinema, collections, figures, atlas, person, film/[tmdbId]),
                       discover, account, watchlist, recommendations, stats, admin, legal…
  pages/api/           auth/[...all], films/*, me/* (proxys + datos de usuario)
  lib/                 tmdb, omdb, watchmode, wikidata, films(cache), people, recs, stats,
                       ratelimit, backlink, pdfilms, library, collections, awards, atlas…
  data/                *.json + *.ts (catálogo, géneros, países, contenido curado)
  db/                  schema.ts, client.ts        i18n/ui.ts (diccionario ES/EN)
  middleware.ts        carga sesión y protege rutas privadas
scripts/               generadores de datos/marca (ver abajo)
Dockerfile · Dockerfile.caddy · docker-compose.yml · Caddyfile · drizzle/ · tests/
```

## Desarrollo local

Requiere **Node 22+** y, para la BD, Docker o un PostgreSQL local.

```bash
npm install
cp .env.example .env          # rellena DATABASE_URL, claves TMDB/OMDb…, BETTER_AUTH_SECRET
npm run db:migrate            # aplica el esquema (necesita DATABASE_URL)
npm run dev                   # http://localhost:4321  (redirige a /es)
npm run test                  # Vitest (i18n, ratelimit, tmdb)
```

BD rápida con Docker:
`docker run -e POSTGRES_PASSWORD=dev -e POSTGRES_DB=cine -p 5432:5432 postgres:16-alpine`
y `DATABASE_URL=postgres://postgres:dev@localhost:5432/cine` en `.env`.

## Generadores de datos / marca (`scripts/`)

Se ejecutan una vez (no en runtime); el contenido se cachea localmente.

| Script | Qué hace |
|---|---|
| `fetch-covers.mjs` / `fetch-pd.mjs` / `fetch-library.mjs` | Verifican IDs de Internet Archive y descargan miniaturas a `public/` |
| `fetch-figures.mjs` | Resuelve ids de TMDB de cineastas destacados |
| `build-worldmap.mjs` | Genera el mapa SVG del atlas (Natural Earth) |
| `build-awards.mjs` | Palmarés completo (Wikidata + Wikipedia + TMDB) |
| `build-brand.mjs` / `build-social.mjs` / `build-og.mjs` | Kit de marca, posts e imagen OG |

Los que usan TMDB se ejecutan con `node --env-file=.env scripts/<script>.mjs`.

## Despliegue (VPS con Docker)

Requisitos: VPS Linux (**≥ 2 GB RAM**) con Docker y Docker Compose, dominio con registro **A**
apuntando a la IP del VPS y puertos **80/443** abiertos.

```bash
git clone <tu-repo> cine-archive && cd cine-archive
cp .env.example .env          # edita DOMAIN, EMAIL, SITE_URL, POSTGRES_*, BETTER_AUTH_SECRET, claves…
docker compose up -d --build  # construye, migra la BD y arranca app + caddy
```

Caddy emite el certificado TLS automáticamente. Las migraciones se aplican al arrancar `app`.

**Antes de publicar:** registra las URIs de redirección de OAuth de producción
(`https://TU_DOMINIO/api/auth/callback/{google,github}`) y, para el reset de contraseña por
email, configura **Resend** (`RESEND_API_KEY` + `EMAIL_FROM` con dominio verificado). El login
social es opcional: si dejas sus variables vacías, esos botones no aparecen.

## Operación

- **Logs**: `docker compose logs -f app`
- **Backup de BD**: `docker compose exec db pg_dump -U $POSTGRES_USER $POSTGRES_DB > backup.sql`
  (programa un cron diario).
- **Actualizar**: `git pull && docker compose up -d --build`.
- **Nueva migración** tras tocar `src/db/schema.ts`: `npm run db:generate` (commitea `drizzle/`);
  se aplica en el siguiente arranque.

## Créditos y licencia

Diseño y código: **Sergio Fernández Morales**. Este producto usa la API de **TMDB** pero no está
avalado ni certificado por TMDB. Los datos proceden de TMDB, OMDb, Watchmode, Wikidata, Wikipedia
e Internet Archive, cada uno bajo sus propios términos; las obras y la prensa incrustadas son, en
su mayoría, de dominio público. Las marcas, carteles e imágenes de películas pertenecen a sus
titulares y se usan con fines informativos.
