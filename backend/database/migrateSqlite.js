import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import Database from 'better-sqlite3';
import { createDatabase, initializeSchema } from '../src/config/db.js';
import { createMigrationRepository } from '../src/repositories/migration.repository.js';
import { databaseTables } from '../src/repositories/admin.repository.js';

export async function importSqlite(db, source) {
  if (!source || !fs.existsSync(source)) throw new Error('Indica un archivo SQLite existente mediante --source.');
  const legacy = new Database(path.resolve(source), { readonly: true, fileMustExist: true });
  try {
    legacy.exec('BEGIN');
    if (legacy.pragma('integrity_check', { simple: true }) !== 'ok' || legacy.pragma('foreign_key_check').length) {
      throw new Error('La base de origen no cumple las comprobaciones de integridad.');
    }
    const repository = createMigrationRepository(db);
    return await db.transaction(async () => {
      if (!await repository.isEmpty()) throw new Error('El destino debe estar vacío; no se sobrescribieron datos.');
      await repository.deferUserReferences();
      const counts = {};
      for (const table of databaseTables) {
        const columns = await repository.columns(table);
        const rows = legacy.prepare(`SELECT * FROM ${table}`).all();
        for (const row of rows) await repository.insert(table, columns, row);
        counts[table] = rows.length;
      }
      const sequences = Object.fromEntries(legacy.prepare('SELECT name, seq FROM sqlite_sequence').all().map(row => [row.name, row.seq]));
      await repository.resetSequences(sequences);
      return counts;
    });
  } finally { legacy.exec('ROLLBACK'); legacy.close(); }
}

if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) {
  const db = createDatabase();
  try {
    const source = process.argv[process.argv.indexOf('--source') + 1];
    if (!process.argv.includes('--source')) throw new Error('Falta --source.');
    await initializeSchema(db);
    console.log('Importación completada:', await importSqlite(db, source));
  } catch {
    console.error('No se pudo importar. Revisa el origen, DATABASE_URL y que el destino esté vacío. El origen no se modificó.');
    process.exitCode = 1;
  } finally { await db.close(); }
}
