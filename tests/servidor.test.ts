import { describe, it, expect, vi } from 'vitest';
import { readFileSync } from 'node:fs';

vi.mock('../src/db/client', () => ({ db: {} }));

// Sin \r: en Windows git los saca con CRLF.
const leer = (f: string) => readFileSync(f, 'utf8').replace(/\r\n/g, '\n');
const caddy = leer('Caddyfile');
const compose = leer('docker-compose.yml');
// El bloque del sitio principal: el de analitica.{$DOMAIN} es otro.
const sitio = caddy.slice(caddy.search(/^\{\$DOMAIN\} \{/m));

describe('rastreadores', () => {
  it('robots.txt cierra la puerta a los de entrenamiento, no a los buscadores', async () => {
    const { GET, ENTRENAMIENTO } = await import('../src/pages/robots.txt');
    const body = await (await (GET as any)({ site: new URL('https://cinearchive.es') })).text();
    for (const ua of ['GPTBot', 'ClaudeBot', 'CCBot']) expect(ENTRENAMIENTO).toContain(ua);
    // Los que traen gente (buscadores, y los asistentes cuando alguien les pide una página) no.
    for (const ua of ['Googlebot', 'Bingbot', 'OAI-SearchBot', 'ChatGPT-User', 'PerplexityBot', 'Claude-User', 'Claude-SearchBot'])
      expect(ENTRENAMIENTO).not.toContain(ua);
    // Su grupo es «Disallow: /» y el general sigue abierto.
    expect(body).toMatch(/User-agent: Timpibot\nDisallow: \/\n\nUser-agent: \*\n/);
    expect(body).toMatch(/Allow: \/\n/);
    expect(body).toContain('Sitemap: https://cinearchive.es/sitemap-index.xml');
  });

  it('Caddy corta a los que no respetan robots.txt, en el sitio principal', () => {
    expect(sitio).toMatch(/@rastreadores header_regexp User-Agent \(\?i\)\(bytespider\|/);
    expect(sitio).toContain('respond @rastreadores 403');
    // Nunca a los buscadores.
    const lista = sitio.match(/@rastreadores header_regexp User-Agent \(\?i\)\(([^)]+)\)/)?.[1] ?? '';
    for (const no of ['googlebot', 'bingbot', 'duckduck', 'applebot']) expect(lista).not.toContain(no);
  });

  it('Caddy registra las peticiones y Docker rota el registro', () => {
    expect(sitio).toMatch(/log \{\s*output stdout\s*format json\s*\}/);
    expect(compose).toMatch(/caddy:\n(?:.*\n){0,4}\s+logging:\n\s+driver: json-file\n\s+options:\n\s+max-size: '25m'/);
  });
});

describe('volver atrás', () => {
  it('la imagen de la app admite el commit como etiqueta y por defecto es latest', () => {
    expect(compose).toContain('image: ghcr.io/serwii01/cinearchive-app:${APP_TAG:-latest}');
    expect(readFileSync('scripts/vps/volver.sh', 'utf8')).toContain('APP_TAG=$etiqueta docker compose up -d --no-deps app');
  });

  it('la CI etiqueta cada imagen con su commit y comprueba el Caddyfile', () => {
    const ci = readFileSync('.github/workflows/ci.yml', 'utf8');
    expect(ci).toContain('cinearchive-${{ matrix.nombre }}:${{ github.sha }}');
    expect(ci).toContain('caddy validate --config /etc/caddy/Caddyfile');
  });
});
