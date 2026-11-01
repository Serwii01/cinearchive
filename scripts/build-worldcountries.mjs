/**
 * Genera src/data/worldcountries.json: un path SVG por país (con su código ISO
 * 3166-1 alfa-2) en proyección Equal Earth, para el atlas. A diferencia de
 * un único trazado del mundo, aquí cada país se puede iluminar al pasar el
 * cursor y colorear con «tu mapa». Build-time; se ejecuta una vez.
 *
 *   node scripts/build-worldcountries.mjs
 *
 * Fuente: Natural Earth 110m (dominio público). Sin la Antártida, que no tiene
 * cine y se comería un tercio del alto.
 */
import { writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const SRC = 'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_110m_admin_0_countries.geojson';
const WIDTH = 1000;

// Territorios que en 110m no tienen polígono pero sí cinematografía propia:
// se dibujan como un punto en el mapa.
const DOTS = [{ iso: 'HK', lon: 114.17, lat: 22.32 }];

// Equal Earth (Šavrič, Patterson y Jenny, 2018): áreas reales y un contorno que
// se reconoce, sin el estiramiento de los polos de la equirectangular.
const A1 = 1.340264, A2 = -0.081106, A3 = 0.000893, A4 = 0.003796, M = Math.sqrt(3) / 2;
function equalEarth(lon, lat) {
  const l = (lon * Math.PI) / 180;
  const t = Math.asin(M * Math.sin((lat * Math.PI) / 180));
  const t2 = t * t, t6 = t2 * t2 * t2;
  return [
    (l * Math.cos(t)) / (M * (A1 + 3 * A2 * t2 + t6 * (7 * A3 + 9 * A4 * t2))),
    -t * (A1 + A2 * t2 + t6 * (A3 + A4 * t2)), // y hacia abajo, como en SVG
  ];
}

const polygons = (g) => (g.type === 'Polygon' ? [g.coordinates] : g.type === 'MultiPolygon' ? g.coordinates : []);

// Área con signo y centroide de un anillo ya proyectado (fórmula del polígono).
function ringCentroid(pts) {
  let a = 0, cx = 0, cy = 0;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const f = pts[j][0] * pts[i][1] - pts[i][0] * pts[j][1];
    a += f; cx += (pts[j][0] + pts[i][0]) * f; cy += (pts[j][1] + pts[i][1]) * f;
  }
  return a ? { area: Math.abs(a / 2), x: cx / (3 * a), y: cy / (3 * a) } : { area: 0, x: pts[0][0], y: pts[0][1] };
}

async function main() {
  const res = await fetch(SRC, { signal: AbortSignal.timeout(60_000) });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const features = (await res.json()).features.filter((f) => f.properties.ISO_A2_EH !== 'AQ');

  // Primera pasada: límites de lo proyectado para encuadrar el lienzo.
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (const f of features) for (const poly of polygons(f.geometry)) for (const [lon, lat] of poly[0]) {
    const [x, y] = equalEarth(lon, lat);
    minX = Math.min(minX, x); maxX = Math.max(maxX, x); minY = Math.min(minY, y); maxY = Math.max(maxY, y);
  }
  const s = WIDTH / (maxX - minX);
  const P = (lon, lat) => { const [x, y] = equalEarth(lon, lat); return [(x - minX) * s, (y - minY) * s]; };
  // Medio píxel sobre 1000 de ancho: no se nota en pantalla y el archivo baja un tercio.
  const r1 = (n) => Math.round(n * 2) / 2;

  const countries = [];
  for (const f of features) {
    // ISO_A2_EH arregla los -99 de ISO_A2 (Francia, Noruega). Lo que siga sin
    // código (Somalilandia, el norte de Chipre) se dibuja, pero no es interactivo.
    const iso = /^[A-Z]{2}$/.test(f.properties.ISO_A2_EH) ? f.properties.ISO_A2_EH : '';
    let d = '';
    let best = { area: -1, x: 0, y: 0 };
    for (const poly of polygons(f.geometry)) {
      poly.forEach((ring, k) => {
        const pts = ring.map(([lon, lat]) => P(lon, lat));
        // Coordenadas relativas: el path pesa la mitad que en absolutas.
        let px = r1(pts[0][0]), py = r1(pts[0][1]);
        d += `M${px} ${py}`;
        for (let i = 1; i < pts.length - 1; i++) {
          const x = r1(pts[i][0]), y = r1(pts[i][1]);
          if (x === px && y === py) continue;
          d += `l${r1(x - px)} ${r1(y - py)}`;
          px = x; py = y;
        }
        d += 'z';
        // El centro del país es el de su polígono más grande (Francia, no la Guayana).
        if (k === 0) { const c = ringCentroid(pts); if (c.area > best.area) best = c; }
      });
    }
    countries.push({ iso, d, c: [r1(best.x), r1(best.y)] });
  }
  for (const dot of DOTS) {
    const [x, y] = P(dot.lon, dot.lat);
    countries.push({ iso: dot.iso, d: '', c: [r1(x), r1(y)] });
  }
  countries.sort((a, b) => a.iso.localeCompare(b.iso));

  const out = {
    note: 'Países de Natural Earth 110m (sin la Antártida) en Equal Earth; d vacío = territorio que se dibuja como punto.',
    w: WIDTH,
    h: Math.round((maxY - minY) * s),
    countries,
  };
  const json = JSON.stringify(out) + '\n';
  await writeFile(join(root, 'src', 'data', 'worldcountries.json'), json);
  console.log(`worldcountries.json · ${countries.length} países · ${out.w}×${out.h} · ${(json.length / 1024).toFixed(1)} KB`);
}

main();
