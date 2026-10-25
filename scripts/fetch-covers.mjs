/**
 * Descarga UNA vez las portadas de la hemeroteca desde Internet Archive a
 * public/covers/<id>.webp, de forma secuencial (sin ráfagas que disparen el
 * rate-limit de archive.org). Reejecutable: salta las que ya existen.
 *
 *   node scripts/fetch-covers.mjs          # solo las que falten
 *   node scripts/fetch-covers.mjs --force  # vuelve a descargar todas
 *
 * Las miniaturas son de obras de dominio público; almacenarlas localmente es
 * legalmente limpio y desacopla el sitio de la disponibilidad de archive.org.
 *
 * DE DÓNDE SE BAJAN. `services/img/<id>` es la miniatura del catálogo y mide
 * 180 px de ancho: la web las pinta a 331 (y al doble en pantallas retina), así
 * que salían borrosas. Los números escaneados tienen además la portada derivada
 * a 800 px en `download/<id>/page/cover_w800.jpg`, que es lo que se pide ahora;
 * la miniatura queda como último recurso para los que no la tengan.
 *
 * QUÉ SE GUARDA. Se reescala a 600 px de ancho y se guarda en WebP: cubre el
 * tamaño mayor en retina y pesa la mitad que el JPEG equivalente. Lo hace sharp
 * (viene con Astro, que lo usa para su propio pipeline de imágenes).
 */
import { readFile, writeFile, mkdir, access, unlink } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import sharp from 'sharp';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const outDir = join(root, 'public', 'covers');
const force = process.argv.includes('--force');
const UA = 'CineArchive/1.0 (cover cache; public-domain thumbnails)';

/** Ancho final. El hueco más grande de la web son 331 px; esto cubre el doble. */
const ANCHO = 600;
const CALIDAD = 76;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const exists = (p) => access(p).then(() => true).catch(() => false);

/** Por orden de calidad: portada derivada, primera página, miniatura del catálogo. */
const fuentes = (id) => [
  `https://archive.org/download/${id}/page/cover_w800.jpg`,
  `https://archive.org/download/${id}/page/n0_w800.jpg`,
  `https://archive.org/services/img/${id}`,
];

/** Descarga la primera fuente que responda con una imagen de verdad. */
async function descargar(id) {
  for (const url of fuentes(id)) {
    try {
      const res = await fetch(url, {
        headers: { 'user-agent': UA },
        redirect: 'follow',
        signal: AbortSignal.timeout(30_000),
      });
      if (!res.ok) continue;
      const buf = Buffer.from(await res.arrayBuffer());
      if (buf.byteLength < 2000) continue; // un «no encontrado» disfrazado
      return { buf, url };
    } catch {
      // Se prueba la siguiente fuente; el reintento con espera lo hace main().
    }
  }
  return null;
}

async function main() {
  await mkdir(outDir, { recursive: true });
  const data = JSON.parse(await readFile(join(root, 'src', 'data', 'periodicals.json'), 'utf8'));
  const items = data.items;

  let ok = 0;
  let skipped = 0;
  let bytes = 0;
  const failed = [];

  for (const { id } of items) {
    const dest = join(outDir, `${id}.webp`);
    if (!force && (await exists(dest))) {
      skipped++;
      continue;
    }
    let done = false;
    for (let attempt = 1; attempt <= 3 && !done; attempt++) {
      try {
        const origen = await descargar(id);
        if (!origen) throw new Error('ninguna fuente responde');
        const salida = await sharp(origen.buf)
          .resize({ width: ANCHO, withoutEnlargement: true })
          .webp({ quality: CALIDAD })
          .toBuffer();
        const meta = await sharp(salida).metadata();
        await writeFile(dest, salida);
        // Si venía del formato viejo, se quita para no dejar peso muerto.
        const viejo = join(outDir, `${id}.jpg`);
        if (await exists(viejo)) await unlink(viejo);
        ok++;
        bytes += salida.byteLength;
        done = true;
        console.log(`✓ ${id} ${meta.width}×${meta.height} (${Math.round(salida.byteLength / 1024)} kB)`);
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

  console.log(
    `\nDescargadas: ${ok} (${Math.round(bytes / 1024)} kB) · Ya existían: ${skipped} · Fallidas: ${failed.length}`,
  );
  if (failed.length) {
    console.log('Reintenta más tarde:', failed.join(', '));
    process.exitCode = 1;
  }
}

main();
