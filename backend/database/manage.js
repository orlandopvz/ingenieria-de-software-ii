import { createDatabase, initializeSchema, createStorageDirectories } from '../src/config/db.js';
import { env } from '../src/config/env.js';
import { seedDatabase } from './seed.js';
import { databaseTables } from '../src/repositories/admin.repository.js';

const operation = process.argv[2];
if (!['init', 'seed', 'reset'].includes(operation)) throw new Error('Usa init, seed o reset.');
if (operation === 'reset' && (env.NODE_ENV === 'production' || !process.argv.includes('--confirm-reset'))) {
  throw new Error('El reinicio solo se permite en desarrollo con --confirm-reset.');
}
const db = createDatabase();
try {
  createStorageDirectories();
  await initializeSchema(db);
  if (operation === 'reset') await db.transaction(() => db.exec(`TRUNCATE ${databaseTables.join(', ')} RESTART IDENTITY CASCADE`));
  if (operation !== 'init') await seedDatabase(db);
  console.log(operation === 'init' ? 'Esquema PostgreSQL inicializado.' : 'Datos de demostración inicializados.');
} catch {
  console.error('No se pudo inicializar PostgreSQL. Revisa DATABASE_URL, los permisos y la conexión.');
  process.exitCode = 1;
} finally { await db.close(); }
