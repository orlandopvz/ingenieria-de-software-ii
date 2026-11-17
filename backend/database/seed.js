import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import bcrypt from 'bcryptjs';
import { env } from '../src/config/env.js';
import { safePath } from '../src/utils/files.js';

const categories = [
  ['Alimentos y Comidas', 'alimentos', 'Utensils'], ['Repostería y Postres', 'reposteria', 'Cake'],
  ['Snacks y Bebidas', 'snacks', 'Coffee'], ['Bisutería y Accesorios', 'bisuteria', 'Gem'],
  ['Maquillaje y Cuidado Personal', 'maquillaje', 'Sparkles'],
  ['Artículos Personalizados y Stickers', 'personalizados', 'Palette'],
  ['Material Escolar y Electrónica', 'material-escolar', 'BookOpen'], ['Servicios y Asesorías', 'servicios', 'Briefcase']
];
const zones = [
  ['ZONA-CIENCIAS', 'Ciencias Exactas y Computación', 'Edificios 3C a 3I, 3K, 3M, 3P y 3R: Matemáticas, Computación, Física y Geología', 75, 77],
  ['ZONA-BIBLIOTECA', 'Biblioteca Central y Museo', 'Biblioteca Central, Rectoría, Vicerrectoría y Museo y Biblioteca', 79, 48],
  ['ZONA-PLAZA', 'Plaza del Estudiante y Comedor Universitario', 'Corazón del campus: Plaza del Estudiante y Comedor Universitario', 71, 51],
  ['ZONA-INGENIERIA', 'División de Ingeniería', 'Ingeniería Civil, Industrial, Química, Minas, Mecatrónica, Químico Biológicas y Servicios Escolares', 62, 75],
  ['ZONA-SOCIALES', 'Ciencias Sociales, Derecho y Contabilidad', 'Derecho, Contabilidad, Economía, Psicología, Comunicación, Sociología, Historia, Trabajo Social y Enfermería', 52, 27],
  ['ZONA-SALUD', 'Ciencias Biológicas y de la Salud', 'Medicina, Odontología y Unidad de Posgrado', 21, 86],
  ['ZONA-HUMANIDADES', 'Humanidades y Bellas Artes', 'Letras, Música, Arquitectura, Bellas Artes, Centro de las Artes y Lenguas Extranjeras', 89, 69],
  ['ZONA-DEPORTIVA', 'Área Deportiva y Gimnasio Universitario', 'Gimnasio Universitario, canchas, alberca, estadios de béisbol y Estadio Castro Servín', 23, 45],
  ['ZONA-MOVIL', 'Vendedor en Movimiento / Entrega a Acordar en Campus', 'Sin punto fijo, se desplaza entre departamentos', null, null]
];
const escapeXml = text => text.replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' })[character]);

async function mapSeries(items, operation) {
  const result = [];
  for (const [index, item] of items.entries()) result.push(await operation(item, index));
  return result;
}

