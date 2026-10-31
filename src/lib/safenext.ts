/**
 * Destino tras iniciar sesión (`?next=`), validado.
 *
 * El parámetro viaja en la URL, así que cualquiera puede fabricar un enlace
 * /login?next=https://otro-sitio.example: tras meter la contraseña en nuestra
 * página, el usuario acabaría en una web ajena que se hace pasar por la nuestra.
 * Solo se acepta una ruta de este mismo sitio (empieza por «/», pero no por «//»
 * ni «/\», que el navegador lee como otro dominio). Y nunca la propia página de
 * acceso, que dejaría al recién identificado dando vueltas en ella.
 */
export function safeNext(raw: string | null | undefined, fallback: string): string {
  if (!raw || !raw.startsWith('/') || raw.startsWith('//') || raw.startsWith('/\\')) return fallback;
  // Controles y espacios: «/\t/otro.example» también se lee como otro dominio.
  if (/[\u0000-\u001f\s]/.test(raw)) return fallback;
  let path: string;
  try {
    path = new URL(raw, 'https://x.invalid').pathname;
  } catch {
    return fallback;
  }
  if (/^\/(?:[a-z]{2}\/)?(?:login|register)\/?$/.test(path)) return fallback;
  return raw;
}
