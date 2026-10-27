/**
 * Lector de ZIP mínimo para el navegador: lee el directorio central y
 * descomprime con DecompressionStream('deflate-raw'), que ya traen todos los
 * navegadores actuales. Basta para el export de Letterboxd y evita meter una
 * dependencia de 30 KB para leer seis CSV.
 *
 * Solo entiende lo que hace falta: entradas guardadas (método 0) o con deflate
 * (método 8), sin cifrado ni ZIP64.
 */

export interface ZipEntry {
  name: string;
  read: () => Promise<Uint8Array>;
}

const EOCD_SIG = 0x06054b50;
const CEN_SIG = 0x02014b50;
const LOC_SIG = 0x04034b50;

async function inflateRaw(data: Uint8Array): Promise<Uint8Array> {
  const stream = new Blob([data as BlobPart]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

export function listZip(buf: ArrayBuffer): ZipEntry[] {
  const v = new DataView(buf);
  const bytes = new Uint8Array(buf);
  // El final del directorio está en los últimos 22 bytes más un comentario
  // opcional de hasta 64 KB: se busca hacia atrás.
  let eocd = -1;
  for (let i = buf.byteLength - 22; i >= Math.max(0, buf.byteLength - 22 - 0xffff); i--) {
    if (v.getUint32(i, true) === EOCD_SIG) { eocd = i; break; }
  }
  if (eocd < 0) throw new Error('not_zip');

  const count = v.getUint16(eocd + 10, true);
  let p = v.getUint32(eocd + 16, true);
  const dec = new TextDecoder();
  const out: ZipEntry[] = [];
  for (let n = 0; n < count; n++) {
    if (v.getUint32(p, true) !== CEN_SIG) throw new Error('bad_zip');
    const method = v.getUint16(p + 10, true);
    const csize = v.getUint32(p + 20, true);
    const nameLen = v.getUint16(p + 28, true);
    const extraLen = v.getUint16(p + 30, true);
    const commentLen = v.getUint16(p + 32, true);
    const local = v.getUint32(p + 42, true);
    const name = dec.decode(bytes.subarray(p + 46, p + 46 + nameLen));
    p += 46 + nameLen + extraLen + commentLen;
    if (name.endsWith('/')) continue; // carpeta

    out.push({
      name,
      read: async () => {
        if (v.getUint32(local, true) !== LOC_SIG) throw new Error('bad_zip');
        // La cabecera local tiene sus propias longitudes de nombre y extra.
        const start = local + 30 + v.getUint16(local + 26, true) + v.getUint16(local + 28, true);
        const raw = bytes.subarray(start, start + csize);
        if (method === 0) return raw;
        if (method === 8) return inflateRaw(raw);
        throw new Error('unsupported_zip');
      },
    });
  }
  return out;
}
