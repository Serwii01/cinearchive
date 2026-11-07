#!/usr/bin/env bash
# Las consultas que más tiempo de Postgres gastan, sumadas desde el último
# reinicio de Postgres o desde el último «reset». Solo lee (salvo con reset).
#
#   scripts/vps/consultas.sh          # las 15 que más tiempo suman
#   scripts/vps/consultas.sh reset    # pone los contadores a cero
#
# Necesita pg_stat_statements cargado (docker-compose.yml). La extensión se
# crea aquí la primera vez: no hace falta una migración para algo que solo
# usa este script.
set -euo pipefail

cd "$(dirname "$0")/../.."
psql() { docker compose exec -T db sh -c 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -X -q "$@"' sh "$@"; }

psql -c 'CREATE EXTENSION IF NOT EXISTS pg_stat_statements;'
if [ "${1:-}" = reset ]; then
  psql -c 'SELECT pg_stat_statements_reset();' >/dev/null
  echo "Contadores a cero."
  exit 0
fi
psql -P pager=off -c "
SELECT d.datname AS base,
       s.calls AS veces,
       round(s.total_exec_time / 1000) AS segundos,
       round(s.mean_exec_time::numeric, 1) AS ms_media,
       round(100 * s.total_exec_time / sum(s.total_exec_time) OVER ())::int AS pct,
       pg_size_pretty((s.shared_blks_hit + s.shared_blks_read) * 8192) AS leido,
       left(regexp_replace(s.query, '\s+', ' ', 'g'), 110) AS consulta
  FROM pg_stat_statements s JOIN pg_database d ON d.oid = s.dbid
 ORDER BY s.total_exec_time DESC
 LIMIT 15;"
