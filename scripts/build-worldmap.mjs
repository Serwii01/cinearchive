/**
 * Genera src/data/worldmap.json: un único path SVG con los contornos del mundo,
 * proyectado en equirectangular sobre un lienzo 360×180 (igual que los marcadores
 * del atlas, para que coincidan). Build-time; se ejecuta una vez.
 *
 *   node scripts/build-worldmap.mjs
 *
 * Fuente: GeoJSON de países de dominio público (Natural Earth, 110m).
 */
import { writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const SRC = 'https://raw.githubusercontent.com/johan/world.geo.json/master/countries.geo.json';

const px = (lon) => Math.round((lon + 180) * 2) / 2; // 0..360, paso 0.5
const py = (lat) => Math.round((90 - lat) * 2) / 2; // 0..180, paso 0.5

const TOL = 1.3; // simplificación: descarta puntos a menos de ~1.3 unidades del último

function ringPath(ring) {
  // Decimación simple: conserva extremos y puntos que se alejen más de TOL.
  const pts = [];
  let lastX = null;
  let lastY = null;
  for (let i = 0; i < ring.length; i++) {
    const x = px(ring[i][0]);
    const y = py(ring[i][1]);
    const lon = ring[i][0];
    const keep =
      i === 0 ||
      i === ring.length - 1 ||
      lastX === null ||
      Math.abs(x - lastX) + Math.abs(y - lastY) >= TOL;
    if (keep) {
      pts.push([x, y, lon]);
      lastX = x;
      lastY = y;
    }
  }
  if (pts.length < 4) return ''; // descarta islas diminutas
  let d = '';
  let prevLon = null;
  for (let i = 0; i < pts.length; i++) {
    const [x, y, lon] = pts[i];
    // Corta el trazo al cruzar el antimeridiano para no dibujar una raya horizontal.
    const cmd = i === 0 || (prevLon !== null && Math.abs(lon - prevLon) > 180) ? 'M' : 'L';
    d += `${cmd}${x} ${y}`;
    prevLon = lon;
  }
  return d;
}

function geomPath(geom) {
  if (geom.type === 'Polygon') return geom.coordinates.map(ringPath).join('');
  if (geom.type === 'MultiPolygon')
    return geom.coordinates.map((poly) => poly.map(ringPath).join('')).join('');
  return '';
}

async function main() {
  const res = await fetch(SRC, { signal: AbortSignal.timeout(30_000) });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  let d = '';
  for (const f of data.features) {
    if (f.geometry) d += geomPath(f.geometry);
  }
  await writeFile(
    join(root, 'src', 'data', 'worldmap.json'),
    JSON.stringify({ note: 'Contornos del mundo (Natural Earth 110m) en equirectangular 360×180.', d }) + '\n',
  );
  console.log(`worldmap.json escrito · ${(d.length / 1024).toFixed(1)} KB de path`);
}

main();
