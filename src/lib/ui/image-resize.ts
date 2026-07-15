/**
 * Compresión de imagen en el cliente (canvas) — SOLO CLIENTE.
 *
 * Permite elegir fotos grandes (varios MB, típicas de móvil) reduciéndolas antes
 * de enviarlas: Caddy corta cuerpos > 1 MB en el borde y el avatar se guarda en
 * ≤ 512 KB, así que el navegador redimensiona y recomprime primero. Respeta la
 * orientación EXIF (las fotos de móvil no salen giradas) y re-codifica a WebP (o
 * JPEG de respaldo), lo que además elimina metadatos como la ubicación GPS.
 */

export interface ResizeOptions {
  /** Lado mayor máximo en píxeles (por defecto 512; el avatar se muestra pequeño). */
  maxDim?: number;
  /** Tamaño máximo del resultado en bytes (por defecto 512 KB). */
  maxBytes?: number;
}

const DEFAULT_MAX_DIM = 512;
const DEFAULT_MAX_BYTES = 512 * 1024;

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob((b) => resolve(b), type, quality));
}

/**
 * Codifica un canvas a Blob ≤ maxBytes. Prueba WebP (mejor ratio) y, si el
 * navegador no lo soporta, JPEG; baja la calidad hasta caber.
 */
export async function encodeCanvas(canvas: HTMLCanvasElement, maxBytes = DEFAULT_MAX_BYTES): Promise<Blob | null> {
  for (const type of ['image/webp', 'image/jpeg']) {
    for (const q of [0.9, 0.82, 0.74, 0.66, 0.55, 0.45]) {
      const blob = await canvasToBlob(canvas, type, q);
      if (blob && blob.type === type && blob.size <= maxBytes) return blob;
    }
  }
  // Último recurso: JPEG a baja calidad (el llamante valida el tamaño final).
  return canvasToBlob(canvas, 'image/jpeg', 0.4);
}

/**
 * Redimensiona y comprime `file` a un Blob ≤ maxBytes (WebP o JPEG). Devuelve
 * null si el navegador no puede decodificar la imagen (p. ej. HEIC), para que el
 * llamante decida el mensaje.
 */
export async function compressImage(file: File, opts: ResizeOptions = {}): Promise<Blob | null> {
  const maxDim = opts.maxDim ?? DEFAULT_MAX_DIM;
  const maxBytes = opts.maxBytes ?? DEFAULT_MAX_BYTES;

  let bitmap: ImageBitmap;
  try {
    // imageOrientation 'from-image': aplica el EXIF al decodificar.
    bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' } as ImageBitmapOptions);
  } catch {
    return null; // formato no decodificable por el navegador (HEIC, TIFF raro…)
  }

  const scale = Math.min(1, maxDim / Math.max(bitmap.width, bitmap.height));
  const w = Math.max(1, Math.round(bitmap.width * scale));
  const h = Math.max(1, Math.round(bitmap.height * scale));

  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    bitmap.close?.();
    return null;
  }
  ctx.drawImage(bitmap, 0, 0, w, h);
  bitmap.close?.();

  return encodeCanvas(canvas, maxBytes);
}
