import { pathToFileURL } from 'node:url';
import path from 'node:path';
import { env } from './config/env.js';
import { getDb, closeDb, createStorageDirectories } from './config/db.js';
import { createApp } from './app.js';
import { createMaintenanceService } from './services/maintenance.service.js';

export async function startServer(config = env) {
  if (config !== env) throw new Error('El servidor debe usar la configuración validada del entorno.');
  const db = getDb();
  await db.query('SELECT 1');
  createStorageDirectories(config);
  let maintenanceTimer;
  if (config.NODE_ENV !== 'test') {
    const maintenance = createMaintenanceService(db, config);
    const run = async () => {
      try { await maintenance.runInactivityCheck(); }
      catch (error) { console.error('No se pudo completar el mantenimiento programado.', error); }
    };
    await run();
    maintenanceTimer = setInterval(run, config.MAINTENANCE_INTERVAL_HOURS * 3600000);
    maintenanceTimer.unref();
  }
  const server = createApp({ db, config }).listen(config.PORT, () => {
    console.log(`EmprendeBúho disponible en http://localhost:${config.PORT}`);
  });
  const stop = () => server.close(() => { closeDb(); });
  process.once('SIGINT', stop);
  process.once('SIGTERM', stop);
  server.once('error', error => {
    clearInterval(maintenanceTimer);
    closeDb();
    console.error('No se pudo iniciar el servidor. Revisa el puerto y los permisos.', error);
    process.exitCode = 1;
  });
  server.once('close', () => {
    clearInterval(maintenanceTimer);
    process.removeListener('SIGINT', stop);
    process.removeListener('SIGTERM', stop);
    closeDb();
  });
  return server;
}

if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) {
  try { await startServer(); }
  catch (error) {
    await closeDb();
    console.error('No se pudo iniciar EmprendeBúho. Revisa la configuración del backend.', error);
    process.exitCode = 1;
  }
}
