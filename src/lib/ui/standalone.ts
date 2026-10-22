/**
 * Utilidades para la web instalada como aplicación (PWA).
 */

/** Si la web se está usando instalada, sin la barra del navegador. */
export function isStandalone(): boolean {
  return (
    matchMedia('(display-mode: standalone)').matches ||
    // Safari en iOS no soporta display-mode: standalone en versiones viejas.
    (navigator as unknown as { standalone?: boolean }).standalone === true
  );
}

/**
 * Si hay una página anterior de este sitio a la que volver. Sin esto, el
 * botón de volver aparecería en la primera pantalla al abrir la app, donde
 * history.back() no hace nada.
 */
export function canGoBack(): boolean {
  // Navigation API (Chrome, Edge y Safari recientes): la respuesta exacta.
  const nav = (window as unknown as { navigation?: { canGoBack?: boolean } }).navigation;
  if (typeof nav?.canGoBack === 'boolean') return nav.canGoBack;
  // Sin ella, lo más parecido: venimos de una página de este mismo sitio.
  return history.length > 1 && isSameOrigin(document.referrer, location.origin);
}

export function isSameOrigin(referrer: string, origin: string): boolean {
  try {
    return referrer !== '' && new URL(referrer).origin === origin;
  } catch {
    return false;
  }
}
