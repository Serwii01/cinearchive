/**
 * El vídeo de una película de Internet Archive como archivo (MP4) — SOLO SERVIDOR.
 *
 * Cine abierto incrusta el reproductor de archive.org, que no se puede manejar
 * desde fuera. El cineclub necesita llevar a todo el mundo al mismo segundo, y
 * para eso hace falta un <video> propio: aquí se busca en los metadatos del
 * ítem el MP4 que sirve y su duración real (la del catálogo es aproximada:
 * «20.000 leguas» dice 85 minutos y dura 98).
 */
import { createMemo } from './memo';
import { registerCache } from './cache-registry';

export interface IaVideo {
  url: string;
  /** Segundos. */
  length: number | null;
}

interface IaFile {
  name: string;
  format?: string;
  length?: string;
  size?: string;
}

/** Preferencia de formato: el de más calidad que el navegador reproduce sin más. */
const ORDEN = ['h.264', 'h.264 ia', 'mpeg4', '512kb mpeg4'];

/** El mejor MP4 de la lista de archivos de un ítem, o null. Pura. */
export function pickVideo(id: string, files: IaFile[]): IaVideo | null {
  const mp4 = files.filter((f) => f.name.toLowerCase().endsWith('.mp4'));
  if (!mp4.length) return null;
  const rango = (f: IaFile) => {
    const i = ORDEN.indexOf((f.format ?? '').toLowerCase());
    return i < 0 ? ORDEN.length : i;
  };
  const f = [...mp4].sort((a, b) => rango(a) - rango(b))[0];
  const length = Number(f.length);
  return {
    url: `https://archive.org/download/${encodeURIComponent(id)}/${f.name.split('/').map(encodeURIComponent).join('/')}`,
    length: Number.isFinite(length) && length > 0 ? Math.round(length) : null,
  };
}

const TTL = 30 * 24 * 60 * 60 * 1000;
const memo = createMemo<IaVideo | null>(TTL, 200);
registerCache({ id: 'ia-video', label: 'Vídeos de Internet Archive (cineclub)', ttlMs: TTL, maxKeys: 200, size: () => memo.size, clear: () => memo.clear() });

/**
 * Si archive.org falla, la promesa falla y el memo no lo guarda (se reintenta
 * en la siguiente visita); lo que sí se guarda es «este ítem no tiene MP4».
 * Para quien llama, null en los dos casos: la sala cae al reproductor incrustado.
 */
export function getIaVideo(id: string): Promise<IaVideo | null> {
  return memo
    .get(id, async () => {
      const r = await fetch(`https://archive.org/metadata/${encodeURIComponent(id)}`, { signal: AbortSignal.timeout(8000) });
      if (!r.ok) throw new Error(`archive.org ${r.status}`);
      const m = (await r.json()) as { files?: IaFile[] };
      return pickVideo(id, m.files ?? []);
    })
    .catch(() => null);
}
