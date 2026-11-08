/**
 * Iconos pequeños en SVG, con el mismo trazo que la lupa y la campana de la
 * cabecera. Para los sitios donde antes había un emoji (🔒): Sergio no quiere
 * emojis en la web, y además cada móvil los pinta a su manera.
 * Vale en el servidor (set:html) y en los scripts del cliente.
 */
export const LOCK_SVG =
  '<svg aria-hidden="true" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="square" style="display:inline-block;vertical-align:-1px"><rect x="4" y="11" width="16" height="10"></rect><path d="M8 11V7a4 4 0 0 1 8 0v4"></path></svg>';

/** Corazón de «me gusta»: relleno cuando ya te gusta. */
export const heartSvg = (lleno: boolean) =>
  `<svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="${lleno ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M12 21s-7.5-4.6-9.5-9.3C1.2 8.6 3.2 5 6.6 5c2.1 0 3.6 1.2 5.4 3.2C13.8 6.2 15.3 5 17.4 5c3.4 0 5.4 3.6 4.1 6.7C19.5 16.4 12 21 12 21z"></path></svg>`;
