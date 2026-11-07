/**
 * Verifica los identificadores de Cine abierto y descarga UNA vez la imagen de
 * cada película a public/cinema/<id>.webp (como las portadas de la hemeroteca:
 * sin ráfagas, reejecutable, salta las que ya existen).
 *
 *   node --env-file=.env scripts/fetch-pd.mjs          # solo las que falten
 *   node --env-file=.env scripts/fetch-pd.mjs --force  # vuelve a descargar todas
 *
 * DE DÓNDE SALE LA IMAGEN. Antes era la miniatura de Internet Archive: 180 px de
 * ancho, a menudo el primer fotograma (negro o un rótulo), y las tarjetas la
 * pintan a 400 px o más: salían borrosas. Ahora, por orden:
 *   1. Un fotograma de la película en TMDB (las «backdrops», a 1280 px), sin
 *      texto encima si lo hay. Hace falta TMDB_API_KEY y el tmdbId de la ficha
 *      (scripts/resolve-tmdb-ids.mjs --cine). Son fotogramas de la propia
 *      obra, así que tienen su misma licencia.
 *   2. Si hay ffmpeg en el equipo, un fotograma a un tercio del vídeo de
 *      Internet Archive, a su tamaño real (ffmpeg pide solo el trozo que
 *      necesita, no el vídeo entero).
 *   3. Un fotograma de los que Internet Archive extrae del vídeo (160 px:
 *      pequeños, pero nunca el negro del principio).
 *   4. La miniatura del catálogo de Internet Archive.
 * Con `"image": "ia"` en la ficha se salta TMDB: para cuando su imagen es de
 * otra película o lleva un título que no corresponde (Caminandes 1 salía con el
 * logo del episodio 3). Para cambiar una sola, borra su .webp y vuelve a lanzarlo.
 *
 * QUÉ SE GUARDA. 800 px de ancho en WebP: cubre la tarjeta más grande en
 * pantallas retina y sirve de imagen al compartir. Lo hace sharp (viene con
 * Astro).
 *
 * Además comprueba que cada ítem sigue siendo un "movies" en archive.org y avisa
 * de los que ya no resuelven, y apunta en pdfilms.json la fecha en que se
 * publicó allí (`published`), si falta: los datos de vídeo que lee Google
 * (VideoObject) la piden como uploadDate.
 */
import { readFile, writeFile, mkdir, access, unlink } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { spawnSync } from 'node:child_process';
import sharp from 'sharp';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const outDir = join(root, 'public', 'cinema');
const force = process.argv.includes('--force');
const UA = 'CineArchive/1.0 (public-domain film stills)';
const KEY = process.env.TMDB_API_KEY;

const ANCHO = 800;
const CALIDAD = 76;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const exists = (p) => access(p).then(() => true).catch(() => false);

