/**
 * Genera 5 imágenes 1080×1080 para Instagram (lanzamiento de la cuenta) en
 * Escritorio/Cine-Archive-Marca/social/. Usa la marca, la paleta y las fuentes
 * de la app. Luego se rasterizan con Chrome (ver comando que lo acompaña).
 *
 *   node scripts/build-social.mjs
 */
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { homedir } from 'node:os';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const out = join(homedir(), 'Desktop', 'Cine-Archive-Marca', 'social');
const tmp = join(out, '_tmp');
const b64 = async (p) => (await readFile(p)).toString('base64');

const C = {
  ink: '#000000', charcoal: '#1a1a1a', ochre: '#eab308', background: '#fafafa',
  muted: '#4f4633', darkBg: '#0d0d0d', light: '#fafafa', outlineVariant: '#d3c5ac',
};

// Marca (favicon brutalista) en SVG.
const mark = (size, bg, fg, accent) => `<svg viewBox="0 0 32 32" width="${size}" height="${size}" shape-rendering="crispEdges" style="display:block">
  <rect width="32" height="32" fill="${bg}"/>
  <rect x="1" y="1" width="30" height="30" fill="none" stroke="${fg}" stroke-width="2"/>
  <rect x="6" y="6" width="20" height="9" fill="${accent}" stroke="${fg}" stroke-width="2"/>
  <line x1="6" y1="20" x2="26" y2="20" stroke="${fg}" stroke-width="2"/>
  <line x1="6" y1="25" x2="20" y2="25" stroke="${fg}" stroke-width="2"/>
</svg>`;

