/**
 * Descarga UNA vez las portadas de la hemeroteca desde Internet Archive a
 * public/covers/<id>.jpg, de forma secuencial (sin ráfagas que disparen el
 * rate-limit de archive.org). Reejecutable: salta las que ya existen.
 *
 *   node scripts/fetch-covers.mjs          # solo las que falten
 *   node scripts/fetch-covers.mjs --force  # vuelve a descargar todas
 *
 * Las miniaturas son de obras de dominio público; almacenarlas localmente es
 * legalmente limpio y desacopla el sitio de la disponibilidad de archive.org.
 */
import { readFile, writeFile, mkdir, access } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const outDir = join(root, 'public', 'covers');
const force = process.argv.includes('--force');
const UA = 'CineArchive/1.0 (cover cache; public-domain thumbnails)';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const exists = (p) => access(p).then(() => true).catch(() => false);

async function main() {
  await mkdir(outDir, { recursive: true });
  const data = JSON.parse(await readFile(join(root, 'src', 'data', 'periodicals.json'), 'utf8'));
  const items = data.items;

  let ok = 0;
  let skipped = 0;
  let failed = [];

  for (const { id } of items) {
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
          await sleep(2000 * attempt); // backoff si archive.org limita
        }
      }
    }
    await sleep(350); // respetuoso con archive.org entre descargas
  }

  console.log(`\nDescargadas: ${ok} · Ya existían: ${skipped} · Fallidas: ${failed.length}`);
  if (failed.length) {
    console.log('Reintenta más tarde:', failed.join(', '));
    process.exitCode = 1;
  }
}

main();
