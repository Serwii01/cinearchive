/**
 * Recursos del servidor — SOLO SERVIDOR.
 *
 * Lee CPU, memoria, disco y carga del VPS desde dentro del contenedor, sin
 * dependencias externas y sin darle a la aplicación ningún privilegio nuevo:
 * todo sale de `/proc`, de los ficheros de cgroup y de `statfs`.
 *
 * QUÉ MIDE CADA COSA, QUE NO ES OBVIO
 *
 *   /proc/stat, /proc/meminfo, /proc/loadavg, /proc/uptime
 *     → son los del HOST, no los del contenedor. Docker no virtualiza /proc
 *       (haría falta lxcfs), así que aquí se ve la máquina entera. Es justo lo
 *       que interesa de un VPS.
 *
 *   /sys/fs/cgroup/*
 *     → esos SÍ son del contenedor: cuánta memoria tiene concedida y cuánta
 *       gasta, y si la CPU le está siendo estrangulada.
 *
 *   statfs('/')
 *     → el sistema de ficheros de la capa de escritura de Docker. En la
 *       práctica vive en el disco del VPS y la cifra coincide, pero no es
 *       literalmente "el disco del VPS", así que en el panel se rotula como
 *       disco de Docker. Medirlo de verdad exigiría montar el disco del host
 *       dentro del contenedor, y eso es un precio de seguridad que no compensa.
 *
 * NADA DE ESTO EXISTE EN WINDOWS. En desarrollo local todas las métricas del
 * sistema llegan como null y `procDisponible` es false; el panel lo dice en vez
 * de fingir ceros.
 */
import { readFile, statfs } from 'node:fs/promises';
import os from 'node:os';

/* ------------------------------------------------------------------ *
 * Tipos
 * ------------------------------------------------------------------ */

export interface TiemposCpu {
  /** user+nice+system+idle+iowait+irq+softirq+steal. */
  total: number;
  /** idle+iowait: tiempo en el que la CPU no hizo trabajo útil. */
  ocioso: number;
}

export interface CpuVitals {
  usoPct: number | null;
  nucleos: number | null;
  carga: [number, number, number] | null;
  /** Carga de 1 minuto dividida entre los núcleos: >1 significa cola de espera. */
  cargaPorNucleo: number | null;
}

export interface MemVitals {
  totalBytes: number | null;
  disponiblesBytes: number | null;
  usadosBytes: number | null;
  usoPct: number | null;
}

export interface DiscoVitals {
  totalBytes: number | null;
  libresBytes: number | null;
  usadosBytes: number | null;
  usoPct: number | null;
}

export interface ContenedorVitals {
  cgroup: 'v2' | 'no-disponible';
  /** null = sin límite ("max"). */
  memLimiteBytes: number | null;
  memActualBytes: number | null;
  memPct: number | null;
  /** Cuota en núcleos; null = sin límite. */
  cpuCuotaNucleos: number | null;
  cpuUsoNucleos: number | null;
  /** % de periodos en los que el kernel frenó al contenedor por pasarse de cuota. */
  estranguladoPct: number | null;
}

export interface ProcesoVitals {
  uptimeS: number;
  rss: number;
  heapUsado: number;
  heapTotal: number;
  externo: number;
  versionNode: string;
  pid: number;
}

export interface Vitals {
  plataforma: NodeJS.Platform;
  /** false en Windows: no hay /proc y las métricas del sistema van vacías. */
  procDisponible: boolean;
  hostUptimeS: number | null;
  cpu: CpuVitals;
  mem: MemVitals;
  disco: DiscoVitals;
  contenedor: ContenedorVitals;
  proceso: ProcesoVitals;
}

/* ------------------------------------------------------------------ *
 * Análisis de los ficheros del sistema (funciones puras, con tests)
 * ------------------------------------------------------------------ */

/**
 * Primera línea de /proc/stat (el agregado "cpu ") más el recuento de núcleos.
 *
 * `guest` y `guest_nice` NO se suman: el kernel ya los contabiliza dentro de
 * `user` y `nice`, y sumarlos inflaría el total y hundiría el porcentaje.
 */
