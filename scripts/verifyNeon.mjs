import assert from 'node:assert/strict';
import { once } from 'node:events';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';
import { env } from '../backend/src/config/env.js';
import { createDatabase } from '../backend/src/config/db.js';
import { createTestApp } from '../backend/tests/helpers/testApp.js';

// Comprueba el servicio remoto sin sembrar ni modificar el esquema público.
const hostname = new URL(env.DATABASE_URL).hostname;
if (['localhost', '127.0.0.1', '::1', '[::1]'].includes(hostname)) {
  throw new Error('Configura las variables descargadas por neon deploy antes de verificar el servicio remoto.');
}
const runtime = createDatabase(env);
let fixture; let server; let frontend;
try {
  const result = await runtime.prepare('SELECT current_database() AS database').get();
  assert(result.database);
  console.log('PASS conexión PostgreSQL remota con DATABASE_URL de la aplicación');

  process.env.TEST_DATABASE_URL = env.DATABASE_URL_UNPOOLED ?? env.DATABASE_URL;
  fixture = await createTestApp();
  server = fixture.app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const backendUrl = `http://127.0.0.1:${server.address().port}`;
  frontend = await createServer({ root: fileURLToPath(new URL('../frontend/', import.meta.url)),
    server: { host: '127.0.0.1', port: 0, proxy: { '/api': backendUrl, '/uploads': backendUrl } } });
  await frontend.listen();
  const frontendUrl = `http://127.0.0.1:${frontend.httpServer.address().port}`;
  const page = await fetch(frontendUrl);
  assert.equal(page.status, 200); assert.match(await page.text(), /id="root"/);
  console.log('PASS frontend Vite iniciado y servido por HTTP');

  async function api(path, { method = 'GET', body, token, expected = 200 } = {}) {
    const response = await fetch(`${frontendUrl}/api${path}`, { method,
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: body === undefined ? undefined : JSON.stringify(body) });
    const result = await response.json();
    assert.equal(response.status, expected, `Respuesta inesperada en ${method} ${path}`);
    assert.equal(result.ok, true);
    return result.data;
  }
  const catalogs = await api('/catalogs'); assert.equal(catalogs.categories.length, 8);
  console.log('PASS navegador HTTP → proxy frontend → API Express → catálogos en PostgreSQL remoto');
  const account = await api('/auth/login', { method: 'POST', body: { identificador: 'fernanda.demo@unison.mx', password: 'Buho2026!' } });
  const token = account.token; assert(token);
  const profile = await api('/my-business/profile', { method: 'PUT', token,
    body: { nombre_negocio: 'Búho Neon Verificación', category_id: catalogs.categories[1].id, descripcion: 'Verificación de conexión remota.' } });
  assert.equal(profile.nombre_negocio, 'Búho Neon Verificación');
  const independent = createDatabase(fixture.config);
  try {
    const persisted = await independent.prepare('SELECT nombre_negocio FROM businesses WHERE id = :id').get({ id: profile.id });
    assert.equal(persisted.nombre_negocio, profile.nombre_negocio);
  } finally { await independent.close(); }
  const detail = await api(`/businesses/${profile.slug}`); assert.equal(detail.nombre_negocio, profile.nombre_negocio);
  console.log('PASS login JWT, escritura por HTTP y lectura confirmada desde otra conexión PostgreSQL');
  await api('/my-business/location', { method: 'PATCH', token, body: { mostrar_ubicacion: false } });
  const hidden = await api(`/businesses/${profile.slug}`);
  for (const key of ['campus_zone_id', 'zona_codigo', 'zona_nombre', 'ubicacion_detalle']) assert.equal(hidden[key], null);
  console.log('PASS privacidad de ubicación por la API pública');
  console.log('PASS servicio postgres probado de extremo a extremo; datos demo aislados del esquema público');
} catch (error) {
  console.error('FAIL verificación Neon:', error instanceof assert.AssertionError ? error.message : 'Revisa la conexión, permisos y entorno. No se imprimen credenciales.');
  process.exitCode = 1;
} finally {
  if (frontend) await frontend.close();
  if (server) await new Promise(resolve => server.close(resolve));
  if (fixture) await fixture.close();
  await runtime.close();
}
