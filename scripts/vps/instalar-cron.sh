#!/usr/bin/env bash
# Instala en el VPS las tareas programadas: copia de seguridad cada noche y
# limpieza de Docker cada domingo. Se lanza una vez, como root:
#
#   bash /root/cinearchive/scripts/vps/instalar-cron.sh
#
# Volver a lanzarlo no duplica nada: reescribe el mismo fichero.
set -euo pipefail

raiz=$(cd "$(dirname "$0")/../.." && pwd)
chmod +x "$raiz"/scripts/vps/*.sh

cat > /etc/cron.d/cinearchive <<CRON
# Tareas de Cine Archive (las instala scripts/vps/instalar-cron.sh).
SHELL=/bin/bash
PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin
30 3 * * * root $raiz/scripts/vps/backup.sh >> /var/log/cinearchive-backup.log 2>&1
30 4 * * 0 root $raiz/scripts/vps/limpieza.sh >> /var/log/cinearchive-limpieza.log 2>&1
CRON
chmod 644 /etc/cron.d/cinearchive

echo "Instalado /etc/cron.d/cinearchive. Primera copia ahora, para comprobar que funciona:"
"$raiz/scripts/vps/backup.sh"
ls -lh "$raiz/backups"