export function parseProcStat(texto: string): { agregado: TiemposCpu | null; nucleos: number } {
  let agregado: TiemposCpu | null = null;
  let nucleos = 0;

  for (const linea of texto.split('\n')) {
    if (linea.startsWith('cpu ')) {
      const campos = linea.trim().split(/\s+/).slice(1, 9).map(Number);
      if (campos.some((n) => !Number.isFinite(n))) continue;
      // Los kernels antiguos traen menos de 8 campos: los que falten valen 0.
      const [user = 0, nice = 0, system = 0, idle = 0, iowait = 0, irq = 0, softirq = 0, steal = 0] =
        campos;
      agregado = {
        total: user + nice + system + idle + iowait + irq + softirq + steal,
        ocioso: idle + iowait,
      };
    } else if (/^cpu\d+ /.test(linea)) {
      nucleos++;
    }
  }
  return { agregado, nucleos };
}

/**
 * Memoria total y disponible de /proc/meminfo, en bytes.
 * Los valores del fichero vienen en kB, así que se multiplican por 1024.
 */
export function parseMeminfo(
  texto: string,
): { totalBytes: number; disponiblesBytes: number } | null {
  const kb = new Map<string, number>();
  for (const linea of texto.split('\n')) {
    const m = linea.match(/^(\w+):\s+(\d+)/);
    if (m) kb.set(m[1], Number(m[2]));
  }
  const total = kb.get('MemTotal');
  if (total == null) return null;

  // MemAvailable es la cifra buena: descuenta la caché que el kernel puede
  // liberar. En kernels anteriores a 3.14 no existe y se aproxima a mano.
  const disponible =
    kb.get('MemAvailable') ??
    (kb.get('MemFree') ?? 0) + (kb.get('Buffers') ?? 0) + (kb.get('Cached') ?? 0);

  return { totalBytes: total * 1024, disponiblesBytes: disponible * 1024 };
}

/** Las tres medias de carga de /proc/loadavg (1, 5 y 15 minutos). */
export function parseLoadavg(texto: string): [number, number, number] | null {
  const p = texto.trim().split(/\s+/).slice(0, 3).map(Number);
  if (p.length < 3 || p.some((n) => !Number.isFinite(n))) return null;
  return [p[0], p[1], p[2]];
}

/** Segundos que lleva encendida la máquina (primer número de /proc/uptime). */
export function parseUptime(texto: string): number | null {
  const n = Number(texto.trim().split(/\s+/)[0]);
  return Number.isFinite(n) ? n : null;
}

