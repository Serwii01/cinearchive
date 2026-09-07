import { describe, it, expect, beforeEach } from 'vitest';
import { formatBytes, formatDuration, formatMs, formatNum, formatPct, pct, SIN_DATO } from '../src/lib/format';
import { rellenarSemanas } from '../src/lib/growth';
import { clasificar, UMBRAL_LENTO_MS } from '../src/lib/probes';
import {
  registerCache,
  listCaches,
  clearCache,
  clearAllCaches,
} from '../src/lib/cache-registry';

describe('formatBytes', () => {
  it('usa unidades binarias, que son las que reporta el sistema', () => {
    expect(formatBytes(512)).toBe('512 B');
    expect(formatBytes(1024)).toBe('1,0 KiB');
    expect(formatBytes(1536)).toBe('1,5 KiB');
    expect(formatBytes(1024 ** 3)).toBe('1,0 GiB');
  });

  it('quita los decimales cuando la cifra ya es grande', () => {
    // "234 GiB" se lee mejor que "234,1 GiB".
    expect(formatBytes(234 * 1024 ** 3)).toBe('234 GiB');
  });

  it('null y valores absurdos dan el guion, no NaN', () => {
    expect(formatBytes(null)).toBe(SIN_DATO);
    expect(formatBytes(undefined)).toBe(SIN_DATO);
    expect(formatBytes(Number.NaN)).toBe(SIN_DATO);
  });
});

describe('formatDuration', () => {
  it('escala de segundos a días', () => {
    expect(formatDuration(45)).toBe('45 s');
    expect(formatDuration(12 * 60)).toBe('12 min');
    expect(formatDuration(3 * 3600 + 20 * 60)).toBe('3 h 20 min');
    expect(formatDuration(5 * 86400 + 4 * 3600)).toBe('5 d 4 h');
  });

  it('omite la parte que vale cero', () => {
    expect(formatDuration(2 * 3600)).toBe('2 h');
    expect(formatDuration(3 * 86400)).toBe('3 d');
  });

  it('null y negativos dan el guion', () => {
    expect(formatDuration(null)).toBe(SIN_DATO);
    expect(formatDuration(-5)).toBe(SIN_DATO);
  });
});

describe('formatMs y formatPct', () => {
  it('la latencia cambia de unidad al pasar del segundo', () => {
    expect(formatMs(312)).toBe('312 ms');
    expect(formatMs(1400)).toBe('1,4 s');
  });

  it('los porcentajes admiten decimales', () => {
    expect(formatPct(75)).toBe('75 %');
    expect(formatPct(99.37, 1)).toBe('99,4 %');
    expect(formatPct(null)).toBe(SIN_DATO);
  });
});

describe('pct', () => {
  it('acota entre 0 y 100', () => {
    expect(pct(50, 200)).toBe(25);
    expect(pct(300, 200)).toBe(100);
    expect(pct(-5, 200)).toBe(0);
  });

  it('un total de cero da 0 y no NaN: si no, rompería el ancho de la barra', () => {
    expect(pct(5, 0)).toBe(0);
    expect(pct(null, null)).toBe(0);
  });
});

describe('formatNum', () => {
  it('separa los miles', () => {
    expect(formatNum(36352, 'es-ES')).toBe('36.352');
  });
  it('null da el guion', () => {
    expect(formatNum(null)).toBe(SIN_DATO);
  });
});

