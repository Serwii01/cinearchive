/**
 * Reto anual: «quiero ver N películas este año». Pura (tiene tests).
 *
 * Cuenta visionados, no películas distintas: es lo que cuenta el diario y lo
 * que hace Letterboxd, y volver a ver una película también es una tarde de
 * cine.
 */

export interface GoalProgress {
  target: number;
  done: number;
  /** 0–100, sin pasarse aunque se supere la meta. */
  pct: number;
  complete: boolean;
  /**
   * Cuántas «tocarían» a estas alturas del año con un ritmo uniforme, y la
   * diferencia: positiva = va por delante. En un año ya cerrado, la meta.
   */
  expected: number;
  diff: number;
  /** Las que faltan y a cuántas por semana sale; 0 si está cumplido o el año acabó. */
  left: number;
  perWeek: number;
}

const DAY = 24 * 60 * 60 * 1000;

export function goalProgress(target: number, done: number, year: number, today: Date): GoalProgress {
  const start = Date.UTC(year, 0, 1);
  const end = Date.UTC(year + 1, 0, 1);
  const now = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate());
  // Días transcurridos contando el de hoy: el 1 de enero ya «toca» algo.
  const frac = now < start ? 0 : now >= end ? 1 : (now - start + DAY) / (end - start);
  const expected = Math.round(target * frac);
  const left = Math.max(0, target - done);
  const weeksLeft = now >= end ? 0 : (end - Math.max(now, start)) / (7 * DAY);
  return {
    target,
    done,
    pct: target > 0 ? Math.min(100, Math.round((done / target) * 100)) : 0,
    complete: done >= target,
    expected,
    diff: done - expected,
    left,
    perWeek: left > 0 && weeksLeft > 0 ? Math.ceil((left / weeksLeft) * 10) / 10 : 0,
  };
}

/** Lo que se acepta como meta: un entero de 1 a 3.650 (diez al día). */
export function isValidTarget(n: unknown): n is number {
  return typeof n === 'number' && Number.isInteger(n) && n >= 1 && n <= 3650;
}
