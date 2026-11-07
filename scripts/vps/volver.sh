#!/usr/bin/env bash
# Vuelve la app a la imagen de un commit anterior, sin compilar nada. Para
# cuando una versión nueva falla y no hay tiempo de arreglarla.
#
#   scripts/vps/volver.sh 3a99246    # la versión de ese commit
#   scripts/vps/volver.sh latest     # otra vez la última
#
# Cada imagen de GitHub lleva dos etiquetas: latest y el commit del que sale
# (.github/workflows/ci.yml). Solo existen las de commits con la CI en verde
# desde el 6-11-2026.
#
# Ojo:
#  - El siguiente Autodeploy del CRM vuelve a latest. Mientras no esté
#    arreglado, no despliegues.
#  - Las migraciones no se deshacen. Volver a una versión anterior a una
#    migración que borra o renombra columnas puede fallar; las que solo añaden
#    (lo normal aquí) no molestan.
#  - Solo la app. Caddy casi nunca cambia.
set -euo pipefail

cd "$(dirname "$0")/../.."
destino=${1:-}
[ -n "$destino" ] || { echo "Uso: $0 <commit>|latest"; git log --oneline -10; exit 1; }

if [ "$destino" = latest ]; then
  etiqueta=latest
else
  git fetch -q origin
  etiqueta=$(git rev-parse --verify -q "$destino^{commit}") || { echo "No encuentro el commit $destino."; exit 1; }
  echo "Volviendo a: $(git log -1 --format='%h %s (%ad)' --date=short "$etiqueta")"
fi

imagen=ghcr.io/serwii01/cinearchive-app:$etiqueta
# Antes de tocar nada: si la imagen no existe, la app sigue como está.
docker pull -q "$imagen" >/dev/null || { echo "No hay imagen para ese commit (¿su CI no salió en verde, o es anterior al 6-11-2026?)."; exit 1; }

APP_TAG=$etiqueta docker compose up -d --no-deps app
echo "Hecho: la app va con $imagen."
[ "$etiqueta" = latest ] || echo "Recuerda: el próximo Autodeploy la devuelve a latest."