export async function seedDatabase(db, config = env) {
  if ((await db.prepare('SELECT COUNT(*) AS total FROM users').get()).total !== 0) return false;
  const createdFiles = [];
  function placeholder(root, relative, label, color) {
    const target = safePath(root, relative);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    if (!fs.existsSync(target)) {
      fs.writeFileSync(target, `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="400" viewBox="0 0 640 400"><rect width="640" height="400" fill="${color}"/><text x="320" y="215" text-anchor="middle" fill="white" font-size="40" font-family="sans-serif">${escapeXml(label)}</text></svg>`, { flag: 'wx' });
      createdFiles.push(target);
    }
    return relative;
  }
  try {
    await db.transaction(async () => {
      const categoryInsert = db.prepare('INSERT INTO categories (nombre, slug, icono) VALUES (:nombre, :slug, :icono) RETURNING id');
      const categoryIds = await mapSeries(categories, async ([nombre, slug, icono]) => Number((await categoryInsert.run({ nombre, slug, icono })).insertId));
      const zoneInsert = db.prepare('INSERT INTO campus_zones (codigo, nombre, descripcion, mapa_x, mapa_y, orden_visual) VALUES (:codigo, :nombre, :descripcion, :mapa_x, :mapa_y, :orden_visual) RETURNING id');
      const zoneIds = await mapSeries(zones, async ([codigo, nombre, descripcion, mapa_x, mapa_y], index) => Number((await zoneInsert.run({ codigo, nombre, descripcion, mapa_x, mapa_y, orden_visual: index + 1 })).insertId));
      const insertUser = db.prepare(`INSERT INTO users (nombre_completo, email_institucional, matricula_unison, password_hash, credencial_path, rol, estado_cuenta, motivo_estado, resuelto_por, fecha_resolucion)
        VALUES (:nombre_completo, :email_institucional, :matricula_unison, :password_hash, :credencial_path, :rol, :estado_cuenta, :motivo_estado, :resuelto_por, :fecha_resolucion) RETURNING id`);
      const adminId = Number((await insertUser.run({ nombre_completo: 'Administrador EmprendeBúho', email_institucional: 'admin@unison.mx', matricula_unison: null,
        password_hash: bcrypt.hashSync('AdminUnison2026!', 10), credencial_path: null, rol: 'admin', estado_cuenta: 'aprobada', motivo_estado: null, resuelto_por: null, fecha_resolucion: null })).insertId);
      const demoHash = bcrypt.hashSync('Buho2026!', 10);
      const demoUsers = [
        ['Fernanda Demo', 'fernanda.demo@unison.mx', '221200001', 'aprobada'],
        ['Orlando Demo', 'orlando.demo@unison.mx', '221200002', 'aprobada'],
        ['Nuevo Emprendedor', 'nuevo.emprendedor@unison.mx', '221200003', 'pendiente'],
        ['Emprendedor Rechazado', 'rechazado.demo@unison.mx', '221200004', 'rechazada']
      ];
      const userIds = await mapSeries(demoUsers, async ([nombre_completo, email_institucional, matricula_unison, estado_cuenta], index) => {
        const credencial_path = placeholder(config.STORAGE_DIR, `credentials/demo-${index + 1}.svg`, `DEMO ${index + 1}`, '#002D62');
        return Number((await insertUser.run({ nombre_completo, email_institucional, matricula_unison, estado_cuenta, password_hash: demoHash, credencial_path,
          rol: 'emprendedor', motivo_estado: estado_cuenta === 'rechazada' ? 'La credencial no es legible' : null,
          resuelto_por: estado_cuenta === 'pendiente' ? null : adminId,
          fecha_resolucion: estado_cuenta === 'pendiente' ? null : new Date().toISOString().slice(0, 19).replace('T', ' ') })).insertId);
      });
      const businessInsert = db.prepare(`INSERT INTO businesses (user_id, category_id, campus_zone_id, nombre_negocio, slug, descripcion, foto_perfil_url, foto_menu_url, esta_abierto, mostrar_ubicacion, ubicacion_detalle)
        VALUES (:user_id, :category_id, :campus_zone_id, :nombre_negocio, :slug, :descripcion, :foto_perfil_url, :foto_menu_url, :esta_abierto, :mostrar_ubicacion, :ubicacion_detalle) RETURNING id`);
      const businessNames = ['Búho Brownies & Postres', 'Stickers y Pines Cholesky', 'Emprendimiento Nuevo', 'Emprendimiento Rechazado'];
      const slugs = ['buho-brownies-postres', 'stickers-y-pines-cholesky', 'emprendimiento-nuevo', 'emprendimiento-rechazado'];
      const colors = ['#7C3AED', '#004B9B', '#166534', '#475569'];
      const businessIds = await mapSeries(userIds, async (user_id, index) => {
        const profile = placeholder(config.UPLOAD_DIR, `profiles/demo-${index + 1}.svg`, index === 0 ? 'BB' : 'EB', colors[index]);
        const menu = index === 0 ? placeholder(config.UPLOAD_DIR, 'menus/demo-1.svg', 'Menú de postres', colors[index]) : null;
        return Number((await businessInsert.run({ user_id, category_id: categoryIds[index === 1 ? 5 : 1], campus_zone_id: index === 0 ? zoneIds[0] : index === 1 ? zoneIds[2] : null,
          nombre_negocio: businessNames[index], slug: slugs[index], descripcion: index === 0 ? 'Brownies y postres caseros para compartir en el campus.' : 'Emprendimiento estudiantil de demostración.',
          foto_perfil_url: '/uploads/' + profile, foto_menu_url: menu ? '/uploads/' + menu : null,
          esta_abierto: index === 0 ? 1 : 0, mostrar_ubicacion: index === 0 ? 1 : 0,
          ubicacion_detalle: index === 0 ? 'Mesas frente al edificio 3K' : index === 1 ? 'Plaza del Estudiante' : '' })).insertId);
      });
      const scheduleInsert = db.prepare(`INSERT INTO business_schedules (business_id, dia_semana, hora_apertura, hora_cierre, cerrado_todo_el_dia)
        VALUES (:business_id, :dia_semana, :hora_apertura, :hora_cierre, :cerrado_todo_el_dia)`);
      await mapSeries(businessIds, async (business_id, index) => {
        for (let dia_semana = 0; dia_semana < 7; dia_semana += 1) {
          const active = index === 0 ? dia_semana >= 1 && dia_semana <= 5 : index === 1 && [1, 3, 5].includes(dia_semana);
          await scheduleInsert.run({ business_id, dia_semana, hora_apertura: active ? (index === 0 ? '08:00' : '10:00') : null,
            hora_cierre: active ? (index === 0 ? '15:00' : '14:00') : null, cerrado_todo_el_dia: active ? 0 : 1 });
        }
      });
      const contactInsert = db.prepare('INSERT INTO business_contacts (business_id, tipo_contacto, valor, es_principal, orden) VALUES (:business_id, :tipo_contacto, :valor, :es_principal, :orden) RETURNING id');
      await contactInsert.run({ business_id: businessIds[0], tipo_contacto: 'whatsapp', valor: '6621234567', es_principal: 1, orden: 0 });
      await contactInsert.run({ business_id: businessIds[0], tipo_contacto: 'instagram', valor: 'buho.brownies.demo', es_principal: 0, orden: 1 });
      const productInsert = db.prepare(`INSERT INTO products (business_id, nombre, descripcion, precio, imagen_url, estado, motivo_moderacion, moderado_por, moderado_at)
        VALUES (:business_id, :nombre, :descripcion, :precio, :imagen_url, :estado, :motivo_moderacion, :moderado_por, :moderado_at) RETURNING id`);
      const productData = [
        [0, 'Brownie clásico', 20, 'activo'], [0, 'Pay de Limón', 35, 'activo'], [0, 'Brownie con nuez', 40, 'activo'],
        [0, 'Caja de postres', 60, 'activo'], [0, 'Galleta especial', 25, 'pausado'],
        [1, 'Sticker Búho', 10, 'activo'], [1, 'Pin universitario', 50, 'activo'], [1, 'Paquete personalizado', 250, 'activo'],
        [1, 'Sticker en revisión', 30, 'oculto_admin']
      ];
      const productIds = await mapSeries(productData, async ([index, nombre, precio, estado], number) => {
        const image = placeholder(config.UPLOAD_DIR, `products/demo-${number + 1}.svg`, nombre, colors[index]);
        return Number((await productInsert.run({ business_id: businessIds[index], nombre, descripcion: `${nombre}, elaborado por estudiantes UNISON.`, precio,
          imagen_url: '/uploads/' + image, estado, motivo_moderacion: estado === 'oculto_admin' ? 'Revisar el contenido de la imagen antes de publicar.' : null,
          moderado_por: estado === 'oculto_admin' ? adminId : null, moderado_at: estado === 'oculto_admin' ? new Date().toISOString().slice(0, 19).replace('T', ' ') : null })).insertId);
      });
      const reportInsert = db.prepare('INSERT INTO reports (business_id, product_id, motivo, descripcion, ip_hash) VALUES (:business_id, :product_id, :motivo, :descripcion, :ip_hash) RETURNING id');
      for (let index = 0; index < 2; index += 1) await reportInsert.run({ business_id: businessIds[1], product_id: index === 0 ? productIds[8] : null,
        motivo: index === 0 ? 'contenido_inapropiado' : 'informacion_falsa', descripcion: index === 0 ? 'Solicito revisar la imagen publicada.' : 'Solicito verificar la información del negocio.',
        ip_hash: createHash('sha256').update(`demo-${index}${config.REPORT_IP_SALT}`).digest('hex') });
    });
    return true;
  } catch (error) {
    for (const file of createdFiles) fs.unlinkSync(file);
    throw error;
  }
}
