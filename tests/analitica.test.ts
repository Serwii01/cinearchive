import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { privacy } from '../src/data/legal';
import { languages, type Lang } from '../src/i18n/ui';

const LANGS = Object.keys(languages) as Lang[];

// En Windows, git deja CRLF al hacer checkout: sin normalizar, cualquier
// comparación de varias líneas falla por el retorno de carro y no por lo que
// dice el fichero.
const leer = (ruta: string): string => readFileSync(ruta, 'utf8').split('\r\n').join('\n');
const layout = leer('src/layouts/BaseLayout.astro');
const caddy = leer('Caddyfile');
const compose = leer('docker-compose.yml');

describe('guion de medición', () => {
  it('no se emite si no hay sitio configurado', () => {
    // La condición es la red de seguridad: en local, en una rama y en cualquier
    // despliegue sin la variable, la web no carga analítica ninguna.
    expect(layout).toContain("const umamiSrc = umamiId && umamiHost ? `https://${umamiHost}/script.js` : '';");
    expect(layout).toMatch(/\{umamiSrc && \(/);
  });

  it('respeta Do Not Track y no bloquea la carga', () => {
    expect(layout).toContain('data-do-not-track="true"');
    expect(layout).toMatch(/<script[^>]*\n?\s*is:inline\n?\s*defer/);
  });

  it('se lee tanto del build como del entorno: media web es prerenderizada', () => {
    for (const v of ['UMAMI_WEBSITE_ID', 'UMAMI_HOST']) {
      expect(layout).toContain(`process.env.${v}`);
      expect(layout).toContain(`import.meta.env.${v}`);
    }
  });
});

describe('Caddy', () => {
  it('publica la analítica en su propio subdominio', () => {
    expect(caddy).toMatch(/^analitica\.\{\$DOMAIN\} \{/m);
    expect(caddy).toContain('reverse_proxy umami:3000');
  });

  it('la CSP del sitio deja cargar el guion y mandar los eventos', () => {
    const csp = caddy.match(/Content-Security-Policy "([^"]+)"/)?.[1];
    expect(csp, 'no encuentro la CSP').toBeTruthy();
    const dir = (nombre: string) =>
      csp!
        .split(';')
        .map((d) => d.trim())
        .find((d) => d.startsWith(`${nombre} `));
    expect(dir('script-src')).toContain('https://analitica.{$DOMAIN}');
    expect(dir('connect-src')).toContain('https://analitica.{$DOMAIN}');
    // Y que no se haya colado un comodín por el camino.
    expect(csp).not.toContain("'unsafe-inline'; script");
    expect(dir('script-src')).not.toContain('*');
  });

  it('el panel de analítica no se indexa', () => {
    const bloque = caddy.slice(caddy.indexOf('analitica.{$DOMAIN} {'));
    expect(bloque).toContain('X-Robots-Tag "noindex, nofollow"');
  });
});

describe('docker-compose', () => {
  const umami = compose.slice(compose.indexOf('\n  umami:'), compose.indexOf('\n  caddy:'));

  it('la imagen va clavada a una versión (la API cambia entre menores)', () => {
    expect(umami).toMatch(/image: ghcr\.io\/umami-software\/umami:\d+\.\d+\.\d+/);
    expect(umami).not.toContain(':latest');
  });

  it('tiene techo de memoria, como todo lo demás en este VPS', () => {
    expect(umami).toMatch(/mem_limit: \d+m/);
  });

  it('usa el Postgres que ya hay, con el pool limitado', () => {
    expect(umami).toContain('@db:5432/umami');
    expect(umami).toContain('connection_limit=');
    // Y la base se crea antes de arrancar, que si no Prisma no migra.
    expect(umami).toContain('umami-init:\n        condition: service_completed_successfully');
  });
});

describe('política de privacidad', () => {
  it('los cinco idiomas cuentan la analítica', () => {
    for (const lang of LANGS) {
      const texto = privacy[lang].sections.flatMap((s) => [s.heading, ...s.body]).join(' ');
      expect(texto, lang).toContain('Umami');
      expect(texto, lang).toContain('Do Not Track');
      // Sigue siendo verdad y hay que poder decirlo: no hay cookies de analítica.
      expect(texto.toLowerCase(), lang).toMatch(/cookie|galeta/);
    }
  });
});
