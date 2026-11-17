import fs from 'node:fs';
import path from 'node:path';
import { AsyncLocalStorage } from 'node:async_hooks';
import pg from 'pg';
import { attachDatabasePool } from '@vercel/functions';
import { env } from './env.js';
// Conserva números y fechas UTC en las respuestas JSON.
pg.types.setTypeParser(20, value => {
  const number = Number(value);
  if (!Number.isSafeInteger(number)) throw new RangeError('El identificador excede el rango permitido.');
  return number;
});
pg.types.setTypeParser(1700, Number);
pg.types.setTypeParser(1184, value => new Date(value).toISOString());

export function compileNamed(sql, params = {}) {
  const names = [];
  const text = sql.replace(/'(?:''|[^'])*'|"(?:""|[^"])*"|--[^\n]*|\/\*[\s\S]*?\*\/|::[a-zA-Z_][\w]*|:([a-zA-Z_][\w]*)/g, (token, name) => {
    if (!name) return token;
    if (!Object.hasOwn(params, name)) throw new Error(`Falta el parámetro de consulta: ${name}.`);
    let index = names.indexOf(name);
    if (index === -1) { index = names.length; names.push(name); }
    return `$${index + 1}`;
  });
  return { text, values: names.map(name => params[name]) };
}

export function createDatabase(config = env, { direct = false } = {}) {
  if (config.DB_SCHEMA && !/^test_[a-f0-9]{32}$/.test(config.DB_SCHEMA)) throw new Error('El esquema de pruebas no es válido.');
  const pool = new pg.Pool({ connectionString: direct ? (config.DATABASE_URL_UNPOOLED ?? config.DATABASE_URL) : config.DATABASE_URL,
    max: config.DB_POOL_MAX ?? 5, idleTimeoutMillis: 5000,
    connectionTimeoutMillis: 10000, options: `-c timezone=UTC${config.DB_SCHEMA ? ` -c search_path=${config.DB_SCHEMA}` : ''}` });
  if (config.VERCEL) attachDatabasePool(pool);
  pool.on('error', () => console.error('Se perdió una conexión inactiva con PostgreSQL.'));
  const context = new AsyncLocalStorage();
  let savepoint = 0;
  const query = (text, values) => (context.getStore() ?? pool).query(text, values);
  return {
    query,
    exec: sql => query(sql),
    prepare(sql) {
      const execute = params => { const compiled = compileNamed(sql, params); return query(compiled.text, compiled.values); };
      return {
        async get(params) { return (await execute(params)).rows[0]; },
        async all(params) { return (await execute(params)).rows; },
        async run(params) { const result = await execute(params); return { changes: result.rowCount, insertId: result.rows[0]?.id }; }
      };
    },
    async transaction(operation) {
      const existing = context.getStore();
      if (existing) {
        const name = `sp_${++savepoint}`;
        await existing.query(`SAVEPOINT ${name}`);
        try { const result = await operation(); await existing.query(`RELEASE SAVEPOINT ${name}`); return result; }
        catch (error) {
          await existing.query(`ROLLBACK TO SAVEPOINT ${name}`);
          await existing.query(`RELEASE SAVEPOINT ${name}`);
          throw error;
        }
      }
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        await client.query('SELECT pg_advisory_xact_lock(174012, hashtext(current_schema()))');
        const result = await context.run(client, operation);
        await client.query('COMMIT');
        return result;
      } catch (error) { await client.query('ROLLBACK'); throw error; }
      finally { client.release(); }
    },
    close: () => pool.end()
  };
}

export function createStorageDirectories(config = env) {
  for (const directory of [config.BACKUP_DIR, ...['profiles', 'menus', 'products'].map(name => path.join(config.UPLOAD_DIR, name)),
    path.join(config.STORAGE_DIR, 'credentials')]) fs.mkdirSync(directory, { recursive: true });
}

export async function initializeSchema(db) {
  await db.transaction(() => db.exec(fs.readFileSync(new URL('../../database/schema.sql', import.meta.url), 'utf8')));
}

let connection;
export function getDb() {
  connection ??= createDatabase();
  return connection;
}
export async function closeDb() {
  const db = connection;
  connection = undefined;
  if (db) await db.close();
}
