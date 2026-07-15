/**
 * Recortador de avatar (modal) — SOLO CLIENTE.
 *
 * Muestra la foto en un visor cuadrado; el usuario la arrastra y hace zoom para
 * elegir qué parte se usa como foto de perfil. Al confirmar, exporta un cuadrado
 * de `size`px comprimido a WebP/JPEG ≤ maxBytes. Resuelve con el Blob, o null si
 * se cancela. Lanza si la imagen no se puede decodificar (p. ej. HEIC).
 *
 * Mismo lenguaje visual que los modales de `./modals` (mismas clases Tailwind, que
 * el escáner de `.ts` genera). CSP: los estilos inline (transform/tamaños) están
 * permitidos por `style-src 'unsafe-inline'`.
 */
import { encodeCanvas } from './image-resize';

export interface CropOptions {
  /** Lado del cuadrado de salida en píxeles (por defecto 512). */
  size?: number;
  /** Tamaño máximo del Blob resultante (por defecto 512 KB). */
  maxBytes?: number;
  title: string;
  zoomLabel: string;
  cancelLabel: string;
  confirmLabel: string;
}

let openCount = 0;
function lockScroll() {
  if (openCount++ === 0) document.documentElement.style.overflow = 'hidden';
}
function unlockScroll() {
  if (--openCount <= 0) {
    openCount = 0;
    document.documentElement.style.overflow = '';
  }
}

function mkButton(label: string, kind: 'cancel' | 'confirm'): HTMLButtonElement {
  const b = document.createElement('button');
  b.type = 'button';
  b.textContent = label;
  b.className =
    kind === 'cancel'
      ? 'label border border-ink px-3 py-2 transition-colors hover:bg-ink hover:text-white'
      : 'label border border-ink bg-ink px-3 py-2 text-white transition-colors hover:bg-ochre hover:text-on-accent';
  return b;
}

const V = 300; // lado del visor en px

