/**
 * Genera 2 banners de cabecera para X/Twitter (1500×500) en
 * Escritorio/Cine-Archive-Marca/banners/. Se rasterizan con Chrome.
 * El contenido va centrado para sobrevivir al recorte y al avatar (abajo-izq.).
 *
 *   node scripts/build-banner.mjs   &&   (Chrome --screenshot 1500x500)
 */
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { homedir } from 'node:os';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const out = join(homedir(), 'Desktop', 'Cine-Archive-Marca', 'banners');
const tmp = join(out, '_tmp');
const b64 = async (p) => (await readFile(p)).toString('base64');

const C = { ink: '#000', ochre: '#eab308', bg: '#fafafa', muted: '#4f4633', darkBg: '#0d0d0d', light: '#fafafa', outlineVariant: '#d3c5ac' };
const mark = (s, fg) => `<svg viewBox="0 0 32 32" width="${s}" height="${s}" shape-rendering="crispEdges">
  <rect width="32" height="32" fill="transparent"/>
  <rect x="1" y="1" width="30" height="30" fill="none" stroke="${fg}" stroke-width="2"/>
  <rect x="6" y="6" width="20" height="9" fill="${C.ochre}" stroke="${fg}" stroke-width="2"/>
  <line x1="6" y1="20" x2="26" y2="20" stroke="${fg}" stroke-width="2"/>
  <line x1="6" y1="25" x2="20" y2="25" stroke="${fg}" stroke-width="2"/></svg>`;

async function main() {
  await mkdir(tmp, { recursive: true });
  const ebg = await b64(join(root, 'node_modules/@fontsource-variable/eb-garamond/files/eb-garamond-latin-wght-normal.woff2'));
  const mono = await b64(join(root, 'node_modules/@fontsource/space-mono/files/space-mono-latin-700-normal.woff2'));

  const css = `
@font-face{font-family:'EB Garamond';src:url(data:font/woff2;base64,${ebg}) format('woff2');font-weight:400 700}
@font-face{font-family:'Space Mono';src:url(data:font/woff2;base64,${mono}) format('woff2');font-weight:700}
*{margin:0;padding:0;box-sizing:border-box}html,body{width:1500px;height:500px}
.s{position:relative;width:1500px;height:500px;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center}
.fr{position:absolute;inset:28px;border:5px solid var(--fg)}
.mono{font-family:'Space Mono',monospace;text-transform:uppercase;letter-spacing:.16em}
.serif{font-family:'EB Garamond',serif}`;

  const doc = (bg, fg, inner) => `<!doctype html><html><head><meta charset="utf-8"><style>${css}</style></head>
    <body><div class="s" style="--fg:${fg};background:${bg};color:${fg}"><div class="fr"></div>${inner}</div></body></html>`;

  // Banner 1 — claro
  const b1 = doc(C.bg, C.ink, `
    <div style="display:flex;align-items:center;gap:28px">${mark(86, C.ink)}
      <h1 class="serif" style="font-size:108px;letter-spacing:-.04em;line-height:1">Cine Archive</h1></div>
    <p class="mono" style="font-size:22px;color:${C.muted};margin-top:22px">Archivo editorial de cine</p>
    <div style="width:120px;height:9px;background:${C.ochre};margin:26px 0"></div>
    <p class="serif" style="font-size:36px;font-style:italic">Cine de dominio público · abierto y gratuito · cinearchive.es</p>`);

  // Banner 2 — oscuro
  const b2 = doc(C.darkBg, C.light, `
    <div style="display:flex;align-items:center;gap:22px">${mark(60, C.light)}
      <span class="serif" style="font-size:52px;letter-spacing:-.02em">Cine Archive</span></div>
    <h1 class="serif" style="font-size:78px;letter-spacing:-.03em;line-height:1.04;margin-top:24px;max-width:1180px">Cine, prensa y memoria de dominio público</h1>
    <p class="mono" style="font-size:22px;color:${C.ochre};margin-top:28px">Cine abierto · Hemeroteca · Dosieres · Palmarés</p>`);

  await writeFile(join(tmp, 'banner-x-claro.html'), b1);
  await writeFile(join(tmp, 'banner-x-oscuro.html'), b2);
  console.log('Banners HTML generados.');
}

main();
