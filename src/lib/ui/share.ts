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

/**
 * Compartir el perfil como IMAGEN de historia (Instagram) — SOLO CLIENTE.
 *
 * Descarga el PNG generado por el servidor y lo comparte como archivo con la Web
 * Share API (`navigator.share({ files })`): en móvil el usuario elige Instagram →
 * Historias y la imagen entra directa. En escritorio (sin compartir archivos) el
 * respaldo abre el PNG en una pestaña (para guardarlo) y copia el enlace. El botón
 * debe traer:
 *   - `data-img`         URL del PNG de la historia (obligatorio).
 *   - `data-url`         enlace canónico del perfil (para compartir/copiar).
 *   - `data-share-title` título para la hoja nativa (opcional).
 *   - `data-error`       texto de error si falla la generación (opcional).
 */
export function shareStoryImage(btn: HTMLButtonElement): void {
  btn.addEventListener('click', async () => {
    const imgUrl = btn.dataset.img;
    const url = btn.dataset.url || window.location.href;
    if (!imgUrl || btn.dataset.busy) return;

    const original = btn.innerHTML;
    btn.dataset.busy = '1';
    btn.setAttribute('aria-busy', 'true');
    btn.textContent = '…';
    try {
      const res = await fetch(imgUrl);
      if (!res.ok) throw new Error(`status ${res.status}`);
      const blob = await res.blob();
      const file = new File([blob], 'cinearchive.png', { type: 'image/png' });

      if (navigator.canShare?.({ files: [file] })) {
        try {
          await navigator.share({ files: [file], url, title: btn.dataset.shareTitle || document.title });
        } catch {
          /* cancelado por el usuario: sin acción */
        }
      } else {
        // Escritorio / sin soporte de archivos: abrir la imagen y copiar el enlace.
        window.open(URL.createObjectURL(blob), '_blank', 'noopener');
        try {
          await navigator.clipboard.writeText(url);
        } catch {
          /* portapapeles no disponible: la imagen ya se abrió */
        }
      }
    } catch {
      btn.textContent = btn.dataset.error || 'Error';
      window.setTimeout(() => {
        btn.innerHTML = original;
      }, 1800);
      return;
    } finally {
      btn.removeAttribute('aria-busy');
      delete btn.dataset.busy;
    }
    btn.innerHTML = original;
  });
}
