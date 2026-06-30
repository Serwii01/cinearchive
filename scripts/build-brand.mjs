/**
 * Genera el kit de marca de Cine Archive en el Escritorio:
 *   logos SVG (con fuentes incrustadas) + una guía de estilo HTML.
 * Después, scripts externos (Chrome headless) rasterizan a PNG y PDF.
 *
 *   node scripts/build-brand.mjs
 */
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { homedir } from 'node:os';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const out = join(homedir(), 'Desktop', 'Cine-Archive-Marca');
const logosDir = join(out, 'logos');
const tmpDir = join(out, '_tmp');

const b64 = async (p) => (await readFile(p)).toString('base64');

// --- Paleta (de src/styles/global.css) ---
const C = {
  ink: '#000000', charcoal: '#1a1a1a', ochre: '#eab308', ochreDim: '#6b4e07',
  background: '#fafafa', surface: '#f9f9f9', filmWhite: '#f4f4f4', surfaceDim: '#dadada',
  outline: '#817660', outlineVariant: '#d3c5ac', muted: '#4f4633', error: '#ba1a1a',
  darkBg: '#0d0d0d', darkOchre: '#f2be1d',
};

async function main() {
  await mkdir(logosDir, { recursive: true });
  await mkdir(tmpDir, { recursive: true });

  // Fuentes incrustadas (base64).
  const ebg = await b64(join(root, 'node_modules/@fontsource-variable/eb-garamond/files/eb-garamond-latin-wght-normal.woff2'));
  const geist400 = await b64(join(root, 'node_modules/@fontsource/geist-sans/files/geist-sans-latin-400-normal.woff2'));
  const geist600 = await b64(join(root, 'node_modules/@fontsource/geist-sans/files/geist-sans-latin-600-normal.woff2'));
  const mono400 = await b64(join(root, 'node_modules/@fontsource/space-mono/files/space-mono-latin-400-normal.woff2'));
  const mono700 = await b64(join(root, 'node_modules/@fontsource/space-mono/files/space-mono-latin-700-normal.woff2'));

  const fontFace = `
@font-face{font-family:'EB Garamond';src:url(data:font/woff2;base64,${ebg}) format('woff2');font-weight:400 700;font-style:normal;}
@font-face{font-family:'Geist';src:url(data:font/woff2;base64,${geist400}) format('woff2');font-weight:400;}
@font-face{font-family:'Geist';src:url(data:font/woff2;base64,${geist600}) format('woff2');font-weight:600;}
@font-face{font-family:'Space Mono';src:url(data:font/woff2;base64,${mono400}) format('woff2');font-weight:400;}
@font-face{font-family:'Space Mono';src:url(data:font/woff2;base64,${mono700}) format('woff2');font-weight:700;}`;

  // --- Marca: el logotipo real del sitio (favicon brutalista, public/favicon.svg) ---
  const markShapes = (bg, fg, accent) => `
    <rect width="32" height="32" fill="${bg}"/>
    <rect x="1" y="1" width="30" height="30" fill="none" stroke="${fg}" stroke-width="2"/>
    <rect x="6" y="6" width="20" height="9" fill="${accent}" stroke="${fg}" stroke-width="2"/>
    <line x1="6" y1="20" x2="26" y2="20" stroke="${fg}" stroke-width="2"/>
    <line x1="6" y1="25" x2="20" y2="25" stroke="${fg}" stroke-width="2"/>`;

  const svgFontStyle = `<style>${`
@font-face{font-family:'EB Garamond';src:url(data:font/woff2;base64,${ebg}) format('woff2');font-weight:400 700;}
@font-face{font-family:'Space Mono';src:url(data:font/woff2;base64,${mono700}) format('woff2');font-weight:700;}`}</style>`;

  const markSvg = (bg, fg, accent) =>
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="200" height="200" shape-rendering="crispEdges">${markShapes(bg, fg, accent)}</svg>`;

  const wordmarkSvg = (text, tag, bg, fg, accent) =>
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 760 220" width="760" height="220">${svgFontStyle}
      <g transform="translate(24,30) scale(5)" shape-rendering="crispEdges">${markShapes(bg, fg, accent)}</g>
      <text x="224" y="120" font-family="'EB Garamond', Georgia, serif" font-size="86" font-weight="600" fill="${text}" letter-spacing="-2">Cine Archive</text>
      <text x="228" y="160" font-family="'Space Mono', monospace" font-size="17" font-weight="700" letter-spacing="3" fill="${tag}">ARCHIVO EDITORIAL DE CINE</text>
    </svg>`;

  // Variantes (bg, líneas/borde, banda ocre)
  const markStd = markSvg(C.background, C.ink, C.ochre);
  const markInv = markSvg(C.darkBg, C.background, C.ochre);
  const wmStd = wordmarkSvg(C.charcoal, C.muted, C.background, C.ink, C.ochre);
  const wmInv = wordmarkSvg(C.background, C.outlineVariant, C.darkBg, C.background, C.ochre);

  await writeFile(join(logosDir, 'cine-archive-mark.svg'), markStd);
  await writeFile(join(logosDir, 'cine-archive-mark-inverso.svg'), markInv);
  await writeFile(join(logosDir, 'cine-archive-wordmark.svg'), wmStd);
  await writeFile(join(logosDir, 'cine-archive-wordmark-inverso.svg'), wmInv);

  // HTML envoltorio para capturar PNG con Chrome (fondo definido por variante).
  const wrap = (svg, bg, w, h) =>
    `<!doctype html><html><head><meta charset="utf-8"><style>${fontFace}
    html,body{margin:0;padding:0}body{width:${w}px;height:${h}px;background:${bg};display:flex;align-items:center;justify-content:center}
    svg{display:block}</style></head><body>${svg}</body></html>`;
  await writeFile(join(tmpDir, 'mark.html'), wrap(markStd, C.background, 240, 240).replace('width="200" height="200"', 'width="200" height="200" style="margin:20px"'));
  await writeFile(join(tmpDir, 'mark-inverso.html'), wrap(markInv, C.darkBg, 240, 240).replace('width="200" height="200"', 'width="200" height="200" style="margin:20px"'));
  await writeFile(join(tmpDir, 'wordmark.html'), wrap(wmStd, C.background, 760, 220));
  await writeFile(join(tmpDir, 'wordmark-inverso.html'), wrap(wmInv, C.darkBg, 760, 220));

  // --- Guía de estilo (HTML para imprimir a PDF) ---
  const palette = [
    ['Ink', C.ink, '--c-ink', '#fff'], ['Charcoal', C.charcoal, '--c-charcoal', '#fff'],
    ['Ochre', C.ochre, '--c-ochre', '#1a1a1a'], ['Ochre dim', C.ochreDim, '--c-ochre-dim', '#fff'],
    ['Background', C.background, '--c-background', '#1a1a1a'], ['Surface', C.surface, '--c-surface', '#1a1a1a'],
    ['Film white', C.filmWhite, '--c-film-white', '#1a1a1a'], ['Surface dim', C.surfaceDim, '--c-surface-dim', '#1a1a1a'],
    ['Outline', C.outline, '--c-outline', '#fff'], ['Outline variant', C.outlineVariant, '--c-outline-variant', '#1a1a1a'],
    ['Muted', C.muted, '--c-muted', '#fff'], ['Error', C.error, '--c-error', '#fff'],
    ['Dark bg', C.darkBg, '--c-background (dark)', '#fff'], ['Dark ochre', C.darkOchre, '--c-ochre (dark)', '#1a1a1a'],
  ];
  const swatch = ([name, hex, varn, on]) => `
    <div style="border:2px solid ${C.ink};">
      <div style="height:84px;background:${hex};color:${on};display:flex;align-items:flex-end;padding:8px;font-family:'Space Mono';font-size:12px;">${hex}</div>
      <div style="border-top:2px solid ${C.ink};padding:8px;">
        <div style="font-family:'Geist';font-weight:600;font-size:14px;">${name}</div>
        <div style="font-family:'Space Mono';font-size:11px;color:${C.muted};">${varn}</div>
      </div>
    </div>`;

  const guide = `<!doctype html><html lang="es"><head><meta charset="utf-8"><title>Cine Archive — Guía de estilo</title>
<style>
${fontFace}
@page{size:A4;margin:14mm;}
*{box-sizing:border-box;}
body{margin:0;color:${C.charcoal};font-family:'Geist',system-ui,sans-serif;background:${C.background};}
h1,h2,h3{font-family:'EB Garamond',Georgia,serif;color:${C.ink};margin:0;}
.label{font-family:'Space Mono',monospace;text-transform:uppercase;letter-spacing:.12em;font-size:11px;color:${C.muted};}
.sec{padding:18px 0;border-top:2px solid ${C.ink};margin-top:22px;page-break-inside:avoid;}
.rule{border:0;border-top:2px solid ${C.ink};}
.grid{display:grid;gap:10px;}
.btn{display:inline-block;border:2px solid ${C.ink};padding:10px 18px;font-family:'Space Mono';text-transform:uppercase;letter-spacing:.1em;font-size:12px;}
.chip{display:inline-block;border:2px solid ${C.ink};padding:4px 10px;font-family:'Space Mono';text-transform:uppercase;letter-spacing:.1em;font-size:11px;}
</style></head>
<body>
  <header style="display:flex;align-items:flex-end;justify-content:space-between;gap:16px;padding-bottom:14px;">
    <div>
      <div class="label">Guía de estilo · Brand guidelines</div>
      <h1 style="font-size:54px;line-height:1;letter-spacing:-.03em;margin-top:8px;">Cine Archive</h1>
      <div style="font-family:'Space Mono';font-size:12px;letter-spacing:.18em;text-transform:uppercase;color:${C.muted};margin-top:8px;">Archivo editorial de cine · público y de dominio público</div>
    </div>
    <div style="width:120px;flex:none;">${markStd.replace('width="200" height="200"', 'width="120" height="120"')}</div>
  </header>

  <section class="sec">
    <h2 style="font-size:28px;">Logotipo</h2>
    <p style="max-width:60ch;font-size:14px;">El logotipo combina la marca del sitio —un sello de archivo enmarcado, con su banda ocre y dos reglas— y la palabra-marca en serif. Mantén un área de respeto mínima equivalente a la altura de la marca. No la deformes, recolorees fuera de la paleta ni le añadas sombras o esquinas redondeadas.</p>
    <div class="grid" style="grid-template-columns:1fr 1fr;margin-top:14px;">
      <div style="border:2px solid ${C.ink};background:${C.background};padding:22px;">${wmStd.replace('width="760" height="220"', 'width="100%" height="auto"')}</div>
      <div style="border:2px solid ${C.ink};background:${C.darkBg};padding:22px;">${wmInv.replace('width="760" height="220"', 'width="100%" height="auto"')}</div>
      <div style="border:2px solid ${C.ink};background:${C.background};padding:22px;display:flex;justify-content:center;">${markStd.replace('width="200" height="200"', 'width="120" height="120"')}</div>
      <div style="border:2px solid ${C.ink};background:${C.darkBg};padding:22px;display:flex;justify-content:center;">${markInv.replace('width="200" height="200"', 'width="120" height="120"')}</div>
    </div>
  </section>

  <section class="sec">
    <h2 style="font-size:28px;">Paleta</h2>
    <div class="grid" style="grid-template-columns:repeat(4,1fr);margin-top:14px;">
      ${palette.map(swatch).join('')}
    </div>
  </section>

  <section class="sec">
    <h2 style="font-size:28px;">Tipografía</h2>
    <div class="grid" style="grid-template-columns:1fr 1fr 1fr;margin-top:14px;">
      <div style="border:2px solid ${C.ink};padding:16px;">
        <div class="label">Display · EB Garamond</div>
        <div style="font-family:'EB Garamond',serif;font-size:72px;line-height:1;margin-top:6px;">Aa</div>
        <div style="font-family:'EB Garamond',serif;font-size:22px;margin-top:6px;">El cine es memoria</div>
      </div>
      <div style="border:2px solid ${C.ink};padding:16px;">
        <div class="label">Texto · Geist Sans</div>
        <div style="font-family:'Geist';font-weight:600;font-size:72px;line-height:1;margin-top:6px;">Aa</div>
        <div style="font-family:'Geist';font-size:15px;margin-top:10px;">Texto de interfaz y cuerpo, claro y neutro a cualquier tamaño.</div>
      </div>
      <div style="border:2px solid ${C.ink};padding:16px;">
        <div class="label">Mono · Space Mono</div>
        <div style="font-family:'Space Mono';font-size:64px;line-height:1;margin-top:6px;">Aa</div>
        <div style="font-family:'Space Mono';font-size:12px;letter-spacing:.1em;text-transform:uppercase;margin-top:14px;">Etiquetas · Metadatos · 2026</div>
      </div>
    </div>
  </section>

  <section class="sec">
    <h2 style="font-size:28px;">Componentes</h2>
    <div style="display:flex;flex-wrap:wrap;gap:12px;align-items:center;margin-top:14px;">
      <span class="btn" style="background:${C.ochre};color:${C.charcoal};">Botón primario</span>
      <span class="btn" style="background:transparent;color:${C.ink};">Botón secundario</span>
      <span class="chip">Etiqueta</span>
      <span class="chip" style="background:${C.ink};color:${C.background};">Etiqueta inversa</span>
    </div>
    <div style="border:2px solid ${C.ink};margin-top:14px;max-width:320px;">
      <div style="background:${C.ink};color:${C.background};padding:6px 10px;" class="label">Ficha</div>
      <div style="padding:14px;">
        <div style="font-family:'EB Garamond',serif;font-size:26px;color:${C.ink};">Título de la obra</div>
        <div style="font-family:'Space Mono';font-size:11px;color:${C.muted};margin-top:4px;text-transform:uppercase;letter-spacing:.08em;">Dirección · 1962 · 90′</div>
      </div>
    </div>
  </section>

  <section class="sec">
    <h2 style="font-size:28px;">Lenguaje visual</h2>
    <ul style="font-size:14px;max-width:70ch;line-height:1.6;">
      <li><b>Esquinas rectas.</b> Sin redondeos en ningún elemento.</li>
      <li><b>Alto contraste y retícula.</b> Líneas de 1–2px que conectan de borde a borde.</li>
      <li><b>El ocre es el único acento.</b> Úsalo con moderación, siempre con texto oscuro encima.</li>
      <li><b>La tipografía es la estructura.</b> Serif para titulares, sans para leer, mono para datos.</li>
      <li><b>Tono:</b> sobrio, editorial, al servicio de lo público y de dominio público.</li>
    </ul>
  </section>

  <footer style="margin-top:24px;border-top:2px solid ${C.ink};padding-top:10px;font-family:'Space Mono';font-size:11px;color:${C.muted};text-transform:uppercase;letter-spacing:.1em;">
    Cine Archive · Guía de estilo · © Sergio Fernández Morales
  </footer>
</body></html>`;
  await writeFile(join(out, 'guia-de-estilo.html'), guide);

  // LEEME
  const readme = `CINE ARCHIVE — KIT DE MARCA
============================

Contenido:
  guia-de-estilo.pdf      Guía de estilo visual (logo, paleta, tipografía, componentes).
  guia-de-estilo.html     Fuente de la guía (fuentes incrustadas).
  logos/                  Logotipos en SVG (vector) y PNG.
    cine-archive-wordmark(.svg/.png)           Palabra-marca, fondo claro.
    cine-archive-wordmark-inverso(.svg/.png)   Palabra-marca, fondo oscuro.
    cine-archive-mark(.svg/.png)               Marca / icono, fondo claro.
    cine-archive-mark-inverso(.svg/.png)       Marca / icono, fondo oscuro.

Tipografías: EB Garamond (titulares), Geist Sans (texto), Space Mono (datos).
Acento: ocre #eab308 (texto oscuro encima). Esquinas siempre rectas.

Regenerar: node scripts/build-brand.mjs  (+ rasterizado con Chrome).
`;
  await writeFile(join(out, 'LEEME.txt'), readme);

  console.log('Kit de marca generado en:', out);
}

main();
