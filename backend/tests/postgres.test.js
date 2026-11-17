import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import Database from 'better-sqlite3';
import { createTestApp } from './helpers/testApp.js';
import { compileNamed } from '../src/config/db.js';
import { seedDatabase } from '../database/seed.js';
import { importSqlite } from '../database/migrateSqlite.js';

test('PostgreSQL: parámetros repetidos, literales, casts y entradas hostiles', () => {
  const attack = "x'); DROP TABLE users; --";
  assert.deepEqual(compileNamed("SELECT :value, :value::text, ':secret', \"colon:name\" -- :ignored\n/* :ignored */", { value: attack }), {
    text: "SELECT $1, $1::text, ':secret', \"colon:name\" -- :ignored\n/* :ignored */", values: [attack]
  });
  assert.throws(() => compileNamed('SELECT :missing'), /Falta el parámetro/);
});

test('PostgreSQL: rollback, savepoints y aislamiento de conexiones concurrentes', async t => {
  const f = await createTestApp({ seed: false }); t.after(f.close);
  const insert = name => f.db.prepare('INSERT INTO categories (nombre, slug) VALUES (:name, :name)').run({ name });
  await assert.rejects(f.db.transaction(async () => {
    await insert('exterior');
    await f.db.transaction(() => insert('interior'));
    throw new Error('Revertir todo');
  }), /Revertir todo/);
  assert.equal((await f.db.prepare('SELECT COUNT(*) AS total FROM categories').get()).total, 0);
  await f.db.transaction(async () => {
    await insert('persistente');
    await assert.rejects(f.db.transaction(async () => { await insert('revertida'); throw new Error('Revertir parte'); }));
    await insert('posterior');
  });
  let entered;
  const started = new Promise(resolve => { entered = resolve; });
  let release;
  const gate = new Promise(resolve => { release = resolve; });
  const first = f.db.transaction(async () => { await insert('concurrente'); entered(); await gate; });
  await started;
  try { assert.equal((await f.db.prepare("SELECT COUNT(*) AS total FROM categories WHERE nombre = 'concurrente'").get()).total, 0); }
  finally { release(); await first; }
  assert.equal((await f.db.prepare('SELECT COUNT(*) AS total FROM categories').get()).total, 3);
});

async function legacyFixture(f) {
  const source = path.join(f.directory, 'legacy.sqlite');
  const legacy = new Database(source);
  try {
    legacy.exec(fs.readFileSync(new URL('./fixtures/legacySchema.sql', import.meta.url), 'utf8'));
    const adapter = {
      prepare(sql) {
        const statement = legacy.prepare(sql);
        return { get: params => params ? statement.get(params) : statement.get(),
          run(params) { const result = statement.run(params); return { ...result, insertId: result.lastInsertRowid }; } };
      },
      async transaction(operation) {
        legacy.exec('BEGIN');
        try { const result = await operation(); legacy.exec('COMMIT'); return result; }
        catch (error) { legacy.exec('ROLLBACK'); throw error; }
      }
    };
    await seedDatabase(adapter, f.config);
    // Una referencia a un usuario posterior y una secuencia avanzada deben conservarse.
    legacy.exec('UPDATE users SET resuelto_por = 5 WHERE id = 2');
    legacy.exec("UPDATE sqlite_sequence SET seq = 1000 WHERE name = 'business_contacts'");
  } finally { legacy.close(); }
  return source;
}

test('Migración SQLite: conserva las 11 tablas, IDs, fechas, precios y secuencias sin modificar el origen', async t => {
  const f = await createTestApp({ seed: false }); t.after(f.close);
  const source = await legacyFixture(f);
  const digest = () => createHash('sha256').update(fs.readFileSync(source)).digest('hex');
  const before = digest();
  const counts = await importSqlite(f.db, source);
  assert.equal(Object.keys(counts).length, 11);
  assert.equal(counts.users, 5); assert.equal(counts.business_schedules, 28); assert.equal(counts.products, 9);
  assert.equal((await f.db.prepare('SELECT resuelto_por FROM users WHERE id = 2').get()).resuelto_por, 5);
  const product = await f.db.prepare('SELECT precio, created_at FROM products WHERE id = 1').get();
  assert.equal(product.precio, 20); assert.match(product.created_at, /Z$/);
  const contact = await f.db.prepare("INSERT INTO business_contacts (business_id, tipo_contacto, valor) VALUES (1, 'instagram', 'a') RETURNING id").run();
  assert.equal(contact.insertId, 1001);
  await assert.rejects(importSqlite(f.db, source), /destino debe estar vacío/);
  assert.equal(digest(), before);
});

test('Migración SQLite: un error de restricciones revierte todas las tablas importadas', async t => {
  const f = await createTestApp({ seed: false }); t.after(f.close);
  const source = await legacyFixture(f);
  // SQLite aceptaba 24:00 y 25:00 mediante GLOB; PostgreSQL exige horas válidas.
  const legacy = new Database(source);
  legacy.exec("UPDATE business_schedules SET hora_apertura = '24:00', hora_cierre = '25:00', cerrado_todo_el_dia = 0 WHERE business_id = 1 AND dia_semana = 1"); legacy.close();
  await assert.rejects(importSqlite(f.db, source), { code: '23514' });
  assert.equal((await f.db.prepare('SELECT COUNT(*) AS total FROM users').get()).total, 0);
  assert.equal((await f.db.prepare('SELECT COUNT(*) AS total FROM categories').get()).total, 0);
});
