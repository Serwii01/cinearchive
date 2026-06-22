// Aplica las migraciones de Drizzle usando solo dependencias de producción
// (drizzle-orm + pg). Se ejecuta al arrancar el contenedor antes del servidor.
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import pg from 'pg';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error('[migrate] DATABASE_URL no está definida.');
  process.exit(1);
}

const pool = new pg.Pool({ connectionString });
const db = drizzle(pool);

try {
  await migrate(db, { migrationsFolder: './drizzle' });
  console.log('[migrate] Migraciones aplicadas correctamente.');
} catch (err) {
  console.error('[migrate] Error aplicando migraciones:', err);
  process.exitCode = 1;
} finally {
  await pool.end();
}
