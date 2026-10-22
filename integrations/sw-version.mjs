// @ts-check
import { createHash } from 'node:crypto';
import { readdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Pone en public/sw.js una versión de caché que cambia con cada build.
 *
 * El service worker guarda para siempre lo que cachea (/_astro, /covers…), y
 * solo lo tira cuando cambia `VERSION`. Con una versión escrita a mano, cada
 * despliegue dejaba en el móvil los CSS y JS del anterior sin que nadie los
 * fuera a pedir nunca más: la caché solo crecía. Con la versión sacada del
 * contenido del build, cada despliegue que cambia algo estrena caché y el
 * `activate` del service worker borra la vieja. Si el build sale idéntico, la
 * versión no cambia y nadie descarga nada de nuevo.
 *
 * Además, al cambiar sw.js el navegador instala el service worker otra vez, y
 * eso vuelve a precargar /offline: sin esto se quedaba con la del primer día.
 */

const VERSION_RE = /^const VERSION = '[^']*';$/m;

/**
 * Sustituye la línea `const VERSION = '…';` del service worker.
 * @param {string} source
 * @param {string} version
 */
export function stampVersion(source, version) {
  if (!VERSION_RE.test(source)) throw new Error("sw.js: no encuentro la línea `const VERSION = '…';`");
  return source.replace(VERSION_RE, `const VERSION = '${version}';`);
}

/**
 * Huella del build: rutas y contenido de todo lo publicado menos el propio sw.js.
 * @param {string} dir
 */
export function buildFingerprint(dir) {
  const hash = createHash('sha256');
  /** @param {string} d */
  const recorrer = (d) => {
    for (const e of readdirSync(d, { withFileTypes: true }).sort((a, b) => (a.name < b.name ? -1 : 1))) {
      const ruta = join(d, e.name);
      if (e.isDirectory()) recorrer(ruta);
      else {
        const rel = relative(dir, ruta).split(sep).join('/');
        // El propio sw.js cuenta (si cambia cómo se cachea, caché nueva), pero
        // sin su línea de versión: si no, la huella dependería de sí misma.
        const contenido = rel === 'sw.js' ? stampVersion(readFileSync(ruta, 'utf8'), '') : readFileSync(ruta);
        hash.update(rel).update('\0').update(contenido).update('\0');
      }
    }
  };
  recorrer(dir);
  return hash.digest('hex').slice(0, 12);
}

/** @returns {import('astro').AstroIntegration} */
export default function swVersion() {
  return {
    name: 'cine-archive:sw-version',
    hooks: {
      'astro:build:done': ({ dir, logger }) => {
        // En modo servidor `dir` es dist/client, que es donde acaba public/.
        const cliente = fileURLToPath(dir);
        const sw = join(cliente, 'sw.js');
        if (!existsSync(sw)) {
          logger.warn(`no hay sw.js en ${cliente}; la caché no se versiona`);
          return;
        }
        const version = buildFingerprint(cliente);
        writeFileSync(sw, stampVersion(readFileSync(sw, 'utf8'), version));
        logger.info(`versión de caché del service worker: ${version}`);
      },
    },
  };
}
