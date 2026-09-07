import { describe, it, expect } from 'vitest';
import {
  parseProcStat,
  parseMeminfo,
  parseLoadavg,
  parseUptime,
  parseCgroupMax,
  parseCgroupCpuMax,
  parseCgroupCpuStat,
  porcentajeCpu,
  readVitals,
} from '../src/lib/vitals';

/** Trozo real de /proc/stat de una máquina de 2 núcleos. */
const PROC_STAT = [
  'cpu  1000 20 300 8000 50 0 10 5 0 0',
  'cpu0 500 10 150 4000 25 0 5 2 0 0',
  'cpu1 500 10 150 4000 25 0 5 3 0 0',
  'intr 123456 0 0',
  'ctxt 987654',
].join('\n');

describe('parseProcStat', () => {
  it('suma los ocho campos del agregado y cuenta los núcleos', () => {
    const { agregado, nucleos } = parseProcStat(PROC_STAT);
    // 1000+20+300+8000+50+0+10+5
    expect(agregado).toEqual({ total: 9385, ocioso: 8050 });
    expect(nucleos).toBe(2);
  });

  it('NO suma guest ni guest_nice: el kernel ya los cuenta dentro de user', () => {
    // Los dos últimos campos son guest=900 y guest_nice=900; si se sumaran, el
    // total se dispararía y el porcentaje de uso saldría hundido.
    const { agregado } = parseProcStat('cpu  1000 20 300 8000 50 0 10 5 900 900');
    expect(agregado!.total).toBe(9385);
  });

  it('tolera kernels antiguos con menos campos', () => {
    const { agregado } = parseProcStat('cpu  100 0 50 200');
    expect(agregado).toEqual({ total: 350, ocioso: 200 });
  });

  it('sin línea agregada devuelve null', () => {
    expect(parseProcStat('intr 1 2 3').agregado).toBeNull();
  });

  it('no confunde la línea "cpu " con las "cpuN"', () => {
    const { nucleos } = parseProcStat('cpu  1 1 1 1 1 1 1 1\ncpu0 1 1 1 1 1 1 1 1');
    expect(nucleos).toBe(1);
  });
});

describe('porcentajeCpu', () => {
  it('calcula el uso entre dos muestras', () => {
    // 100 ticks de diferencia, 25 ociosos → 75 % de uso.
    const p = porcentajeCpu({ total: 1000, ocioso: 800 }, { total: 1100, ocioso: 825 });
    expect(p).toBe(75);
  });

  it('todo ocioso da 0 %', () => {
    expect(porcentajeCpu({ total: 1000, ocioso: 900 }, { total: 1100, ocioso: 1000 })).toBe(0);
  });

  it('nada ocioso da 100 %', () => {
    expect(porcentajeCpu({ total: 1000, ocioso: 900 }, { total: 1100, ocioso: 900 })).toBe(100);
  });

  it('devuelve null si el delta no avanza (contadores reiniciados)', () => {
    expect(porcentajeCpu({ total: 1000, ocioso: 800 }, { total: 1000, ocioso: 800 })).toBeNull();
    expect(porcentajeCpu({ total: 1000, ocioso: 800 }, { total: 900, ocioso: 700 })).toBeNull();
  });

  it('acota el resultado a 0-100 pese al redondeo de los contadores', () => {
    const p = porcentajeCpu({ total: 1000, ocioso: 800 }, { total: 1100, ocioso: 790 });
    expect(p).toBe(100); // el ocioso "bajó": sin acotar saldría más de 100
  });
});

describe('parseMeminfo', () => {
  const MEMINFO = [
    'MemTotal:        4030264 kB',
    'MemFree:          200000 kB',
    'MemAvailable:    2515432 kB',
    'Buffers:          100000 kB',
    'Cached:          1500000 kB',
  ].join('\n');

  it('convierte de kB a bytes y prefiere MemAvailable', () => {
    const m = parseMeminfo(MEMINFO)!;
    expect(m.totalBytes).toBe(4030264 * 1024);
    expect(m.disponiblesBytes).toBe(2515432 * 1024);
  });

  it('sin MemAvailable, lo aproxima con free + buffers + cached', () => {
    const sinAvailable = MEMINFO.split('\n')
      .filter((l) => !l.startsWith('MemAvailable'))
      .join('\n');
    const m = parseMeminfo(sinAvailable)!;
    expect(m.disponiblesBytes).toBe((200000 + 100000 + 1500000) * 1024);
  });

  it('sin MemTotal devuelve null', () => {
    expect(parseMeminfo('Buffers: 100 kB')).toBeNull();
  });
});

describe('parseLoadavg y parseUptime', () => {
  it('lee las tres medias de carga', () => {
    expect(parseLoadavg('0.52 0.58 0.59 1/523 12345')).toEqual([0.52, 0.58, 0.59]);
  });

  it('rechaza una línea incompleta', () => {
    expect(parseLoadavg('0.52 0.58')).toBeNull();
  });

  it('lee los segundos de encendido', () => {
    expect(parseUptime('350735.47 234388.90')).toBeCloseTo(350735.47);
  });
});

describe('cgroup v2', () => {
  it('"max" significa sin límite, no cero', () => {
    expect(parseCgroupMax('max')).toBeNull();
    expect(parseCgroupMax('2147483648')).toBe(2147483648);
  });

  it('cpu.max se traduce a número de núcleos', () => {
    expect(parseCgroupCpuMax('150000 100000')).toBe(1.5);
    expect(parseCgroupCpuMax('50000 100000')).toBe(0.5);
    expect(parseCgroupCpuMax('max 100000')).toBeNull();
  });

  it('cpu.stat trae el consumo y los periodos estrangulados', () => {
    const s = parseCgroupCpuStat('usage_usec 1234567\nnr_periods 100\nnr_throttled 7\n')!;
    expect(s).toEqual({ usageUsec: 1234567, nrPeriods: 100, nrThrottled: 7 });
  });

  it('sin usage_usec no hay dato aprovechable', () => {
    expect(parseCgroupCpuStat('nr_periods 10')).toBeNull();
  });
});

describe('readVitals', () => {
  it('no lanza nunca, ni siquiera donde no existe /proc (Windows)', async () => {
    const v = await readVitals();
    // El proceso siempre se puede medir, esté donde esté.
    expect(v.proceso.uptimeS).toBeGreaterThanOrEqual(0);
    expect(v.proceso.versionNode).toMatch(/^v\d+/);
    expect(typeof v.procDisponible).toBe('boolean');
    // En Windows todo lo del host viene a null, y eso es correcto.
    if (!v.procDisponible) expect(v.mem.totalBytes).toBeNull();
  });
});
