/**
 * Compartir un enlace desde un botón — SOLO CLIENTE.
 *
 * Misma lógica que el "Compartir perfil": en móvil abre la hoja nativa de
 * compartir (`navigator.share`); en escritorio copia el enlace al portapapeles y
 * muestra un aviso breve en el propio botón. El botón debe traer:
 *   - `data-url`         el enlace canónico a compartir (obligatorio).
 *   - `data-copied`      texto de confirmación tras copiar (opcional).
 *   - `data-share-title` título para la hoja nativa (opcional; por defecto el de la página).
 */
export function shareLink(btn: HTMLButtonElement): void {
  btn.addEventListener('click', async () => {
    const url = btn.dataset.url || window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({ title: btn.dataset.shareTitle || document.title, url });
      } catch {
        /* cancelado por el usuario: sin acción */
      }
      return;
    }
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      return;
    }
    const original = btn.innerHTML;
    btn.textContent = btn.dataset.copied || 'OK';
    window.setTimeout(() => {
      btn.innerHTML = original;
    }, 1500);
  });
}
