#!/usr/bin/env bash
# Restaura una copia de scripts/vps/backup.sh. BORRA lo que haya ahora en esa
# base y lo sustituye por la copia, así que pide confirmación.
#
#   scripts/vps/restaurar.sh backups/cine-2026-11-08.dump
#   scripts/vps/restaurar.sh backups/umami-2026-11-08.dump
#
# Para la app (o Umami) mientras restaura: con conexiones abiertas, pg_restore
# se queda esperando a que suelten sus tablas. La caché de películas vuelve
# vacía y se rellena sola.
set -euo pipefail

f=${1:-}
[ -f "$f" ] || { echo "Uso: $0 backups/<cine|umami>-AAAA-MM-DD.dump"; exit 1; }
case "$(basename "$f")" in
  cine-*) base='$POSTGRES_DB'; servicio=app ;;
  umami-*) base=umami; servicio=umami ;;
  *) echo "No sé de qué base es $f (tiene que empezar por cine- o umami-)."; exit 1 ;;
esac

ruta=$(cd "$(dirname "$f")" && pwd)/$(basename "$f")
cd "$(dirname "$0")/../.."
read -r -p "Se va a sustituir la base de $servicio por $(basename "$f"). Escribe SI para seguir: " ok
[ "$ok" = "SI" ] || { echo "Cancelado."; exit 1; }

docker compose stop "$servicio"
# Pase lo que pase, el servicio vuelve a arrancar.
trap 'docker compose start "$servicio"' EXIT
docker compose exec -T db sh -c "pg_restore -U \"\$POSTGRES_USER\" -d \"$base\" --clean --if-exists --no-owner" < "$ruta"
echo "Restaurada $(basename "$f")."
