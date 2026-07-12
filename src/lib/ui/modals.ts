/**
 * Modales propios de la app (confirmar / renombrar) — SOLO CLIENTE.
 *
 * Sustituyen a `confirm()` y `prompt()` del navegador, que además de romper la
 * estética son poco fiables (si el usuario marca "no permitir más diálogos",
 * `confirm()` devuelve siempre false y la acción no se dispara). Se construyen en
 * JS con las clases de la app (mismo lenguaje visual que el resto de modales) y
 * devuelven una promesa. Tailwind escanea también los `.ts`, así que las clases
 * usadas aquí se generan en el CSS.
 */

// Bloquea/restaura el scroll del fondo mientras el modal está abierto (recuento
// por si se abriera más de uno encadenado).
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

interface Shell {
  overlay: HTMLDivElement;
  body: HTMLDivElement;
  actions: HTMLDivElement;
  close: (then?: () => void) => void;
}

/** Estructura común: fondo oscuro + tarjeta con cabecera, cuerpo y acciones. */
function buildShell(title: string, onCancel: () => void): Shell {
  const prevFocus = document.activeElement as HTMLElement | null;

  const overlay = document.createElement('div');
  overlay.className = 'fixed inset-0 z-[60] flex items-center justify-center bg-ink/60 p-4';

  const dialog = document.createElement('div');
  dialog.className = 'w-full max-w-sm border-2 border-ink bg-surface';
  dialog.setAttribute('role', 'dialog');
  dialog.setAttribute('aria-modal', 'true');

  const head = document.createElement('div');
  head.className = 'border-b-2 border-ink px-4 py-3';
  const h = document.createElement('h2');
  h.className = 'font-display text-headline-md text-ink';
  h.textContent = title;
  const titleId = 'modal-title-' + Math.random().toString(36).slice(2, 8);
  h.id = titleId;
  dialog.setAttribute('aria-labelledby', titleId);
  head.appendChild(h);

  const body = document.createElement('div');
  body.className = 'p-4';

  const actions = document.createElement('div');
  actions.className = 'mt-4 flex justify-end gap-2';
  body.appendChild(actions);

  dialog.append(head, body);
  overlay.appendChild(dialog);

  const onKey = (e: KeyboardEvent) => {
    if (e.key === 'Escape') onCancel();
  };
  // Clic en el fondo (fuera de la tarjeta) = cancelar.
  overlay.addEventListener('mousedown', (e) => {
    if (e.target === overlay) onCancel();
  });
  document.addEventListener('keydown', onKey);

  const close = (then?: () => void) => {
    document.removeEventListener('keydown', onKey);
    overlay.remove();
    unlockScroll();
    prevFocus?.focus?.();
    then?.();
  };

  lockScroll();
  document.body.appendChild(overlay);
  return { overlay, body, actions, close };
}

function button(label: string, kind: 'cancel' | 'confirm' | 'danger'): HTMLButtonElement {
  const b = document.createElement('button');
  b.type = 'button';
  b.textContent = label;
  b.className =
    kind === 'cancel'
      ? 'label border border-ink px-3 py-2 transition-colors hover:bg-ink hover:text-white'
      : kind === 'danger'
        ? 'label border border-error bg-error px-3 py-2 text-white transition-colors hover:bg-ink'
        : 'label border border-ink bg-ink px-3 py-2 text-white transition-colors hover:bg-ochre hover:text-on-accent';
  return b;
}

export interface ConfirmOpts {
  title: string;
  message?: string;
  confirmLabel: string;
  cancelLabel: string;
  /** Estilo de peligro (rojo) para acciones destructivas como borrar. */
  danger?: boolean;
}

/** Modal de confirmación. Resuelve `true` si se confirma, `false` si se cancela. */
export function confirmModal(opts: ConfirmOpts): Promise<boolean> {
  return new Promise((resolve) => {
    let done = false;
    const finish = (val: boolean) => {
      if (done) return;
      done = true;
      shell.close(() => resolve(val));
    };
    const shell = buildShell(opts.title, () => finish(false));

    if (opts.message) {
      const p = document.createElement('p');
      p.className = 'text-body-md text-charcoal';
      p.textContent = opts.message;
      shell.body.insertBefore(p, shell.actions);
    }

    const cancel = button(opts.cancelLabel, 'cancel');
    const ok = button(opts.confirmLabel, opts.danger ? 'danger' : 'confirm');
    cancel.addEventListener('click', () => finish(false));
    ok.addEventListener('click', () => finish(true));
    shell.actions.append(cancel, ok);
    ok.focus();
  });
}

export interface AlertOpts {
  title: string;
  message: string;
  confirmLabel: string;
}

/** Aviso simple (sustituye a `alert()`). Resuelve al cerrarse. */
export function alertModal(opts: AlertOpts): Promise<void> {
  return new Promise((resolve) => {
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      shell.close(() => resolve());
    };
    const shell = buildShell(opts.title, finish);
    const p = document.createElement('p');
    p.className = 'text-body-md text-charcoal';
    p.textContent = opts.message;
    shell.body.insertBefore(p, shell.actions);
    const ok = button(opts.confirmLabel, 'confirm');
    ok.addEventListener('click', finish);
    shell.actions.appendChild(ok);
    ok.focus();
  });
}

export interface PromptOpts {
  title: string;
  label?: string;
  value?: string;
  placeholder?: string;
  confirmLabel: string;
  cancelLabel: string;
  maxLength?: number;
}

/**
 * Modal con un campo de texto (renombrar). Resuelve con el texto recortado, o
 * `null` si se cancela o queda vacío.
 */
export function promptModal(opts: PromptOpts): Promise<string | null> {
  return new Promise((resolve) => {
    let done = false;
    const finish = (val: string | null) => {
      if (done) return;
      done = true;
      shell.close(() => resolve(val));
    };
    const shell = buildShell(opts.title, () => finish(null));

    if (opts.label) {
      const lab = document.createElement('label');
      lab.className = 'label mb-1 block';
      lab.textContent = opts.label;
      lab.htmlFor = 'modal-input';
      shell.body.insertBefore(lab, shell.actions);
    }

    const input = document.createElement('input');
    input.id = 'modal-input';
    input.type = 'text';
    input.autocomplete = 'off';
    if (opts.placeholder) input.placeholder = opts.placeholder;
    if (opts.maxLength) input.maxLength = opts.maxLength;
    input.value = opts.value ?? '';
    input.className =
      'w-full border border-ink bg-white px-3 py-2 font-body text-body-md text-ink placeholder:text-muted focus:bg-film-white focus:outline-none';
    shell.body.insertBefore(input, shell.actions);

    const submit = () => finish(input.value.trim() || null);
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        submit();
      }
    });

    const cancel = button(opts.cancelLabel, 'cancel');
    const ok = button(opts.confirmLabel, 'confirm');
    cancel.addEventListener('click', () => finish(null));
    ok.addEventListener('click', submit);
    shell.actions.append(cancel, ok);

    input.focus();
    input.select();
  });
}
