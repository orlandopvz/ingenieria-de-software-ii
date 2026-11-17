import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { loadEnvironmentFiles, loadEnv } from '../src/config/env.js';

test('Neon: el entorno descargado prevalece sobre backend/.env y respeta variables del proceso', t => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'emprendebuho-neon-env-'));
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  const backend = path.join(directory, 'backend'); fs.mkdirSync(backend);
  fs.writeFileSync(path.join(directory, '.env.local'), 'DATABASE_URL=postgresql://pooled/neon\nDATABASE_URL_UNPOOLED=postgresql://direct/neon\n');
  fs.writeFileSync(path.join(directory, '.env'), 'DATABASE_URL=postgresql://older/neon\nJWT_EXPIRES_IN=2d\n');
  fs.writeFileSync(path.join(backend, '.env'), 'DATABASE_URL=postgresql://local/old\nJWT_SECRET=' + 's'.repeat(32) + '\nREPORT_IP_SALT=' + 'r'.repeat(16) + '\n');
  const source = {};
  loadEnvironmentFiles(source, backend);
  assert.equal(source.DATABASE_URL, 'postgresql://pooled/neon');
  assert.equal(source.DATABASE_URL_UNPOOLED, 'postgresql://direct/neon');
  assert.equal(loadEnv(source).JWT_EXPIRES_IN, '2d');
  const injected = { DATABASE_URL: 'postgresql://injected/priority' };
  loadEnvironmentFiles(injected, backend);
  assert.equal(injected.DATABASE_URL, 'postgresql://injected/priority');
  assert.equal(injected.DATABASE_URL_UNPOOLED, 'postgresql://direct/neon');
});

test('Neon: admite .env en la raíz cuando CLI no escribe .env.local', t => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'emprendebuho-neon-env-'));
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  const backend = path.join(directory, 'backend'); fs.mkdirSync(backend);
  fs.writeFileSync(path.join(directory, '.env'), 'DATABASE_URL=postgresql://root/neon\n');
  fs.writeFileSync(path.join(backend, '.env'), 'DATABASE_URL=postgresql://backend/local\n');
  const source = {};
  loadEnvironmentFiles(source, backend);
  assert.equal(source.DATABASE_URL, 'postgresql://root/neon');
});
