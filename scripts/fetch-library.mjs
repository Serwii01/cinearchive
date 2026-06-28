/**
 * Verifica los textos de la biblioteca (dominio público) y descarga UNA vez su
 * miniatura desde Internet Archive a public/library/<id>.jpg.
 *
 *   node scripts/fetch-library.mjs          # solo las que falten
 *   node scripts/fetch-library.mjs --force  # vuelve a descargar todas
 */
import { readFile, writeFile, mkdir, access } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const outDir = join(root, 'public', 'library');
const force = process.argv.includes('--force');
const UA = 'CineArchive/1.0 (public-domain book thumbnails)';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const exists = (p) => access(p).then(() => true).catch(() => false);

async function verify(id) {
  try {
    const res = await fetch(`https://archive.org/metadata/${id}`, {
      headers: { 'user-agent': UA },
      signal: AbortSignal.timeout(20_000),
    });
    if (!res.ok) return false;
    const data = await res.json();
    return data?.metadata?.mediatype === 'texts';
  } catch {
    return false;
  }
}

async function main() {
  await mkdir(outDir, { recursive: true });
  const data = JSON.parse(await readFile(join(root, 'src', 'data', 'library.json'), 'utf8'));
  const items = data.items;

  let ok = 0;
  let skipped = 0;
  const failed = [];
  const notTexts = [];

  for (const { id } of items) {
    if (!(await verify(id))) notTexts.push(id);

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

  console.log(`\nDescargadas: ${ok} · Ya existían: ${skipped} · Fallidas: ${failed.length}`);
  if (notTexts.length) console.log('⚠ Ya no son "texts" en archive.org:', notTexts.join(', '));
  if (failed.length) {
    console.log('Reintenta más tarde:', failed.join(', '));
    process.exitCode = 1;
  }
}

main();
