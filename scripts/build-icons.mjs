/**
 * Rasteriza el logotipo del sitio (public/favicon.svg) a los PNG que piden el
 * manifest de la PWA y iOS. Se ejecuta a mano cuando cambie la marca:
 *
 *   node scripts/build-icons.mjs
 *
 * Los PNG resultantes se versionan en public/icons/ (no se generan en build:
 * la marca cambia una vez cada mucho y así el despliegue no depende de resvg).
 */
import { writeFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { Resvg } from '@resvg/resvg-js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const outDir = join(root, 'public', 'icons');

const INK = '#000000';
const OCHRE = '#EAB308';
const BG = '#FAFAFA';

/** El mismo dibujo del favicon, en un lienzo 32×32. */
const mark = `
  <rect x="1" y="1" width="30" height="30" fill="none" stroke="${INK}" stroke-width="2"/>
  <rect x="6" y="6" width="20" height="9" fill="${OCHRE}" stroke="${INK}" stroke-width="2"/>
  <line x1="6" y1="20" x2="26" y2="20" stroke="${INK}" stroke-width="2"/>
  <line x1="6" y1="25" x2="20" y2="25" stroke="${INK}" stroke-width="2"/>`;

/**
 * `inset` deja margen alrededor de la marca. Los iconos "maskable" de Android se
 * recortan en círculo, así que ahí el dibujo debe caber en el 80% central: se
 * encoge al 62% para que no le corten el marco.
 */
function svg(size, inset = 0) {
  const scale = (size * (1 - inset * 2)) / 32;
  const offset = size * inset;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" fill="${BG}"/>
  <g transform="translate(${offset} ${offset}) scale(${scale})">${mark}
  </g>
</svg>`;
}

const png = (source, size) =>
  new Resvg(source, { fitTo: { mode: 'width', value: size } }).render().asPng();

const ICONS = [
  { file: 'icon-192.png', size: 192, inset: 0 },
  { file: 'icon-512.png', size: 512, inset: 0 },
  // Con margen: Android recorta estos en círculo o "squircle".
  { file: 'icon-maskable-192.png', size: 192, inset: 0.19 },
  { file: 'icon-maskable-512.png', size: 512, inset: 0.19 },
  // iOS no aplica máscara: usa el icono tal cual, con su propio redondeado.
  { file: 'apple-touch-icon.png', size: 180, inset: 0.08 },
];

await mkdir(outDir, { recursive: true });
for (const { file, size, inset } of ICONS) {
  const buf = png(svg(size, inset), size);
  await writeFile(join(outDir, file), buf);
  console.log(`  ${file}  ${size}×${size}  ${(buf.length / 1024).toFixed(1)} kB`);
}
console.log(`\nIconos escritos en public/icons/`);