async function main() {
  await mkdir(tmp, { recursive: true });
  const ebg = await b64(join(root, 'node_modules/@fontsource-variable/eb-garamond/files/eb-garamond-latin-wght-normal.woff2'));
  const geist400 = await b64(join(root, 'node_modules/@fontsource/geist-sans/files/geist-sans-latin-400-normal.woff2'));
  const geist600 = await b64(join(root, 'node_modules/@fontsource/geist-sans/files/geist-sans-latin-600-normal.woff2'));
  const mono700 = await b64(join(root, 'node_modules/@fontsource/space-mono/files/space-mono-latin-700-normal.woff2'));

  const css = `
@font-face{font-family:'EB Garamond';src:url(data:font/woff2;base64,${ebg}) format('woff2');font-weight:400 700;}
@font-face{font-family:'Geist';src:url(data:font/woff2;base64,${geist400}) format('woff2');font-weight:400;}
@font-face{font-family:'Geist';src:url(data:font/woff2;base64,${geist600}) format('woff2');font-weight:600;}
@font-face{font-family:'Space Mono';src:url(data:font/woff2;base64,${mono700}) format('woff2');font-weight:700;}
*{margin:0;padding:0;box-sizing:border-box}
html,body{width:1080px;height:1080px}
.stage{position:relative;width:1080px;height:1080px;overflow:hidden;font-family:'Geist',sans-serif}
.frame{position:absolute;inset:44px;border:6px solid var(--fg)}
.pad{position:absolute;inset:96px;display:flex;flex-direction:column}
.serif{font-family:'EB Garamond',serif}
.mono{font-family:'Space Mono',monospace;text-transform:uppercase;letter-spacing:.14em}
.label{font-family:'Space Mono',monospace;text-transform:uppercase;letter-spacing:.18em;font-size:24px}
.foot{position:absolute;left:96px;right:96px;bottom:74px;display:flex;align-items:center;justify-content:space-between}
.foot .mono{font-size:22px}`;

  const footer = (fg, accent) => `<div class="foot" style="color:${fg}">
      <div style="display:flex;align-items:center;gap:18px">${mark(48, 'transparent', fg, accent)}<span class="mono" style="font-size:26px;font-family:'EB Garamond',serif;letter-spacing:0;text-transform:none">Cine Archive</span></div>
      <span class="mono">archivo de cine libre</span>
    </div>`;

  const page = (bg, fg, accent, inner) =>
    `<!doctype html><html><head><meta charset="utf-8"><style>${css}</style></head><body>
      <div class="stage" style="--fg:${fg};background:${bg};color:${fg}">${inner}</div></body></html>`;

  // 1 — Lanzamiento
  const p1 = page(C.background, C.ink, C.ochre, `
    <div class="frame"></div>
    <div class="pad" style="align-items:center;justify-content:center;text-align:center">
      ${mark(168, 'transparent', C.ink, C.ochre)}
      <h1 class="serif" style="font-size:150px;line-height:.95;letter-spacing:-.04em;margin-top:44px">Cine Archive</h1>
      <p class="mono" style="font-size:26px;margin-top:26px;color:${C.muted}">Archivo editorial de cine</p>
      <div style="width:120px;height:10px;background:${C.ochre};margin:46px 0"></div>
      <p class="serif" style="font-size:52px;font-style:italic">Abierto · gratuito · de dominio público</p>
    </div>`);

  // 2 — Manifiesto / sin muros (oscuro)
  const p2 = page(C.darkBg, C.light, C.ochre, `
    <div class="frame"></div>
    <div class="pad" style="justify-content:center">
      <span class="label" style="color:${C.ochre}">El manifiesto</span>
      <h1 class="serif" style="font-size:132px;line-height:1.02;letter-spacing:-.03em;margin-top:30px">Sin pagos.<br>Sin anuncios.<br>Sin rastreo.</h1>
      <div style="width:160px;height:10px;background:${C.ochre};margin:46px 0"></div>
      <p style="font-size:42px;line-height:1.4;max-width:780px;color:${C.outlineVariant}">Un archivo de cine público y de dominio público. Un catálogo para explorar, no una tienda.</p>
    </div>
    ${footer(C.light, C.ochre)}`);

  // 3 — Cine abierto (lista de títulos)
  const titles = [
    ['Le Voyage dans la Lune', '1902'], ['El gabinete del Dr. Caligari', '1920'],
    ['Nosferatu', '1922'], ['Sherlock Jr.', '1924'], ['El acorazado Potemkin', '1925'],
  ];
  const p3 = page(C.background, C.ink, C.ochre, `
    <div class="frame"></div>
    <div class="pad">
      <span class="label" style="color:${C.muted}">Cine abierto · dominio público</span>
      <h1 class="serif" style="font-size:104px;line-height:.98;letter-spacing:-.03em;margin-top:22px">Cine clásico,<br>gratis y sin muros</h1>
      <div style="width:100%;height:14px;background:${C.ochre};margin:40px 0 30px"></div>
      <ul style="list-style:none;display:flex;flex-direction:column;gap:20px">
        ${titles.map(([t, y]) => `<li style="display:flex;justify-content:space-between;align-items:baseline;border-bottom:3px solid ${C.ink};padding-bottom:16px">
          <span class="serif" style="font-size:48px">${t}</span><span class="mono" style="font-size:30px;color:${C.muted}">${y}</span></li>`).join('')}
      </ul>
    </div>
    ${footer(C.ink, C.ochre)}`);

  // 4 — Hemeroteca
  const p4 = page(C.background, C.ink, C.ochre, `
    <div class="frame"></div>
    <div class="pad" style="justify-content:center">
      <span class="label" style="color:${C.muted}">Hemeroteca</span>
      <h1 class="serif" style="font-size:128px;line-height:.97;letter-spacing:-.03em;margin-top:24px">Un siglo de<br>prensa de cine,<br>libre</h1>
      <p style="font-size:42px;line-height:1.4;max-width:820px;margin-top:40px;color:${C.charcoal}">Revistas y periódicos de cine en dominio público, para leer aquí mismo. Sin cuentas, sin pagos.</p>
    </div>
    ${footer(C.ink, C.ochre)}`);

  // 5 — Glosario (oscuro)
  const p5 = page(C.darkBg, C.light, C.ochre, `
    <div class="frame"></div>
    <div class="pad" style="justify-content:center">
      <span class="label" style="color:${C.ochre}">Glosario de cine</span>
      <h1 class="serif" style="font-size:150px;line-height:.95;letter-spacing:-.03em;margin-top:26px">Plano<br>secuencia</h1>
      <p class="mono" style="font-size:26px;margin-top:24px;color:${C.outlineVariant}">/ Long take</p>
      <p class="serif" style="font-size:54px;font-style:italic;line-height:1.3;max-width:840px;margin-top:38px">«Toma única y prolongada que resuelve una escena entera sin cortar.»</p>
    </div>
    ${footer(C.light, C.ochre)}`);

  // 6 — Efeméride (Lumière)
  const p6 = page(C.background, C.ink, C.ochre, `
    <div class="frame"></div>
    <div class="pad" style="justify-content:center">
      <span class="label" style="color:${C.muted}">Efeméride del cine</span>
      <p class="mono" style="font-size:40px;color:${C.ochre};margin-top:18px">28 · 12 · 1895</p>
      <h1 class="serif" style="font-size:140px;line-height:.96;letter-spacing:-.03em;margin-top:18px">Nace el cine</h1>
      <p style="font-size:44px;line-height:1.4;max-width:840px;margin-top:36px;color:${C.charcoal}">Los hermanos Lumière celebran en París la primera proyección pública de la historia.</p>
    </div>
    ${footer(C.ink, C.ochre)}`);

  // 7 — Palmarés (oscuro)
  const awards = [['Óscar a la mejor película', 'desde 1929'], ['Palma de Oro · Cannes', 'desde 1951'], ['Goya a la mejor película', 'desde 1987']];
  const p7 = page(C.darkBg, C.light, C.ochre, `
    <div class="frame"></div>
    <div class="pad">
      <span class="label" style="color:${C.ochre}">Palmarés</span>
      <h1 class="serif" style="font-size:108px;line-height:.98;letter-spacing:-.03em;margin-top:22px">Todas las ganadoras</h1>
      <div style="width:100%;height:14px;background:${C.ochre};margin:38px 0 30px"></div>
      <ul style="list-style:none;display:flex;flex-direction:column;gap:24px">
        ${awards.map(([t, y]) => `<li style="display:flex;justify-content:space-between;align-items:baseline;border-bottom:3px solid ${C.outlineVariant};padding-bottom:18px">
          <span class="serif" style="font-size:52px">${t}</span><span class="mono" style="font-size:26px;color:${C.ochre}">${y}</span></li>`).join('')}
      </ul>
      <p style="font-size:38px;line-height:1.4;max-width:820px;margin-top:34px;color:${C.outlineVariant}">Cada premio, desde su primera edición. Cada película, a un clic de su ficha.</p>
    </div>
    ${footer(C.light, C.ochre)}`);

  // 8 — Figuras (cineastas)
  const figs = ['Akira Kurosawa', 'Ingmar Bergman', 'Agnès Varda', 'Stanley Kubrick', 'Pedro Almodóvar'];
  const p8 = page(C.background, C.ink, C.ochre, `
    <div class="frame"></div>
    <div class="pad">
      <span class="label" style="color:${C.muted}">Figuras</span>
      <h1 class="serif" style="font-size:100px;line-height:.98;letter-spacing:-.03em;margin-top:20px">Quienes hicieron<br>el cine</h1>
      <div style="width:100%;height:14px;background:${C.ochre};margin:34px 0 22px"></div>
      <ul style="list-style:none;display:flex;flex-direction:column;gap:10px">
        ${figs.map((n) => `<li class="serif" style="font-size:50px;border-bottom:2px solid ${C.ink};padding-bottom:10px">${n}</li>`).join('')}
      </ul>
    </div>
    ${footer(C.ink, C.ochre)}`);

  // 9 — Dosieres (oscuro)
  const doss = ['La Nouvelle Vague', 'Cumbres del cine japonés', 'Ciencia ficción que piensa', 'El alma según Bergman'];
  const p9 = page(C.darkBg, C.light, C.ochre, `
    <div class="frame"></div>
    <div class="pad" style="justify-content:center">
      <span class="label" style="color:${C.ochre}">Dosieres</span>
      <h1 class="serif" style="font-size:112px;line-height:.98;letter-spacing:-.03em;margin-top:22px">Recorridos<br>por el cine</h1>
      <ul style="list-style:none;display:flex;flex-direction:column;gap:18px;margin-top:40px">
        ${doss.map((d) => `<li class="serif" style="font-size:50px;display:flex;align-items:center;gap:24px"><span style="width:22px;height:22px;background:${C.ochre};flex:none;border:2px solid ${C.light}"></span>${d}</li>`).join('')}
      </ul>
      <p style="font-size:38px;line-height:1.4;max-width:820px;margin-top:40px;color:${C.outlineVariant}">Colecciones temáticas comentadas para explorar el archivo.</p>
    </div>
    ${footer(C.light, C.ochre)}`);

  // 10 — Glosario #2 (MacGuffin)
  const p10 = page(C.background, C.ink, C.ochre, `
    <div class="frame"></div>
    <div class="pad" style="justify-content:center">
      <span class="label" style="color:${C.muted}">Glosario de cine</span>
      <h1 class="serif" style="font-size:158px;line-height:.95;letter-spacing:-.03em;margin-top:24px">MacGuffin</h1>
      <p class="mono" style="font-size:26px;margin-top:22px;color:${C.muted}">/ término</p>
      <p class="serif" style="font-size:54px;font-style:italic;line-height:1.3;max-width:860px;margin-top:36px">«Objeto o meta que pone en marcha la trama, aunque importe poco en sí mismo.»</p>
    </div>
    ${footer(C.ink, C.ochre)}`);

  const posts = {
    'post-1-lanzamiento': p1, 'post-2-manifiesto': p2, 'post-3-cine-abierto': p3, 'post-4-hemeroteca': p4, 'post-5-glosario': p5,
    'post-6-efemeride': p6, 'post-7-palmares': p7, 'post-8-figuras': p8, 'post-9-dosieres': p9, 'post-10-macguffin': p10,
  };
  for (const [name, html] of Object.entries(posts)) await writeFile(join(tmp, `${name}.html`), html);
  console.log('HTML generados:', Object.keys(posts).join(', '));
}

main();
