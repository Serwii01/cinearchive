# ---- Build stage: instala todo y compila el sitio SSR ----
FROM node:22-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
# El dominio público se fija en build (canonical/sitemap/OpenGraph). Llega como
# build arg desde docker-compose (variable SITE_URL del .env). Sin esto, saldría
# el dominio de ejemplo de astro.config.
ARG SITE_URL
ENV SITE_URL=$SITE_URL
# Analítica: la mitad del sitio es prerenderizada, así que el guion de medición
# se decide al compilar. Vacío = no se emite nada.
ARG UMAMI_WEBSITE_ID=""
ARG UMAMI_HOST=""
ENV UMAMI_WEBSITE_ID=$UMAMI_WEBSITE_ID \
    UMAMI_HOST=$UMAMI_HOST
RUN npm run build

# ---- Runtime stage: solo dependencias de producción + artefactos ----
FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production \
    HOST=0.0.0.0 \
    PORT=4321

COPY package*.json ./
# --ignore-scripts: en runtime no se compila nada (se ejecuta el dist ya construido
# y las migraciones usan drizzle-orm+pg en JS puro), así evitamos el postinstall de
# esbuild/@esbuild-kit, que falla por choque de versiones y no se necesita aquí.
RUN npm ci --omit=dev --ignore-scripts && npm cache clean --force

# Artefactos necesarios en tiempo de ejecución.
COPY --from=build /app/dist ./dist
COPY drizzle ./drizzle
COPY scripts ./scripts

# Proceso sin privilegios: si alguien comprometiera la app, no sería root
# dentro del contenedor. El puerto 4321 no requiere privilegios.
USER node

EXPOSE 4321

# Aplica migraciones y arranca el servidor.
CMD ["sh", "-c", "node scripts/migrate.mjs && node ./dist/server/entry.mjs"]