export async function cropAvatar(file: File, opts: CropOptions): Promise<Blob | null> {
  const outSize = opts.size ?? 512;
  const maxBytes = opts.maxBytes ?? 512 * 1024;

  // Decodifica respetando la orientación EXIF; si falla, propaga (HEIC u otro).
  const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' } as ImageBitmapOptions);

  return new Promise<Blob | null>((resolve) => {
    const prevFocus = document.activeElement as HTMLElement | null;
    let done = false;

    // Estado de la vista: escala mínima = "cover" (la imagen siempre llena el visor).
    const minScale = Math.max(V / bitmap.width, V / bitmap.height);
    let zoom = 1;
    let scale = minScale;
    let tx = (V - bitmap.width * scale) / 2;
    let ty = (V - bitmap.height * scale) / 2;

    // --- DOM ---
    const overlay = document.createElement('div');
    overlay.className = 'fixed inset-0 z-[60] flex items-center justify-center bg-ink/60 p-4';
    const dialog = document.createElement('div');
    dialog.className = 'w-full max-w-[340px] border-2 border-ink bg-surface';
    dialog.setAttribute('role', 'dialog');
    dialog.setAttribute('aria-modal', 'true');

    const head = document.createElement('div');
    head.className = 'border-b-2 border-ink px-4 py-3';
    const h = document.createElement('h2');
    h.className = 'font-display text-headline-md text-ink';
    h.textContent = opts.title;
    head.appendChild(h);

    const body = document.createElement('div');
    body.className = 'p-4';

    const viewport = document.createElement('div');
    viewport.className = 'mx-auto touch-none overflow-hidden border border-ink bg-charcoal';
    viewport.style.width = `${V}px`;
    viewport.style.height = `${V}px`;
    viewport.style.cursor = 'grab';

    const canvas = document.createElement('canvas');
    canvas.width = V;
    canvas.height = V;
    canvas.style.width = `${V}px`;
    canvas.style.height = `${V}px`;
    canvas.style.display = 'block';
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      bitmap.close?.();
      resolve(null);
      return;
    }
    viewport.appendChild(canvas);

    const zoomRow = document.createElement('label');
    zoomRow.className = 'mt-4 flex items-center gap-3';
    const zlab = document.createElement('span');
    zlab.className = 'label shrink-0';
    zlab.textContent = opts.zoomLabel;
    const range = document.createElement('input');
    range.type = 'range';
    range.min = '1';
    range.max = '4';
    range.step = '0.01';
    range.value = '1';
    range.className = 'w-full accent-ochre';
    zoomRow.append(zlab, range);

    const actions = document.createElement('div');
    actions.className = 'mt-4 flex justify-end gap-2';
    const cancelBtn = mkButton(opts.cancelLabel, 'cancel');
    const okBtn = mkButton(opts.confirmLabel, 'confirm');
    actions.append(cancelBtn, okBtn);

    body.append(viewport, zoomRow, actions);
    dialog.append(head, body);
    overlay.appendChild(dialog);

    // --- lógica de vista ---
    const clamp = () => {
      const iw = bitmap.width * scale;
      const ih = bitmap.height * scale;
      tx = iw <= V ? (V - iw) / 2 : Math.min(0, Math.max(V - iw, tx));
      ty = ih <= V ? (V - ih) / 2 : Math.min(0, Math.max(V - ih, ty));
    };
    const draw = () => {
      ctx.clearRect(0, 0, V, V);
      ctx.drawImage(bitmap, tx, ty, bitmap.width * scale, bitmap.height * scale);
    };
    const setZoom = (z: number) => {
      const nz = Math.min(4, Math.max(1, z));
      const newScale = minScale * nz;
      const cx = V / 2;
      const cy = V / 2;
      // Zoom respecto al centro del visor.
      tx = cx - ((cx - tx) * newScale) / scale;
      ty = cy - ((cy - ty) * newScale) / scale;
      scale = newScale;
      zoom = nz;
      clamp();
      draw();
    };

    clamp();
    draw();

    // Arrastre (mouse + táctil vía Pointer Events).
    let dragging = false;
    let lastX = 0;
    let lastY = 0;
    viewport.addEventListener('pointerdown', (e) => {
      dragging = true;
      lastX = e.clientX;
      lastY = e.clientY;
      viewport.setPointerCapture(e.pointerId);
      viewport.style.cursor = 'grabbing';
    });
    viewport.addEventListener('pointermove', (e) => {
      if (!dragging) return;
      tx += e.clientX - lastX;
      ty += e.clientY - lastY;
      lastX = e.clientX;
      lastY = e.clientY;
      clamp();
      draw();
    });
    const endDrag = (e: PointerEvent) => {
      dragging = false;
      viewport.style.cursor = 'grab';
      try {
        viewport.releasePointerCapture(e.pointerId);
      } catch {
        /* el puntero ya se soltó */
      }
    };
    viewport.addEventListener('pointerup', endDrag);
    viewport.addEventListener('pointercancel', endDrag);
    viewport.addEventListener(
      'wheel',
      (e) => {
        e.preventDefault();
        const nz = zoom + (e.deltaY < 0 ? 0.2 : -0.2);
        range.value = String(Math.min(4, Math.max(1, nz)));
        setZoom(parseFloat(range.value));
      },
      { passive: false },
    );
    range.addEventListener('input', () => setZoom(parseFloat(range.value)));

    // --- cierre ---
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') finish(null);
    };
    const finish = (val: Blob | null) => {
      if (done) return;
      done = true;
      document.removeEventListener('keydown', onKey);
      overlay.remove();
      unlockScroll();
      bitmap.close?.();
      prevFocus?.focus?.();
      resolve(val);
    };
    overlay.addEventListener('mousedown', (e) => {
      if (e.target === overlay) finish(null);
    });
    document.addEventListener('keydown', onKey);
    cancelBtn.addEventListener('click', () => finish(null));
    okBtn.addEventListener('click', async () => {
      // Exporta exactamente lo que se ve en el visor, escalado a outSize.
      const out = document.createElement('canvas');
      out.width = outSize;
      out.height = outSize;
      const octx = out.getContext('2d');
      if (!octx) return finish(null);
      const k = outSize / V;
      octx.drawImage(bitmap, tx * k, ty * k, bitmap.width * scale * k, bitmap.height * scale * k);
      const blob = await encodeCanvas(out, maxBytes);
      finish(blob);
    });

    lockScroll();
    document.body.appendChild(overlay);
    okBtn.focus();
  });
}
