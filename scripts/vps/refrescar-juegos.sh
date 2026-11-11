#!/usr/bin/env bash
# Vuelve a pedir a TMDB los títulos y las sagas de la bolsa de los juegos
# (src/data/games/pool.json) usando la clave del .env del VPS. Para cuando se
# trabaja desde un equipo sin .env.
#
#   scripts/vps/refrescar-juegos.sh
#
# Mismas películas, mismo orden, mismos fondos y notas: los retos de hoy y de
# los días siguientes no cambian. Solo títulos (los de España, no los de
# México), la saga de cada película (el aviso «es de la misma saga») y los
# seis primeros del reparto (el juego Reparto).
#
# No toca el repositorio del VPS (un cambio sin commit haría fallar el
# siguiente git pull): deja el resultado en /tmp/pool.json. Después, desde el
# equipo de trabajo:
#
#   scp <vps>:/tmp/pool.json src/data/games/pool.json
#
# y se revisa el diff, se hace commit y se despliega como siempre.
set -euo pipefail

cd "$(dirname "$0")/../.."
[ -f .env ] || { echo "No hay .env en $(pwd)."; exit 1; }

# Node en un contenedor de usar y tirar: el VPS no tiene Node instalado fuera
# de la imagen de la app, y esa imagen no lleva scripts/.
docker run --rm \
  --env-file .env \
  -v "$(pwd)":/repo:ro \
  -v /tmp:/salida \
  -w /repo \
  --memory 256m \
  node:22-alpine \
  node scripts/build-game-pool.mjs --refrescar --salida /salida/pool.json

echo "Listo: /tmp/pool.json"
