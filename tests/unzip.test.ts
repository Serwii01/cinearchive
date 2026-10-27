import { describe, it, expect } from 'vitest';
import { deflateRawSync } from 'node:zlib';
import { listZip } from '../src/lib/unzip';

/** Un ZIP mínimo hecho a mano: una entrada guardada y otra con deflate. */
function makeZip(files: { name: string; data: string; deflate: boolean }[]): ArrayBuffer {
  const locals: Buffer[] = [];
  const centrals: Buffer[] = [];
  let offset = 0;
  for (const f of files) {
    const name = Buffer.from(f.name);
    const raw = Buffer.from(f.data);
    const body = f.deflate ? deflateRawSync(raw) : raw;
    const loc = Buffer.alloc(30);
    loc.writeUInt32LE(0x04034b50, 0);
    loc.writeUInt16LE(f.deflate ? 8 : 0, 8);
    loc.writeUInt32LE(body.length, 18);
    loc.writeUInt32LE(raw.length, 22);
    loc.writeUInt16LE(name.length, 26);
    locals.push(loc, name, body);
    const cen = Buffer.alloc(46);
    cen.writeUInt32LE(0x02014b50, 0);
    cen.writeUInt16LE(f.deflate ? 8 : 0, 10);
    cen.writeUInt32LE(body.length, 20);
    cen.writeUInt32LE(raw.length, 24);
    cen.writeUInt16LE(name.length, 28);
    cen.writeUInt32LE(offset, 42);
    centrals.push(cen, name);
    offset += 30 + name.length + body.length;
  }
  const cdir = Buffer.concat(centrals);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(files.length, 8);
  end.writeUInt16LE(files.length, 10);
  end.writeUInt32LE(cdir.length, 12);
  end.writeUInt32LE(offset, 16);
  const all = Buffer.concat([...locals, cdir, end]);
  return all.buffer.slice(all.byteOffset, all.byteOffset + all.length);
}

describe('listZip', () => {
  it('lee entradas guardadas y con deflate', async () => {
    const zip = makeZip([
      { name: 'export/watched.csv', data: 'Name,Year\nHeat,1995\n', deflate: false },
      { name: 'export/diary.csv', data: 'Name,Year\n'.repeat(50), deflate: true },
    ]);
    const entries = listZip(zip);
    expect(entries.map((e) => e.name)).toEqual(['export/watched.csv', 'export/diary.csv']);
    const dec = new TextDecoder();
    expect(dec.decode(await entries[0].read())).toBe('Name,Year\nHeat,1995\n');
    expect(dec.decode(await entries[1].read())).toBe('Name,Year\n'.repeat(50));
  });
  it('rechaza lo que no es un ZIP', () => {
    expect(() => listZip(new TextEncoder().encode('hola, no soy un zip, de verdad que no').buffer)).toThrow('not_zip');
  });
});
