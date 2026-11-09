/**
 * Fotogramas propios de Cine abierto para el modo «Clásicos» de Fotograma.
 *
 *   node scripts/build-game-frames.mjs            # las que faltan
 *   node scripts/build-game-frames.mjs --force    # todas otra vez
 *
 * POR QUÉ. Las miniaturas de Cine abierto (public/cinema) son pequeñas y muchas
 * son rótulos o créditos, que regalarían la respuesta. Estas películas son de
 * dominio público (o Creative Commons), así que podemos sacar nuestros propios
 * fotogramas a buena resolución.
 *
 * CÓMO. Pide a Internet Archive el vídeo de cada película y, con ffmpeg, toma
 * ocho fotogramas repartidos entre el 12 % y el 85 % de la duración (ffmpeg
 * salta por HTTP sin bajar la película entera). De esos ocho se quedan los dos
 * con más «imagen»: muchos medios tonos y detalle. Un rótulo de cine mudo es
 * casi todo negro y blanco puros, y una pantalla en negro no tiene detalle, así
 * que ambos puntúan bajo y se descartan solos.
 *
 * SALIDA. public/games/clasicos/<nombre al azar>.webp (1280 px de ancho) y la
 * lista en src/data/games/clasicos.json. El nombre es al azar a propósito: con
 * el de la película (como era al principio) la solución se leía en la URL. Conviene revisar la hoja de contactos
 * (se deja en scratch/) por si se cuela algún rótulo: se quita del JSON a mano.
 */
import { readFile, writeFile, mkdir, rm, access } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { randomBytes } from 'node:crypto';
import sharp from 'sharp';

const run = promisify(execFile);
const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const outDir = join(root, 'public', 'games', 'clasicos');
const outJson = join(root, 'src', 'data', 'games', 'clasicos.json');
const force = process.argv.includes('--force');
const PUNTOS = [0.12, 0.22, 0.32, 0.42, 0.52, 0.62, 0.74, 0.85];

const existe = (p) => access(p).then(() => true, () => false);

/** El mejor vídeo del ítem: el MP4 derivado (h.264) si lo hay. */
async function video(id) {
  const meta = await (await fetch(`https://archive.org/metadata/${id}`, { signal: AbortSignal.timeout(30_000) })).json();
  const files = meta.files ?? [];
  const mp4 = files.filter((f) => /\.mp4$/i.test(f.name)).sort((a, b) => Number(b.size ?? 0) - Number(a.size ?? 0));
  const elegido = mp4.find((f) => /h\.264|512kb|mpeg4/i.test(f.format ?? '')) ?? mp4[0] ?? files.find((f) => /\.(ogv|avi|mkv|webm)$/i.test(f.name));
  if (!elegido) return null;
  const dur = Number(elegido.length) || Number(meta.metadata?.runtime?.match?.(/\d+/)?.[0]) * 60 || 0;
  return { url: `https://archive.org/download/${id}/${encodeURIComponent(elegido.name)}`, dur };
}

/** Cuánta «imagen» tiene un fotograma: medios tonos × detalle. */
async function puntuar(file) {
  const { data, info } = await sharp(file).grayscale().resize(320).raw().toBuffer({ resolveWithObject: true });
  let medios = 0;
  let suma = 0;
  let suma2 = 0;
  for (const v of data) {
    if (v > 45 && v < 210) medios++;
    suma += v;
    suma2 += v * v;
  }
  const n = info.width * info.height;
  const media = suma / n;
  const desv = Math.sqrt(suma2 / n - media * media);
  if (media < 25 || media > 235) return 0; // negro o blanco
  return (medios / n) * Math.min(desv, 70);
}

async function main() {
  const { items } = JSON.parse(await readFile(join(root, 'src', 'data', 'pdfilms.json'), 'utf8'));
  await mkdir(outDir, { recursive: true });
  const previo = (await existe(outJson)) ? JSON.parse(await readFile(outJson, 'utf8')).frames : {};
  const frames = force ? {} : { ...previo };
  const tmp = join(tmpdir(), 'cine-frames');
  await mkdir(tmp, { recursive: true });

  let i = 0;
  const trabajar = async () => {
    while (i < items.length) {
      const f = items[i++];
      if (frames[f.id] && !force) continue;
      try {
        const v = await video(f.id);
        const dur = v?.dur || f.runtime * 60;
        if (!v || !dur) throw new Error('sin vídeo');
        const tomas = [];
        for (const [k, p] of PUNTOS.entries()) {
          const file = join(tmp, `${f.id}-${k}.png`);
          try {
            await run('ffmpeg', ['-y', '-loglevel', 'error', '-ss', String(Math.round(dur * p)), '-i', v.url, '-frames:v', '1', '-vf', 'scale=1280:-2', file], { timeout: 90_000 });
            tomas.push({ file, nota: await puntuar(file) });
          } catch {
            /* un punto que no se puede leer no impide los demás */
          }
        }
        const mejores = tomas.filter((t) => t.nota > 8).sort((a, b) => b.nota - a.nota).slice(0, 2);
        if (!mejores.length) throw new Error('ningún fotograma útil');
        const nombres = [];
        for (const t of mejores) {
          const nombre = `${randomBytes(8).toString('hex')}.webp`;
          await sharp(t.file).webp({ quality: 86 }).toFile(join(outDir, nombre));
          nombres.push(nombre);
        }
        frames[f.id] = nombres;
        for (const t of tomas) await rm(t.file, { force: true });
        console.log(`  ${f.id}: ${nombres.length}`);
      } catch (e) {
        console.warn(`  ${f.id}: ${e.message}`);
      }
    }
  };
  await Promise.all(Array.from({ length: 4 }, trabajar));

  const ordenado = Object.fromEntries(Object.entries(frames).sort(([a], [b]) => a.localeCompare(b)));
  await writeFile(outJson, JSON.stringify({ note: 'Generado por scripts/build-game-frames.mjs. Se puede quitar a mano un fotograma que sea un rótulo.', frames: ordenado }, null, 1) + '\n');
  console.log(`${Object.keys(ordenado).length} películas con fotograma`);
}

main();