describe('rellenarSemanas', () => {
  // Miércoles: el lunes de esa semana es el 2026-09-02.
  const AHORA = new Date('2026-09-09T12:00:00Z');

  it('devuelve siempre el número de semanas pedido', () => {
    expect(rellenarSemanas([], 12, AHORA)).toHaveLength(12);
    expect(rellenarSemanas([], 4, AHORA)).toHaveLength(4);
  });

  it('termina en el lunes de la semana actual', () => {
    const s = rellenarSemanas([], 4, AHORA);
    expect(s.at(-1)!.semana).toBe('2026-09-07');
  });

  it('pone cero en las semanas sin datos, para no falsear el ritmo', () => {
    const s = rellenarSemanas([{ semana: '2026-09-07', n: 5 }], 3, AHORA);
    expect(s.map((p) => p.n)).toEqual([0, 0, 5]);
  });

  it('coloca cada dato en su semana', () => {
    const s = rellenarSemanas(
      [
        { semana: '2026-08-24', n: 2 },
        { semana: '2026-09-07', n: 7 },
      ],
      3,
      AHORA,
    );
    expect(s).toEqual([
      { semana: '2026-08-24', n: 2 },
      { semana: '2026-08-31', n: 0 },
      { semana: '2026-09-07', n: 7 },
    ]);
  });

  it('el domingo pertenece a la semana que empezó el lunes anterior', () => {
    // Error clásico: con getUTCDay() el domingo es 0 y, sin corregirlo, se
    // tomaría como inicio de semana en vez de como su último día.
    const domingo = new Date('2026-09-13T23:00:00Z');
    expect(rellenarSemanas([], 1, domingo)[0].semana).toBe('2026-09-07');
  });

  it('ignora semanas que caen fuera de la ventana', () => {
    const s = rellenarSemanas([{ semana: '2020-01-06', n: 99 }], 3, AHORA);
    expect(s.every((p) => p.n === 0)).toBe(true);
  });
});

describe('clasificar sondas', () => {
  it('rápida y con éxito es "ok"', () => {
    expect(clasificar(120, 200)).toBe('ok');
  });

  it('a partir del umbral es "lenta"', () => {
    expect(clasificar(UMBRAL_LENTO_MS, 200)).toBe('slow');
    expect(clasificar(UMBRAL_LENTO_MS - 1, 200)).toBe('ok');
  });

  it('sin respuesta o con error HTTP es "caída"', () => {
    expect(clasificar(50, null)).toBe('down');
    expect(clasificar(50, 500)).toBe('down');
    expect(clasificar(50, 401)).toBe('down');
  });

  it('una redirección todavía cuenta como respuesta', () => {
    expect(clasificar(50, 301)).toBe('ok');
  });
});

describe('registro de cachés', () => {
  // Los ids llevan prefijo para no chocar con las cachés reales, que se
  // registran al importar sus módulos.
  const id = 'test-cache';
  let contenido: string[] = [];

  beforeEach(() => {
    contenido = ['a', 'b', 'c'];
    registerCache({
      id,
      label: 'De prueba',
      ttlMs: 1000,
      maxKeys: 10,
      size: () => contenido.length,
      clear: () => {
        contenido = [];
      },
    });
  });

  it('publica el tamaño en vivo, no una copia', () => {
    expect(listCaches().find((c) => c.id === id)!.size).toBe(3);
    contenido.push('d');
    expect(listCaches().find((c) => c.id === id)!.size).toBe(4);
  });

  it('vaciar una caché la deja a cero', () => {
    expect(clearCache(id)).toBe(true);
    expect(listCaches().find((c) => c.id === id)!.size).toBe(0);
  });

  it('registrar dos veces el mismo id no duplica la fila', () => {
    registerCache({ id, label: 'Otra', size: () => 0, clear: () => {} });
    expect(listCaches().filter((c) => c.id === id)).toHaveLength(1);
  });

  it('una caché marcada como no vaciable se niega', () => {
    registerCache({
      id: 'test-no-vaciable',
      label: 'Intocable',
      clearable: false,
      size: () => 1,
      clear: () => {
        throw new Error('no debería llamarse');
      },
    });
    expect(clearCache('test-no-vaciable')).toBe(false);
    expect(listCaches().find((c) => c.id === 'test-no-vaciable')!.clearable).toBe(false);
  });

  it('un id inexistente devuelve false en vez de lanzar', () => {
    expect(clearCache('no-existe')).toBe(false);
  });

  it('vaciar todas respeta a las no vaciables', () => {
    const antes = listCaches().filter((c) => c.clearable).length;
    expect(clearAllCaches()).toBe(antes);
    expect(listCaches().find((c) => c.id === 'test-no-vaciable')!.size).toBe(1);
  });

  it('una caché cuyo size() falla no tumba el panel entero', () => {
    registerCache({
      id: 'test-rota',
      label: 'Rota',
      size: () => {
        throw new Error('boom');
      },
      clear: () => {},
    });
    expect(() => listCaches()).not.toThrow();
    expect(listCaches().find((c) => c.id === 'test-rota')!.size).toBe(-1);
  });

  it('la lista sale ordenada, para que las filas no bailen entre refrescos', () => {
    const ids = listCaches().map((c) => c.id);
    expect(ids).toEqual([...ids].sort());
  });
});
