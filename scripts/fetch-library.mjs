/**
 * Verifica los textos de la biblioteca (dominio público) y descarga UNA vez su
 * portada desde Internet Archive a public/library/<id>.webp.
 *
 *   node scripts/fetch-library.mjs          # solo las que falten
 *   node scripts/fetch-library.mjs --force  # vuelve a descargar todas
 *
 * Igual que las portadas de la hemeroteca (scripts/fetch-covers.mjs): antes se
 * bajaba la miniatura del catálogo, de 180 px, y la web la pinta más grande, así
 * que salía borrosa. Ahora se pide la portada escaneada a 800 px y, si un libro
 * no la tiene, la primera página; la miniatura queda como último recurso. Se
 * guarda a 600 px en WebP con sharp (viene con Astro).
 *
 * Con `"cover": "title"` en el libro se usa la portadilla (la página del título)
 * en vez de la tapa: para tapas de tela lisa, encuadernaciones de biblioteca con
 * etiquetas o escaneos de Google, cuya primera página es su aviso legal. Para
 * cambiar uno solo, borra su .webp y vuelve a lanzarlo.
 */
import { readFile, writeFile, mkdir, access, unlink } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import sharp from 'sharp';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const outDir = join(root, 'public', 'library');
const force = process.argv.includes('--force');
const UA = 'CineArchive/1.0 (public-domain book covers)';

const ANCHO = 600;
const CALIDAD = 76;

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

/** Por orden: la página pedida (si la hay), portada derivada, primera página, miniatura del catálogo. */
const fuentes = (id, pagina) => [
  ...(pagina ? [`https://archive.org/download/${id}/page/${pagina}_w800.jpg`] : []),
  `https://archive.org/download/${id}/page/cover_w800.jpg`,
  `https://archive.org/download/${id}/page/n0_w800.jpg`,
  `https://archive.org/services/img/${id}`,
];

async function descargar(id, pagina) {
  for (const url of fuentes(id, pagina)) {
    try {
      const res = await fetch(url, { headers: { 'user-agent': UA }, redirect: 'follow', signal: AbortSignal.timeout(30_000) });
      if (!res.ok) continue;
      const buf = Buffer.from(await res.arrayBuffer());
      if (buf.byteLength < 2000) continue; // un «no encontrado» disfrazado
      return { buf, url };
    } catch {
      // Se prueba la siguiente; el reintento con espera lo hace main().
    }
  }
  return null;
}

async function main() {
  await mkdir(outDir, { recursive: true });
  const data = JSON.parse(await readFile(join(root, 'src', 'data', 'library.json'), 'utf8'));
  const items = data.items;

  let ok = 0;
  let skipped = 0;
  const failed = [];
  const notTexts = [];

  for (const { id, cover } of items) {
    if (!(await verify(id))) notTexts.push(id);

    const dest = join(outDir, `${id}.webp`);
    if (!force && (await exists(dest))) {
      skipped++;
      continue;
    }
    let done = false;
    for (let attempt = 1; attempt <= 3 && !done; attempt++) {
      try {
        const origen = await descargar(id, cover);
        if (!origen) throw new Error('ninguna fuente responde');
        const salida = await sharp(origen.buf).resize({ width: ANCHO, withoutEnlargement: true }).webp({ quality: CALIDAD }).toBuffer();
        const meta = await sharp(salida).metadata();
        await writeFile(dest, salida);
        // Si venía del formato viejo, se quita para no dejar peso muerto.
        const viejo = join(outDir, `${id}.jpg`);
        if (await exists(viejo)) await unlink(viejo);
        ok++;
        done = true;
        console.log(`✓ ${id} ${meta.width}×${meta.height} (${Math.round(salida.byteLength / 1024)} kB, ${origen.url.split('/').pop()})`);
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
