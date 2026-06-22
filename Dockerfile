# ---- Build stage: instala todo y compila el sitio SSR ----
FROM node:22-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# ---- Runtime stage: solo dependencias de producción + artefactos ----
FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production \
    HOST=0.0.0.0 \
    PORT=4321

COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

# Artefactos necesarios en tiempo de ejecución.
COPY --from=build /app/dist ./dist
COPY drizzle ./drizzle
COPY scripts ./scripts

EXPOSE 4321

# Aplica migraciones y arranca el servidor.
CMD ["sh", "-c", "node scripts/migrate.mjs && node ./dist/server/entry.mjs"]
