import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import request from 'supertest';
import { loadEnv } from '../src/config/env.js';
import { createApp } from '../src/app.js';
import { createCredentialImage, publicImage } from '../src/config/upload.js';
import { createMaintenanceService } from '../src/services/maintenance.service.js';
import { errorHandler } from '../src/middlewares/error.middleware.js';
import express from 'express';
import net from 'node:net';

const cloudConfig = extra => loadEnv({ VERCEL: '1', DATABASE_URL: 'postgresql://test@localhost/test',
  JWT_SECRET: 's'.repeat(32), REPORT_IP_SALT: 'r'.repeat(16), VERCEL_URL: 'preview.example.vercel.app',
  VERCEL_PROJECT_PRODUCTION_URL: 'production.example.vercel.app', ...extra });

test('Vercel: importar la entrada no escribe archivos ni abre puertos', async t => {
  t.mock.method(fs, 'mkdirSync', () => { throw new Error('No se permite escribir al importar.'); });
  const listener = t.mock.method(net.Server.prototype, 'listen', () => { throw new Error('No se permite abrir puerto al importar.'); });
  const { default: app } = await import('../src/index.js');
  listener.mock.restore();
  assert.equal(typeof app, 'function');
  const response = await request(app).get('/api/health').expect(200);
  assert.equal(response.body.data.estado, 'disponible');
  assert.equal(response.headers['x-powered-by'], undefined);
  await request(app).get('/health').expect(404);
  await request(app).get('/storage/credentials/archivo.png').expect(404);
});

test('Vercel: CORS acepta solo los dominios configurados de producción y preview', async () => {
  const app = createApp({ config: cloudConfig() });
  for (const origin of ['https://preview.example.vercel.app', 'https://production.example.vercel.app']) {
    const response = await request(app).get('/api/health').set('Origin', origin).expect(200);
    assert.equal(response.headers['access-control-allow-origin'], origin);
  }
  await request(app).get('/api/health').set('Origin', 'https://otra-preview.vercel.app').expect(403);
  await request(app).get('/api/health').set('Origin', 'https://production.example.vercel.app.atacante.test').expect(403);
  const config = cloudConfig({ VERCEL_URL: 'example.vercel.app/ataque' });
  assert(!config.CORS_ORIGINS.includes('https://example.vercel.app/ataque'));
});

test('Vercel: exige URL PostgreSQL explícita y mantiene secretos fuera de valores predeterminados', () => {
  assert.throws(() => cloudConfig({ DATABASE_URL: undefined }), /DATABASE_URL/);
  assert.throws(() => cloudConfig({ JWT_SECRET: undefined }), /JWT_SECRET/);
  assert.throws(() => cloudConfig({ REPORT_IP_SALT: undefined }), /REPORT_IP_SALT/);
  assert.equal(cloudConfig().PORT, 4000);
  assert.equal(cloudConfig().NODE_ENV, 'production');
});

test('Vercel: no guarda imágenes ni credenciales en almacenamiento efímero', async t => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'emprendebuho-vercel-'));
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  const config = { ...cloudConfig(), UPLOAD_DIR: path.join(directory, 'uploads'), STORAGE_DIR: path.join(directory, 'storage') };
  const app = express();
  app.post('/credencial', createCredentialImage(config).single('imagen'), (req, res) => res.sendStatus(201));
  app.post('/publica', publicImage('profiles', config).single('imagen'), (req, res) => res.sendStatus(201));
  app.use(errorHandler);
  for (const route of ['/credencial', '/publica']) {
    const response = await request(app).post(route).attach('imagen', Buffer.from('imagen'), { filename: 'x.png', contentType: 'image/png' }).expect(409);
    assert.equal(response.body.error.code, 'CONFLICT');
  }
  assert.deepEqual(fs.readdirSync(directory), []);
  await assert.rejects(createMaintenanceService({ prepare: () => ({}) }, config).backup(1), { code: 'CONFLICT' });
});
