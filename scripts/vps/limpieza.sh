#!/usr/bin/env bash
# Limpieza semanal de Docker (lo lanza el cron de scripts/vps/instalar-cron.sh).
#
# El 7-11-2026 había 12 GB de caché de compilación de cuando el VPS compilaba
# las imágenes. Ya no compila (las hace GitHub), pero si algún día se usa la
# reserva docker-compose.build.yml, esto evita que se vuelva a acumular.
#
# Solo borra lo que no usa ningún contenedor y tiene más de una semana. No
# toca contenedores, volúmenes (la base de datos, los certificados) ni copias.
set -euo pipefail

echo "$(date -Is) antes: $(df -h / | awk 'NR==2 {print $4 " libres"}')"
docker builder prune -af --filter until=168h >/dev/null
docker image prune -af --filter until=168h >/dev/null
echo "$(date -Is) después: $(df -h / | awk 'NR==2 {print $4 " libres"}')"
