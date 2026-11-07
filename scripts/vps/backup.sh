#!/usr/bin/env bash
# Copia de seguridad nocturna de Postgres, en el propio VPS (lo lanza el cron
# que instala scripts/vps/instalar-cron.sh).
#
# Qué copia: la base de la web entera MENOS los datos de films_cache, que es
# una caché de TMDB que se rellena sola (su estructura sí va). Y la de Umami.
# Con eso, cada copia de la web pesa unos pocos MB.
#
# Dónde: backups/ junto al repo (fuera de git y de Docker), con los últimos
# DIAS días. Si queda poco disco, esa noche no copia: llenar el disco tumbaría
# Postgres, que es justo lo que se quiere proteger.
#
# Para restaurar: scripts/vps/restaurar.sh.
set -euo pipefail

cd "$(dirname "$0")/../.."
DIR=backups
DIAS=7
MIN_LIBRE_MB=1024

mkdir -p "$DIR"
chmod 700 "$DIR" # llevan correos y hashes de contraseñas: solo root

libre=$(df -Pm "$DIR" | awk 'NR==2 {print $4}')
if [ "$libre" -lt "$MIN_LIBRE_MB" ]; then
  echo "$(date -Is) SIN COPIA: solo quedan ${libre} MB libres (mínimo ${MIN_LIBRE_MB})."
  exit 1
fi

fecha=$(date +%F)
copiar() { # $1 = nombre del fichero, $2 = base ("" = la de la web)
  local tmp="$DIR/$1-$fecha.dump.tmp"
  # -Fc: formato propio de Postgres, ya comprimido; pg_restore lo lee tal cual.
  docker compose exec -T db sh -c "pg_dump -U \"\$POSTGRES_USER\" -d \"${2:-\$POSTGRES_DB}\" -Fc ${3:-}" > "$tmp"
  mv "$tmp" "$DIR/$1-$fecha.dump"
  echo "$(date -Is) $1: $(du -h "$DIR/$1-$fecha.dump" | cut -f1)"
}
trap 'rm -f "$DIR"/*.tmp' EXIT

copiar cine "" "--exclude-table-data=films_cache"
copiar umami umami

# Las de hace más de DIAS días, fuera.
find "$DIR" -name '*.dump' -mtime +$((DIAS - 1)) -delete
