/**
 * Reglas de las marcas de una película: pendiente / vista / favorita, y la
 * fecha de «cuándo la vi».
 *
 * Viven aquí, y no en el navegador, porque tienen que valer igual desde la
 * interfaz que desde una llamada directa a /api/me/films. Además así se pueden
 * probar sin levantar nada.
 */

export type Estado = 'want' | 'seen';

export interface Marcas {
  status?: Estado;
  favorite?: boolean;
  /** null = quitar la puntuación; undefined = no se toca. */
  rating?: number | null;
}

/**
 * Aplica las dependencias entre las tres marcas.
 *
 *   favorita  ⇒ vista        no se puede tener de favorita algo que no has visto
 *   puntuada  ⇒ vista        puntuar es haberla visto
 *   pendiente ⇒ no favorita  la misma regla, leída al revés
 *
 * La vuelta NO se cumple a propósito: marcarla como vista no la hace favorita,
 * y esa asimetría es justo lo que se pide.
 *
 * LO EXPLÍCITO GANA A LO IMPLÍCITO: el ascenso a «vista» solo rellena un estado
 * que quien llama no ha mandado. Si manda `want` a la vez que `favorite`, se
 * respeta el `want` y es lo favorito lo que cae. Sin esa precedencia, pulsar
 * «pendiente» en una favorita la devolvía a «vista» sola.
 *
 * Devuelve solo los campos que hay que escribir; los que llegan como
 * `undefined` siguen sin tocarse.
 */
export function aplicarReglas(m: Marcas): Marcas {
  let { status, favorite } = m;
  const puntuada = m.rating !== undefined && m.rating !== null;

  if (status === undefined && (favorite === true || puntuada)) status = 'seen';
  if (status === 'want') favorite = false;

  return { ...m, status, favorite };
}

/**
 * Convierte el YYYY-MM-DD del formulario en la fecha que se guarda, o null si
 * no vale.
 *
 * Se ancla a las 12:00 UTC en vez de a medianoche: así el día no se desplaza al
 * pasarlo al huso del usuario, que es lo que haría que una película vista
 * «ayer» apareciese como anteayer.
 *
 * No se admiten fechas futuras. El margen de un día no es descuido: a las 00:30
 * en España todavía es el día anterior en UTC, y sin ese margen elegir «hoy» en
 * el calendario daría error un rato cada noche.
 */
export function fechaVista(iso: string, ahora: number = Date.now()): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return null;
  const d = new Date(`${iso}T12:00:00.000Z`);
  if (Number.isNaN(d.getTime())) return null;
  if (d.getTime() > ahora + 24 * 60 * 60 * 1000) return null;
  return d;
}

/** El YYYY-MM-DD que espera un <input type="date"> a partir de lo guardado. */
export function aInputDate(d: Date | string | null | undefined): string {
  if (!d) return '';
  const f = typeof d === 'string' ? new Date(d) : d;
  return Number.isNaN(f.getTime()) ? '' : f.toISOString().slice(0, 10);
}
