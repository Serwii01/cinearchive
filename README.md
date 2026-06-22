# Cine Archive — aplicación editorial de cine (ES/EN)

Aplicación full-stack de cine con estética *Cinematic Archival Brutalism*. Combina una
**publicación editorial** (20 ensayos bilingües en Markdown) con una **aplicación dinámica**:
cuentas de usuario, watchlist/favoritos, valoraciones y notas, preferencias y
**recomendaciones personalizadas**. Datos de películas vía **TMDB + OMDb**. Pensada para
autoalojarse en un **VPS** pagando solo VPS + dominio.

## Principio de seguridad

Ninguna API key se expone en el navegador. La app es **SSR (Astro modo servidor)**: todas las
claves viven en variables de entorno del servidor (sin prefijo `PUBLIC_`), y el navegador solo
habla con nuestras rutas `/api/*`, que son las que llaman a TMDB/OMDb. Sesiones con cookies
`httpOnly`/`secure` (Better Auth) y HTTPS automático con Caddy.

## Stack

- **Astro 5 (SSR)** + adaptador `@astrojs/node` — render híbrido: las páginas editoriales se
  prerenderizan (estáticas) y lo dinámico se sirve por servidor.
- **PostgreSQL** + **Drizzle ORM** (migraciones con `drizzle-kit`).
- **Better Auth** — email+contraseña y login social (Google/GitHub).
- **TMDB + OMDb** — proxeadas y cacheadas en `films_cache`.
- **Tailwind CSS** — el design system vive en `tailwind.config.mjs`.
- **Caddy** + **Docker Compose** — TLS automático y despliegue de una orden.

## Estructura

```
src/
  pages/
    [lang]/                  # editorial (prerender) + páginas de usuario (SSR)
      index, about, archive/, films       # estáticas
      login, register, account, watchlist, recommendations, film/[tmdbId]   # SSR
    api/
      auth/[...all].ts       # Better Auth (login/registro/OAuth)
      films/{search,[id]}.ts # proxy + cache TMDB/OMDb (claves en servidor)
      me/{films,preferences,recommendations}.ts   # datos del usuario (requieren sesión)
  lib/        auth, auth-client, tmdb, omdb, films (cache), recs, ratelimit
  db/         schema.ts, client.ts
  middleware.ts   # carga sesión en Astro.locals y protege rutas privadas
  i18n/ui.ts      # diccionario ES/EN
  data/           films.json (122 películas), genres.ts
Dockerfile · docker-compose.yml · Caddyfile · .env.example · drizzle/
```

## Desarrollo local

Requiere Node 22+ y (para la BD) Docker o un PostgreSQL local.

```bash
npm install
cp .env.example .env          # rellena DATABASE_URL, TMDB/OMDb, BETTER_AUTH_SECRET…
npm run db:migrate            # aplica el esquema (necesita DATABASE_URL)
npm run dev                   # http://localhost:4321  (redirige a /es)
```

Para una BD rápida con Docker:
`docker run -e POSTGRES_PASSWORD=dev -e POSTGRES_DB=cine -p 5432:5432 postgres:16-alpine`
y `DATABASE_URL=postgres://postgres:dev@localhost:5432/cine` en `.env`.

## Despliegue en un VPS (Docker)

Requisitos: un VPS Linux (≥ 2 GB RAM) con Docker y Docker Compose, un dominio apuntando
(registro A) a la IP del VPS, y los puertos 80/443 abiertos.

```bash
git clone <tu-repo> cine-archive && cd cine-archive
cp .env.example .env          # edita DOMAIN, EMAIL, POSTGRES_*, BETTER_AUTH_SECRET, claves…
docker compose up -d --build  # construye, migra la BD y arranca app + caddy
```

Caddy emitirá el certificado TLS automáticamente. La app quedará en `https://TU_DOMINIO`
(redirige a `/es`). Las migraciones se aplican solas al arrancar el contenedor `app`.

### Claves necesarias (todas con plan gratuito)

| Variable | Dónde obtenerla |
|---|---|
| `TMDB_API_KEY` | https://www.themoviedb.org/settings/api |
| `OMDB_API_KEY` | https://www.omdbapi.com/apikey.aspx (1000/día → se cachea) |
| `GOOGLE_CLIENT_ID/SECRET` | Google Cloud Console · redirect `…/api/auth/callback/google` |
| `GITHUB_CLIENT_ID/SECRET` | GitHub Developer Settings · callback `…/api/auth/callback/github` |
| `BETTER_AUTH_SECRET` | genera uno: `openssl rand -base64 32` |

El login social es opcional: si dejas sus variables en blanco, esos botones no aparecen y el
email+contraseña sigue funcionando.

## Operación

- **Logs**: `docker compose logs -f app`
- **Backups de BD**: `docker compose exec db pg_dump -U $POSTGRES_USER $POSTGRES_DB > backup.sql`
  (programa un cron diario).
- **Actualizar**: `git pull && docker compose up -d --build`.
- **Nueva migración** tras tocar `src/db/schema.ts`: `npm run db:generate` (commitea la carpeta
  `drizzle/`); se aplicará en el próximo arranque.

## Contenido editorial

Los ensayos siguen en Markdown (`src/content/articles/{es,en}`). Para añadir uno, crea los dos
`.md` (ES y EN) con el mismo campo `pair`. Ver los existentes como plantilla.
