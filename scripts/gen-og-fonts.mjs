// Regenera src/lib/og/fonts.data.ts a partir de las TTF en src/lib/og/fonts.
// Las fuentes se inlinean en base64 para que la imagen de historia (Satori)
// funcione igual en dev y en el build SSR sin depender del sistema de archivos.
// Uso: node scripts/gen-og-fonts.mjs
import { readFileSync, writeFileSync } from 'node:fs';

const dir = 'src/lib/og/fonts';
const b64 = (f) => readFileSync(`${dir}/${f}`).toString('base64');

const out = `// AUTO-GENERADO por scripts/gen-og-fonts.mjs — no editar a mano.
// Fuentes TTF (base64) para la imagen de historia (Satori). Inline para que
// funcionen igual en dev y en el build SSR sin depender del sistema de archivos.
/* eslint-disable */
export const EB_GARAMOND_600 = ${JSON.stringify(b64('EBGaramond-SemiBold.ttf'))};
export const SPACE_MONO_400 = ${JSON.stringify(b64('SpaceMono-Regular.ttf'))};
export const SPACE_MONO_700 = ${JSON.stringify(b64('SpaceMono-Bold.ttf'))};
`;

writeFileSync('src/lib/og/fonts.data.ts', out);
console.log('src/lib/og/fonts.data.ts regenerado');
