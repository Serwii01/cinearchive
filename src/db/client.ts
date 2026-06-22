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
});

export const db = drizzle(pool, { schema });
export { schema };