/** Metadatos de Internet Archive, o null si ya no es una película. */
async function metadatos(id) {
  try {
    const res = await fetch(`https://archive.org/metadata/${id}`, {
      headers: { 'user-agent': UA },
      signal: AbortSignal.timeout(20_000),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data?.metadata?.mediatype === 'movies' ? data : null;
  } catch {
    return null;
  }
}

async function bajar(url, headers = { 'user-agent': UA }) {
  const res = await fetch(url, { headers, redirect: 'follow', signal: AbortSignal.timeout(30_000) });
  if (!res.ok) return null;
  const buf = Buffer.from(await res.arrayBuffer());
  return buf.byteLength > 1500 ? buf : null; // un «no encontrado» disfrazado
}

/** El mejor fotograma de TMDB: sin texto, el más votado, el más grande. */
async function fotogramaTmdb(tmdbId) {
  if (!KEY || !tmdbId) return null;
  try {
    const res = await fetch(`https://api.themoviedb.org/3/movie/${tmdbId}/images?api_key=${KEY}`, {
      signal: AbortSignal.timeout(20_000),
    });
    if (!res.ok) return null;
    const d = await res.json();
    const lista = (d.backdrops ?? []).slice().sort(
      (a, b) =>
        Number(a.iso_639_1 !== null) - Number(b.iso_639_1 !== null) ||
        (b.vote_average ?? 0) - (a.vote_average ?? 0) ||
        (b.width ?? 0) - (a.width ?? 0),
    );
    if (!lista[0]) return null;
    const buf = await bajar(`https://image.tmdb.org/t/p/w1280${lista[0].file_path}`, {});
    return buf ? { buf, de: 'TMDB' } : null;
  } catch {
    return null;
  }
}

const HAY_FFMPEG = spawnSync('ffmpeg', ['-version'], { stdio: 'ignore' }).status === 0;

/** Duración en segundos de un «length» de Internet Archive ("5401.2" o "1:30:01"). */
function segundos(len) {
  if (!len) return 0;
  if (/^\d+(\.\d+)?$/.test(len)) return Number(len);
  return String(len).split(':').map(Number).reduce((s, n) => s * 60 + n, 0);
}

/** Un fotograma a un tercio del vídeo, a su tamaño real, con ffmpeg. */
function fotogramaVideo(id, meta) {
  if (!HAY_FFMPEG) return null;
  const video = (meta?.files ?? []).find((f) => /\.mp4$/i.test(f.name) && segundos(f.length) > 0);
  if (!video) return null;
  const url = `https://archive.org/download/${id}/${video.name.split('/').map(encodeURIComponent).join('/')}`;
  const r = spawnSync(
    'ffmpeg',
    ['-v', 'error', '-ss', String(Math.round(segundos(video.length) / 3)), '-i', url, '-frames:v', '1', '-f', 'image2pipe', '-vcodec', 'png', '-'],
    { maxBuffer: 50 * 1024 * 1024, timeout: 120_000 },
  );
  return r.status === 0 && r.stdout?.length > 1500 ? { buf: r.stdout, de: 'fotograma del vídeo' } : null;
}

/** Un fotograma de hacia un tercio de la película, de los que extrae Internet Archive. */
async function fotogramaIa(id, meta) {
  const delVideo = fotogramaVideo(id, meta);
  if (delVideo) return delVideo;
  const frames = (meta?.files ?? [])
    .filter((f) => f.format === 'Thumbnail')
    .map((f) => f.name)
    .sort();
  const elegido = frames[Math.floor(frames.length / 3)];
  if (elegido) {
    const buf = await bajar(`https://archive.org/download/${id}/${elegido.split('/').map(encodeURIComponent).join('/')}`);
    if (buf) return { buf, de: 'fotograma de IA' };
  }
  const buf = await bajar(`https://archive.org/services/img/${id}`);
  return buf ? { buf, de: 'miniatura de IA' } : null;
}

async function main() {
  await mkdir(outDir, { recursive: true });
  if (!KEY) console.log('⚠ Sin TMDB_API_KEY: solo imágenes de Internet Archive (usa node --env-file=.env).');
  const file = join(root, 'src', 'data', 'pdfilms.json');
  const raw = await readFile(file, 'utf8');
  const data = JSON.parse(raw);
  const items = data.items;

  let ok = 0;
  let skipped = 0;
  let fechas = 0;
  let bytes = 0;
  const failed = [];
  const notMovies = [];
  const deIa = [];

  for (const item of items) {
    const { id } = item;
    const meta = await metadatos(id);
    if (!meta) notMovies.push(id);
    else {
      const publicado = String(meta.metadata.publicdate ?? '').slice(0, 10);
      if (!item.published && /^\d{4}-\d{2}-\d{2}$/.test(publicado)) {
        item.published = publicado;
        fechas++;
      }
    }

    const dest = join(outDir, `${id}.webp`);
    if (!force && (await exists(dest))) {
      skipped++;
      continue;
    }
    let done = false;
    for (let attempt = 1; attempt <= 3 && !done; attempt++) {
      try {
        const origen = (item.image === 'ia' ? null : await fotogramaTmdb(item.tmdbId)) ?? (await fotogramaIa(id, meta));
        if (!origen) throw new Error('ninguna fuente responde');
        const salida = await sharp(origen.buf)
          .resize({ width: ANCHO, withoutEnlargement: true })
          .webp({ quality: CALIDAD })
          .toBuffer();
        const m = await sharp(salida).metadata();
        await writeFile(dest, salida);
        // Si venía del formato viejo, se quita para no dejar peso muerto.
        const viejo = join(outDir, `${id}.jpg`);
        if (await exists(viejo)) await unlink(viejo);
        if (origen.de !== 'TMDB') deIa.push(id);
        ok++;
        bytes += salida.byteLength;
        done = true;
        console.log(`✓ ${id} ${m.width}×${m.height} (${Math.round(salida.byteLength / 1024)} kB, ${origen.de})`);
      } catch (e) {
        if (attempt === 3) {
          failed.push(id);
          console.log(`✗ ${id}: ${e.message}`);
        } else {
          await sleep(2000 * attempt);
        }
      }
    }
    await sleep(350);
  }

  if (fechas > 0) {
    // Mismo formato y saltos de línea que tenía el archivo.
    const out = JSON.stringify(data, null, 2) + '\n';
    await writeFile(file, raw.includes('\r\n') ? out.replace(/\n/g, '\r\n') : out);
  }

  console.log(
    `\nDescargadas: ${ok} (${Math.round(bytes / 1024)} kB) · Ya existían: ${skipped} · Fallidas: ${failed.length} · Fechas añadidas: ${fechas}`,
  );
  if (deIa.length) console.log('Sin fotograma de TMDB (imagen de Internet Archive, más pequeña):', deIa.join(', '));
  if (notMovies.length) console.log('⚠ Ya no son "movies" en archive.org:', notMovies.join(', '));
  if (failed.length) {
    console.log('Reintenta más tarde:', failed.join(', '));
    process.exitCode = 1;
  }
}

main();
