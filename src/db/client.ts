import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import * as schema from './schema';

/**
 * Conexión a PostgreSQL (solo servidor).
 * DATABASE_URL nunca lleva prefijo PUBLIC_ → jamás llega al bundle de cliente.
 */
const connectionString = process.env.DATABASE_URL;

if (!connectionString && import.meta.env.PROD) {
  // En producción la URL es obligatoria; en build se tolera su ausencia.
  console.warn('[db] DATABASE_URL no está definida.');
}

// Pool reutilizable (un único Pool por proceso).
const pool = new pg.Pool({
  connectionString: connectionString ?? 'postgres://localhost:5432/postgres',
  max: 10,
  // Por defecto, pg cierra cada conexión tras 10 s sin uso. Con tráfico a
  // ráfagas (rastreadores), eso era abrir y cerrar hasta 10 conexiones cada
  // pocos segundos: un proceso nuevo de Postgres y una comprobación de
  // contraseña (SCRAM, lenta a propósito) por cada una, en un VPS de 1 núcleo.
  // El 7-11-2026 la CPU estaba al 100 % con 10 procesos de Postgres de 6 s de
  // vida. Ahora se quedan 2 siempre abiertas y las demás aguantan 5 minutos.
  min: 2,
  idleTimeoutMillis: 5 * 60 * 1000,
});

export const db = drizzle(pool, { schema });
export { schema };
