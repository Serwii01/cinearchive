/**
 * Apunta en pdfilms.json cómo es la copia de Internet Archive de cada película
 * de Cine abierto: cuánto dura y a qué resolución (`copy: { minutes, height }`).
 *
 *   node scripts/fetch-pd-copias.mjs          # solo las que no lo tienen
 *   node scripts/fetch-pd-copias.mjs --force  # todas otra vez
 *
 * POR QUÉ. La ficha decía la duración de la película, no la de lo que se ve:
 * la copia de «Caligari» dura 51 minutos y el original 76 (falta metraje o va a
 * otra velocidad), y hay copias a 320 píxeles junto a otras en 720p. Quien va a
 * ver una película entera tiene derecho a saberlo antes de darle al play.
 *
 * DE DÓNDE. Los metadatos de cada ítem (archive.org/metadata/<id>): de los
 * vídeos, el MP4 de más altura, que es el que sirve el reproductor; si no hay
 * MP4, el vídeo más alto. `length` viene en segundos (o «h:mm:ss»).
 */
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const file = join(root, 'src', 'data', 'pdfilms.json');
const force = process.argv.includes('--force');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** «4500.12» o «1:15:00» → segundos. */
export function segundos(v) {
  if (v == null) return NaN;
  const s = String(v);
  if (s.includes(':')) return s.split(':').reduce((acc, p) => acc * 60 + Number(p), 0);
  return Number(s);
}

/** El vídeo que sirve el reproductor: el MP4 más alto; si no hay, el vídeo más alto. */
export function copiaPrincipal(files) {
  const videos = files.filter((f) => /\.(mp4|m4v|ogv|webm|mkv|avi|mpe?g)$/i.test(f.name) && Number(f.height) > 0 && segundos(f.length) > 0);
  const mp4 = videos.filter((f) => /\.mp4$/i.test(f.name));
  const pool = mp4.length ? mp4 : videos;
  const mejor = pool.sort((a, b) => Number(b.height) - Number(a.height))[0];
  return mejor ? { minutes: Math.round(segundos(mejor.length) / 60), height: Number(mejor.height) } : null;
}

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (isMain) {
  const data = JSON.parse(await readFile(file, 'utf8'));
  let cambios = 0;
  for (const f of data.items) {
    if (f.copy && !force) continue;
    try {
      const res = await fetch(`https://archive.org/metadata/${encodeURIComponent(f.id)}`, { signal: AbortSignal.timeout(30_000) });
      const m = await res.json();
      const c = copiaPrincipal(m.files ?? []);
      if (c) {
        f.copy = c;
        cambios++;
        const aviso = f.runtime && c.minutes < f.runtime * 0.9 ? `  ← ${f.runtime} min el original` : '';
        console.log(`${f.id}: ${c.minutes} min, ${c.height}p${aviso}`);
      } else console.log(`${f.id}: sin vídeo con duración y tamaño`);
    } catch (e) {
      console.log(`${f.id}: fallo (${e.message})`);
    }
    await sleep(300);
  }
  await writeFile(file, JSON.stringify(data, null, 2) + '\n');
  console.log(`\n${cambios} copias apuntadas.`);
}
