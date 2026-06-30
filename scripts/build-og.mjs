/**
 * Genera la imagen Open Graph (1200×630) en public/_og.html, que se rasteriza a
 * public/og.png con Chrome (ver comando que lo acompaña). Es la miniatura que
 * aparece al compartir el enlace del sitio en redes/mensajería.
 *
 *   node scripts/build-og.mjs   &&   (Chrome --screenshot)
 */
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const tmp = join(root, 'public', '_og');
const b64 = async (p) => (await readFile(p)).toString('base64');

async function main() {
  await mkdir(tmp, { recursive: true });
  const ebg = await b64(join(root, 'node_modules/@fontsource-variable/eb-garamond/files/eb-garamond-latin-wght-normal.woff2'));
  const mono = await b64(join(root, 'node_modules/@fontsource/space-mono/files/space-mono-latin-700-normal.woff2'));

  const C = { ink: '#000', ochre: '#eab308', bg: '#fafafa', muted: '#4f4633' };
  const mark = (s) => `<svg viewBox="0 0 32 32" width="${s}" height="${s}" shape-rendering="crispEdges">
    <rect width="32" height="32" fill="transparent"/>
    <rect x="1" y="1" width="30" height="30" fill="none" stroke="${C.ink}" stroke-width="2"/>
    <rect x="6" y="6" width="20" height="9" fill="${C.ochre}" stroke="${C.ink}" stroke-width="2"/>
    <line x1="6" y1="20" x2="26" y2="20" stroke="${C.ink}" stroke-width="2"/>
    <line x1="6" y1="25" x2="20" y2="25" stroke="${C.ink}" stroke-width="2"/></svg>`;

  const html = `<!doctype html><html><head><meta charset="utf-8"><style>
@font-face{font-family:'EB Garamond';src:url(data:font/woff2;base64,${ebg}) format('woff2');font-weight:400 700}
@font-face{font-family:'Space Mono';src:url(data:font/woff2;base64,${mono}) format('woff2');font-weight:700}
*{margin:0;padding:0;box-sizing:border-box}html,body{width:1200px;height:630px}
.s{position:relative;width:1200px;height:630px;background:${C.bg};color:${C.ink}}
.fr{position:absolute;inset:36px;border:6px solid ${C.ink}}
.p{position:absolute;inset:90px;display:flex;flex-direction:column;justify-content:center}
.mono{font-family:'Space Mono',monospace;text-transform:uppercase;letter-spacing:.16em}
</style></head><body>
  <div class="s"><div class="fr"></div><div class="p">
    <div style="display:flex;align-items:center;gap:30px">${mark(110)}
      <h1 style="font-family:'EB Garamond',serif;font-size:120px;letter-spacing:-.04em;line-height:1">Cine Archive</h1></div>
    <p class="mono" style="font-size:26px;color:${C.muted};margin-top:30px">Archivo editorial de cine</p>
    <div style="width:130px;height:10px;background:${C.ochre};margin:34px 0"></div>
    <p style="font-family:'EB Garamond',serif;font-style:italic;font-size:46px">Cine, prensa y memoria de dominio público. Abierto y gratuito.</p>
    <p class="mono" style="font-size:24px;color:${C.ink};margin-top:30px">cinearchive.es</p>
  </div></div>
</body></html>`;
  await writeFile(join(tmp, 'og.html'), html);
  console.log('public/_og/og.html generado.');
}

main();
