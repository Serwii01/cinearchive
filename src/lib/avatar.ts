/**
 * Validación de imágenes de avatar. El tipo se determina por los magic bytes del
 * propio fichero (no por la cabecera Content-Type, que el cliente puede falsear),
 * y se limita el tamaño. Así solo se guardan imágenes reales y pequeñas.
 */

/** Tope de tamaño del avatar (Caddy además corta cuerpos > 1MB en el borde). */
export const MAX_AVATAR_BYTES = 512 * 1024; // 512 KB

export type AvatarType = 'image/jpeg' | 'image/png' | 'image/webp';

/** Devuelve el tipo real de la imagen a partir de sus bytes, o null si no es válida. */
export function sniffImageType(buf: Buffer): AvatarType | null {
  if (buf.length < 12) return null;
  // JPEG: FF D8 FF
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'image/jpeg';
  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47 &&
    buf[4] === 0x0d && buf[5] === 0x0a && buf[6] === 0x1a && buf[7] === 0x0a
  ) {
    return 'image/png';
  }
  // WebP: "RIFF" .... "WEBP"
  if (
    buf[0] === 0x52 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x46 &&
    buf[8] === 0x57 && buf[9] === 0x45 && buf[10] === 0x42 && buf[11] === 0x50
  ) {
    return 'image/webp';
  }
  return null;
}