/** Un fichero de cgroup con un número o la palabra "max" (= sin límite → null). */
export function parseCgroupMax(texto: string): number | null {
  const v = texto.trim();
  if (v === 'max' || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

/** cpu.max: "150000 100000" → 1,5 núcleos. "max 100000" → sin límite (null). */
export function parseCgroupCpuMax(texto: string): number | null {
  const [cuota, periodo] = texto.trim().split(/\s+/);
  if (cuota === 'max') return null;
  const c = Number(cuota);
  const p = Number(periodo);
  if (!Number.isFinite(c) || !Number.isFinite(p) || p <= 0) return null;
  return c / p;
}

/** cpu.stat: microsegundos de CPU consumidos y periodos estrangulados. */
export function parseCgroupCpuStat(
  texto: string,
): { usageUsec: number; nrPeriods: number; nrThrottled: number } | null {
  const v = new Map<string, number>();
  for (const linea of texto.split('\n')) {
    const [k, n] = linea.trim().split(/\s+/);
    if (k && Number.isFinite(Number(n))) v.set(k, Number(n));
  }
  const usageUsec = v.get('usage_usec');
  if (usageUsec == null) return null;
  return {
    usageUsec,
    nrPeriods: v.get('nr_periods') ?? 0,
    nrThrottled: v.get('nr_throttled') ?? 0,
  };
}

/**
 * Porcentaje de CPU entre dos muestras de /proc/stat.
 *
 * /proc/stat da contadores acumulados desde el arranque, no un valor
 * instantáneo: el uso SIEMPRE es un delta entre dos lecturas. Si el delta no es
 * positivo (contadores reiniciados, o dos lecturas idénticas) devuelve null en
 * vez de una cifra inventada.
 */
export function porcentajeCpu(previo: TiemposCpu, actual: TiemposCpu): number | null {
  const dTotal = actual.total - previo.total;
  const dOcioso = actual.ocioso - previo.ocioso;
  if (dTotal <= 0) return null;
  const uso = (1 - dOcioso / dTotal) * 100;
  // El redondeo de los contadores puede dar un -0,4 % o un 100,3 %.
  return Math.min(100, Math.max(0, Math.round(uso)));
}

/* ------------------------------------------------------------------ *
 * Lectura
 * ------------------------------------------------------------------ */

/** Lee un fichero de texto; null si no existe o no se puede. NUNCA lanza. */
async function leer(ruta: string): Promise<string | null> {
  try {
    return await readFile(ruta, 'utf8');
  } catch {
    return null;
  }
}

/**
 * Última muestra de /proc/stat. No es un histórico: es UNA muestra, el mínimo
 * que exige el cálculo. Con el panel refrescando cada pocos segundos, la
 * llamada siguiente saca el porcentaje de aquí sin coste.
 */
let ultimaCpu: { en: number; tiempos: TiemposCpu } | null = null;
let ultimoCpuStat: { en: number; usageUsec: number } | null = null;

const DELTA_MIN_MS = 500; // por debajo, el delta es ruido
const DELTA_MAX_MS = 2 * 60_000; // por encima, la media está tan diluida que no dice nada
const MUESTREO_CORTO_MS = 150;

const esperar = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Uso de CPU del host. Si no hay una muestra previa reciente hace un muestreo
 * corto de 150 ms; con USER_HZ=100 eso son ~15 ticks por núcleo, así que la
 * PRIMERA lectura tiene una resolución basta (~7 % por núcleo). Las siguientes,
 * con la ventana de varios segundos del refresco, ya son finas. Se acepta a
 * cambio de no dejar un muestreo periódico corriendo en segundo plano.
 */
async function leerCpu(): Promise<{ usoPct: number | null; nucleos: number | null }> {
  const texto = await leer('/proc/stat');
  if (!texto) return { usoPct: null, nucleos: null };

  const { agregado, nucleos } = parseProcStat(texto);
  if (!agregado) return { usoPct: null, nucleos: nucleos || null };

  const ahora = Date.now();
  const previo = ultimaCpu;
  ultimaCpu = { en: ahora, tiempos: agregado };

  if (previo && ahora - previo.en >= DELTA_MIN_MS && ahora - previo.en <= DELTA_MAX_MS) {
    return { usoPct: porcentajeCpu(previo.tiempos, agregado), nucleos: nucleos || null };
  }

  // Sin muestra previa utilizable: se toma una segunda aquí mismo.
  await esperar(MUESTREO_CORTO_MS);
  const texto2 = await leer('/proc/stat');
  const segunda = texto2 ? parseProcStat(texto2).agregado : null;
  if (!segunda) return { usoPct: null, nucleos: nucleos || null };
  ultimaCpu = { en: Date.now(), tiempos: segunda };
  return { usoPct: porcentajeCpu(agregado, segunda), nucleos: nucleos || null };
}

/** Memoria y disco del contenedor según cgroup v2. */
async function leerContenedor(): Promise<ContenedorVitals> {
  const vacio: ContenedorVitals = {
    cgroup: 'no-disponible',
    memLimiteBytes: null,
    memActualBytes: null,
    memPct: null,
    cpuCuotaNucleos: null,
    cpuUsoNucleos: null,
    estranguladoPct: null,
  };

  // Si no está el fichero de controladores, no hay cgroup v2 montado. No se
  // implementa la rama de cgroup v1: cualquier distro con systemd moderno usa
  // v2 unificado, y soportar las dos doblaría el código para nada.
  if ((await leer('/sys/fs/cgroup/cgroup.controllers')) === null) return vacio;

  const [maxTxt, curTxt, cpuMaxTxt, cpuStatTxt] = await Promise.all([
    leer('/sys/fs/cgroup/memory.max'),
    leer('/sys/fs/cgroup/memory.current'),
    leer('/sys/fs/cgroup/cpu.max'),
    leer('/sys/fs/cgroup/cpu.stat'),
  ]);

  const memLimiteBytes = maxTxt ? parseCgroupMax(maxTxt) : null;
  const memActualBytes = curTxt ? parseCgroupMax(curTxt) : null;
  const cpuCuotaNucleos = cpuMaxTxt ? parseCgroupCpuMax(cpuMaxTxt) : null;
  const stat = cpuStatTxt ? parseCgroupCpuStat(cpuStatTxt) : null;

  let cpuUsoNucleos: number | null = null;
  if (stat) {
    const ahora = Date.now();
    const previo = ultimoCpuStat;
    ultimoCpuStat = { en: ahora, usageUsec: stat.usageUsec };
    if (previo && ahora - previo.en >= DELTA_MIN_MS && ahora - previo.en <= DELTA_MAX_MS) {
      // Microsegundos de CPU consumidos entre microsegundos de reloj = núcleos.
      const dUso = stat.usageUsec - previo.usageUsec;
      const dReloj = (ahora - previo.en) * 1000;
      if (dReloj > 0 && dUso >= 0) cpuUsoNucleos = Math.round((dUso / dReloj) * 100) / 100;
    }
  }

  return {
    cgroup: 'v2',
    memLimiteBytes,
    memActualBytes,
    memPct:
      memLimiteBytes && memActualBytes ? Math.round((memActualBytes / memLimiteBytes) * 100) : null,
    cpuCuotaNucleos,
    cpuUsoNucleos,
    estranguladoPct:
      stat && stat.nrPeriods > 0 ? Math.round((stat.nrThrottled / stat.nrPeriods) * 100) : null,
  };
}

/** Ocupación del sistema de ficheros donde escribe el contenedor. */
async function leerDisco(): Promise<DiscoVitals> {
  try {
    const { bsize, blocks, bfree, bavail } = await statfs('/');
    const totalBytes = bsize * blocks;
    // `bfree` son los bloques libres de verdad y `bavail` los que puede usar un
    // proceso sin privilegios (el kernel reserva ~5 % para root). Se calcula lo
    // usado con bfree —que es lo que enseña `df`— y lo libre con bavail, que es
    // lo que de verdad tenemos disponible. Por eso usado + libre ≠ total.
    const usadosBytes = bsize * (blocks - bfree);
    return {
      totalBytes,
      libresBytes: bsize * bavail,
      usadosBytes,
      usoPct: totalBytes > 0 ? Math.round((usadosBytes / totalBytes) * 100) : null,
    };
  } catch {
    return { totalBytes: null, libresBytes: null, usadosBytes: null, usoPct: null };
  }
}

/**
 * Foto de los recursos. No lanza nunca: lo que no se pueda leer viene a null y
 * el panel lo muestra como "—".
 */
export async function readVitals(): Promise<Vitals> {
  const [cpu, memTxt, loadTxt, upTxt, contenedor, disco] = await Promise.all([
    leerCpu(),
    leer('/proc/meminfo'),
    leer('/proc/loadavg'),
    leer('/proc/uptime'),
    leerContenedor(),
    leerDisco(),
  ]);

  const mem = memTxt ? parseMeminfo(memTxt) : null;
  const carga = loadTxt ? parseLoadavg(loadTxt) : null;
  const nucleos = cpu.nucleos ?? os.cpus().length ?? null;

  const memoria: MemVitals = mem
    ? {
        totalBytes: mem.totalBytes,
        disponiblesBytes: mem.disponiblesBytes,
        usadosBytes: mem.totalBytes - mem.disponiblesBytes,
        usoPct: Math.round(((mem.totalBytes - mem.disponiblesBytes) / mem.totalBytes) * 100),
      }
    : { totalBytes: null, disponiblesBytes: null, usadosBytes: null, usoPct: null };

  const m = process.memoryUsage();

  return {
    plataforma: process.platform,
    procDisponible: memTxt !== null,
    hostUptimeS: upTxt ? parseUptime(upTxt) : null,
    cpu: {
      usoPct: cpu.usoPct,
      nucleos,
      carga,
      cargaPorNucleo:
        carga && nucleos ? Math.round((carga[0] / nucleos) * 100) / 100 : null,
    },
    mem: memoria,
    disco,
    contenedor,
    proceso: {
      uptimeS: Math.round(process.uptime()),
      rss: m.rss,
      heapUsado: m.heapUsed,
      heapTotal: m.heapTotal,
      externo: m.external,
      versionNode: process.version,
      pid: process.pid,
    },
  };
}
