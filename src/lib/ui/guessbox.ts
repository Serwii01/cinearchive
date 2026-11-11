/**
 * El buscador de títulos de los juegos de adivinar (Fotograma y Reparto): un
 * combobox accesible que sugiere entre las películas del juego sin preguntar
 * a TMDB en cada letra (los títulos llegan una vez de /api/games/titles).
 *
 * Solo navegador. Era parte de Fotograma; con un segundo juego que adivina
 * películas se saca aquí para que los dos se comporten igual con teclado,
 * ratón y dedo.
 */
import { matchTitles, type TitleEntry } from '../games';

export interface GuessBoxOptions {
  form: HTMLFormElement;
  q: HTMLInputElement;
  list: HTMLUListElement;
  msg: HTMLElement;
  /** Modo de /api/games/titles (actual o clasicos). */
  mode: string;
  lang: string;
  T: Record<string, string>;
  /** Se ha elegido una película (clic, toque o Intro). */
  onPick: (e: TitleEntry) => void;
}

export interface GuessBox {
  /** Vacía el campo y cierra la lista (tras un intento). */
  clear(): void;
}

export function guessBox(o: GuessBoxOptions): GuessBox {
  const { form, q, list, msg, T } = o;
  let titles: TitleEntry[] | null = null;
  let opciones: TitleEntry[] = [];
  let activa = -1;

  async function cargaTitulos() {
    if (titles) return;
    try {
      const r = await fetch(`/api/games/titles?mode=${o.mode}&lang=${o.lang}`);
      const rows = (await r.json()) as [string | number, string, string, number, string[]?][];
      titles = rows.map(([id, title, original, year, aka]) => ({ id, title, original: original || undefined, aka, year }));
    } catch {
      msg.textContent = T['games.error'];
    }
  }
  function cierraLista() {
    list.hidden = true;
    q.setAttribute('aria-expanded', 'false');
    q.removeAttribute('aria-activedescendant');
    opciones = [];
    activa = -1;
  }
  function pintaLista() {
    list.replaceChildren(
      ...opciones.map((op, i) => {
        const li = document.createElement('li');
        li.id = `${list.id}-${i}`;
        li.setAttribute('role', 'option');
        li.setAttribute('aria-selected', String(i === activa));
        li.className = `cursor-pointer border-b border-ink/20 px-3 py-2 text-body-md ${i === activa ? 'bg-ink text-white' : 'text-ink hover:bg-film-white'}`;
        li.textContent = `${op.title} (${op.year})`;
        // pointerdown y no click: el click llega después del blur del campo, que
        // cerraba la lista antes de que el toque llegase a la opción (móviles).
        li.addEventListener('pointerdown', (e) => {
          e.preventDefault();
          o.onPick(op);
        });
        return li;
      }),
    );
    if (!opciones.length && q.value.trim().length >= 2) {
      const li = document.createElement('li');
      li.className = 'px-3 py-2 font-mono text-meta-data text-muted';
      li.textContent = T['games.noMatches'];
      list.append(li);
    }
    const abierta = q.value.trim().length >= 2;
    list.hidden = !abierta;
    q.setAttribute('aria-expanded', String(abierta));
    if (activa >= 0) {
      q.setAttribute('aria-activedescendant', `${list.id}-${activa}`);
      list.children[activa]?.scrollIntoView({ block: 'nearest' });
    } else q.removeAttribute('aria-activedescendant');
  }
  const busca = () => {
    opciones = matchTitles(q.value, titles ?? []);
    activa = opciones.length ? 0 : -1;
  };

  q.addEventListener('focus', () => void cargaTitulos());
  q.addEventListener('input', async () => {
    await cargaTitulos();
    busca();
    pintaLista();
  });
  q.addEventListener('keydown', (e) => {
    if (list.hidden) {
      // Flecha abajo vuelve a abrir la lista si se había cerrado (Esc o al salir del campo).
      if (e.key === 'ArrowDown' && q.value.trim().length >= 2 && titles) {
        e.preventDefault();
        busca();
        pintaLista();
      }
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      activa = Math.min(opciones.length - 1, activa + 1);
      pintaLista();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      activa = Math.max(0, activa - 1);
      pintaLista();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      cierraLista();
    }
  });
  q.addEventListener('blur', () => setTimeout(() => (list.hidden = true), 150));
  /**
   * Intro (o «Probar») prueba la opción marcada. Si se pulsa antes de que
   * lleguen los títulos o con la lista cerrada (tras salir del campo), busca en
   * ese momento y prueba la primera.
   */
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (q.value.trim().length < 2) return;
    if (list.hidden || activa < 0) {
      await cargaTitulos();
      busca();
    }
    const op = opciones[activa];
    if (op) o.onPick(op);
    else msg.textContent = T['games.noMatches'];
  });

  return {
    clear() {
      q.value = '';
      cierraLista();
    },
  };
}
