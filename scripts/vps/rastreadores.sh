#!/usr/bin/env bash
# Resume quién pide qué a la web, a partir del registro de peticiones de Caddy
# (ver Caddyfile). Solo lee. Para saber qué rastreadores frenar.
#
#   scripts/vps/rastreadores.sh        # últimas 24 horas (o lo que guarde el registro)
#   scripts/vps/rastreadores.sh 2h     # o el periodo que quieras
#
# El registro dura un par de días (Docker lo rota). No guarda nada aparte.
set -euo pipefail

cd "$(dirname "$0")/../.."
desde=${1:-24h}
docker compose logs --no-log-prefix --since "$desde" caddy 2>/dev/null | python3 -c '
import json, sys, collections, ipaddress, datetime
desde = hasta = None
n = 0; st = collections.Counter(); ua = collections.Counter(); ip = collections.Counter()
red = collections.Counter(); tipo = collections.Counter(); ua_fichas = collections.Counter()
for linea in sys.stdin:
    if "\"request\"" not in linea: continue
    try: e = json.loads(linea)
    except ValueError: continue
    r = e.get("request") or {}
    if not r: continue
    n += 1
    ts = e.get("ts")
    if isinstance(ts, (int, float)):
        desde = ts if desde is None or ts < desde else desde
        hasta = ts if hasta is None or ts > hasta else hasta
    u = ((r.get("headers") or {}).get("User-Agent") or ["(sin navegador)"])[0][:110]
    i = r.get("client_ip") or r.get("remote_ip") or "?"
    ruta = (r.get("uri") or "").split("?")[0]
    partes = [p for p in ruta.split("/") if p]
    if partes and len(partes[0]) == 2 and partes[0] in ("en", "gl", "eu", "ca"): partes = partes[1:]
    t = partes[0] if partes else "(portada)"
    t = t if t in ("film", "person", "cinema", "api", "_astro", "search", "discover") else "otras"
    st[e.get("status")] += 1; ua[u] += 1; ip[i] += 1; tipo[t] += 1
    if t in ("film", "person"): ua_fichas[u] += 1
    try:
        a = ipaddress.ip_address(i)
        red[str(ipaddress.ip_network(f"{i}/{24 if a.version == 4 else 48}", strict=False))] += 1
    except ValueError: pass
if not n: sys.exit("No hay peticiones en el registro (¿Caddy ya tiene el log activado?).")
def tabla(titulo, c, k=12):
    print(f"\n{titulo}")
    for v, m in c.most_common(k): print(f"  {m:>8}  {m * 100 / n:5.1f} %  {v}")
print(f"Peticiones: {n}")
# El registro de Caddy se rota por tamaño (docker-compose.yml): con mucho
# tráfico guarda menos horas de las pedidas. Lo que cubre de verdad, aquí.
if desde is not None:
    hora = lambda t: datetime.datetime.fromtimestamp(t, datetime.timezone.utc).astimezone().strftime("%d/%m %H:%M")
    horas = (hasta - desde) / 3600
    print(f"Periodo: del {hora(desde)} al {hora(hasta)} ({horas:.1f} h)  ·  {n / max(horas, 1 / 60):.0f} peticiones por hora")
tabla("Respuestas:", st, 8)
tabla("Qué piden:", tipo, 8)
tabla("Navegadores que más fichas piden (film y person):", ua_fichas)
tabla("IPs:", ip)
tabla("Redes (/24 en IPv4, /48 en IPv6):", red)
print(f"\nIPs distintas: {len(ip)}  ·  redes distintas: {len(red)}")
'
