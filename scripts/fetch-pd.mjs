/**
 * Verifica los identificadores de cine de dominio público y descarga UNA vez su
 * miniatura desde Internet Archive a public/cinema/<id>.jpg (igual que las
 * portadas de la hemeroteca: sin ráfagas, reejecutable, salta las existentes).
 *
 *   node scripts/fetch-pd.mjs          # solo las que falten
 *   node scripts/fetch-pd.mjs --force  # vuelve a descargar todas
 *
 * Además comprueba que cada ítem sigue siendo un "movies" en archive.org y avisa
 * de los que ya no resuelven (para regenerar la lista si alguno cae), y apunta
 * en pdfilms.json la fecha en que se publicó allí (`published`), si falta: los
 * datos de vídeo que lee Google (VideoObject) la piden como uploadDate.
 */
import { readFile, writeFile, mkdir, access } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const outDir = join(root, 'public', 'cinema');
const force = process.argv.includes('--force');
const UA = 'CineArchive/1.0 (public-domain film thumbnails)';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const exists = (p) => access(p).then(() => true).catch(() => false);

/** null si el ítem ya no es una película; si lo es, su fecha de publicación (AAAA-MM-DD) o ''. */
async function verify(id) {
  try {
    const res = await fetch(`https://archive.org/metadata/${id}`, {
      headers: { 'user-agent': UA },
      signal: AbortSignal.timeout(20_000),
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (data?.metadata?.mediatype !== 'movies') return null;
    return String(data.metadata.publicdate ?? '').slice(0, 10);
  } catch {
    return null;
  }
}

async function main() {
  await mkdir(outDir, { recursive: true });
  const file = join(root, 'src', 'data', 'pdfilms.json');
  const raw = await readFile(file, 'utf8');
  const data = JSON.parse(raw);
  const items = data.items;

  let ok = 0;
  let skipped = 0;
  let fechas = 0;
  const failed = [];
  const notMovies = [];

  for (const item of items) {
    const { id } = item;
    const publicado = await verify(id);
    if (publicado === null) notMovies.push(id);
    else if (!item.published && /^\d{4}-\d{2}-\d{2}$/.test(publicado)) {
      item.published = publicado;
      fechas++;
    }

    const dest = join(outDir, `${id}.jpg`);
    if (!force && (await exists(dest))) {
      skipped++;
      continue;
    }
    let done = false;
    for (let attempt = 1; attempt <= 3 && !done; attempt++) {
      try {
        const res = await fetch(`https://archive.org/services/img/${id}`, {
          headers: { 'user-agent': UA },
          redirect: 'follow',
          signal: AbortSignal.timeout(20_000),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const buf = Buffer.from(await res.arrayBuffer());
        if (buf.byteLength < 200) throw new Error('respuesta vacía');
        await writeFile(dest, buf);
        ok++;
        done = true;
        console.log(`✓ ${id} (${buf.byteLength} bytes)`);
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

  console.log(`\nDescargadas: ${ok} · Ya existían: ${skipped} · Fallidas: ${failed.length} · Fechas añadidas: ${fechas}`);
  if (notMovies.length) console.log('⚠ Ya no son "movies" en archive.org:', notMovies.join(', '));
  if (failed.length) {
    console.log('Reintenta más tarde:', failed.join(', '));
    process.exitCode = 1;
  }
}

main();
