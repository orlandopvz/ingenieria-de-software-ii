import { normalizar, escapeLike } from '../utils/text.js';
const userFields = 'u.id, u.nombre_completo, u.email_institucional, u.matricula_unison, u.rol, u.estado_cuenta, u.motivo_estado, u.suspendida_hasta, u.created_at, u.fecha_resolucion';
export const databaseTables = Object.freeze(['users', 'categories', 'campus_zones', 'businesses', 'business_schedules', 'business_contacts', 'products', 'reports', 'notifications', 'password_reset_tokens', 'audit_logs']);
export function createAdminRepository(db) {
  const list = async (select, from, where, params) => ({
    items: await db.prepare(`${select} ${from} ${where} ORDER BY 1 DESC LIMIT :limit OFFSET :offset`).all(params),
    total: (await db.prepare(`SELECT COUNT(*) AS total ${from} ${where}`).get(params)).total
  });
  return {
    requests(query) {
      return list(`SELECT ${userFields}, b.id AS business_id, b.nombre_negocio, b.slug, c.nombre AS category_nombre`,
        'FROM users u LEFT JOIN businesses b ON b.user_id = u.id LEFT JOIN categories c ON c.id = b.category_id',
        String.raw`WHERE u.rol = 'emprendedor' AND u.estado_cuenta = :status AND (CAST(:q_like AS text) IS NULL OR normalizar(u.nombre_completo) LIKE :q_like ESCAPE '\' OR normalizar(u.email_institucional) LIKE :q_like ESCAPE '\' OR u.matricula_unison LIKE :q_like ESCAPE '\' OR normalizar(b.nombre_negocio) LIKE :q_like ESCAPE '\')`, query);
    },
    user: async id => (await db.prepare(`SELECT ${userFields}, b.id AS business_id FROM users u LEFT JOIN businesses b ON b.user_id = u.id WHERE u.id = :id`).get({ id })),
    credential: async id => (await db.prepare("SELECT credencial_path FROM users WHERE id = :id AND rol = 'emprendedor'").get({ id })),
    decision: async params => (await db.prepare(`UPDATE users SET estado_cuenta = :decision, motivo_estado = :motivo, resuelto_por = :actor_id,
      fecha_resolucion = CURRENT_TIMESTAMP, token_version = token_version + 1 WHERE id = :id`).run(params)),
    suspend: async params => (await db.prepare(`UPDATE users SET estado_cuenta = :estado_cuenta, motivo_estado = :motivo, suspendida_hasta = :hasta,
      token_version = token_version + 1 WHERE id = :id`).run(params)),
    closeBusiness: async user_id => (await db.prepare('UPDATE businesses SET esta_abierto = 0 WHERE user_id = :user_id').run({ user_id })),
    product: async id => (await db.prepare("SELECT p.*, b.user_id, b.nombre_negocio FROM products p JOIN businesses b ON b.id = p.business_id WHERE p.id = :id AND p.estado <> 'eliminado'").get({ id })),
    products(query) {
      return list(`SELECT p.*, b.nombre_negocio, (p.moderado_at IS NOT NULL AND p.updated_at > p.moderado_at) AS editado_tras_moderacion`,
        'FROM products p JOIN businesses b ON b.id = p.business_id',
        String.raw`WHERE p.estado <> 'eliminado' AND (CAST(:estado AS text) IS NULL OR p.estado = :estado) AND (CAST(:business_id AS integer) IS NULL OR p.business_id = :business_id)
          AND (CAST(:q_like AS text) IS NULL OR normalizar(p.nombre) LIKE :q_like ESCAPE '\' OR normalizar(b.nombre_negocio) LIKE :q_like ESCAPE '\')`, query);
    },
    moderate: async params => (await db.prepare(`UPDATE products SET estado = :estado, motivo_moderacion = :motivo,
      moderado_por = :actor_id, moderado_at = CASE WHEN :estado = 'oculto_admin' THEN CURRENT_TIMESTAMP ELSE NULL END,
      updated_at = CURRENT_TIMESTAMP WHERE id = :id`).run(params)),
    report: async id => (await db.prepare('SELECT r.*, b.user_id FROM reports r JOIN businesses b ON b.id = r.business_id WHERE r.id = :id').get({ id })),
    reports(query) {
      return list(`SELECT r.id, r.business_id, r.product_id, r.motivo, r.descripcion, r.estado_reporte, r.accion_tomada, r.notas_admin,
        r.resuelto_por, r.created_at, r.resolved_at, b.nombre_negocio, b.slug, u.estado_cuenta, p.nombre AS producto_nombre,
        (SELECT COUNT(*) FROM reports all_reports WHERE all_reports.business_id = r.business_id) AS reportes_del_negocio`,
        'FROM reports r JOIN businesses b ON b.id = r.business_id JOIN users u ON u.id = b.user_id LEFT JOIN products p ON p.id = r.product_id',
        'WHERE (CAST(:estado AS text) IS NULL OR r.estado_reporte = :estado) AND (CAST(:business_id AS integer) IS NULL OR r.business_id = :business_id)', query);
    },
    resolve: async params => (await db.prepare(`UPDATE reports SET estado_reporte = :estado_reporte, accion_tomada = :accion_automatica, notas_admin = :notas_admin,
      resuelto_por = :actor_id, resolved_at = CURRENT_TIMESTAMP WHERE id = :id`).run(params)),
    categories: async () => (await db.prepare('SELECT c.*, (SELECT COUNT(*) FROM businesses b WHERE b.category_id = c.id) AS negocios_count FROM categories c ORDER BY c.id').all()),
    category: async id => (await db.prepare('SELECT * FROM categories WHERE id = :id').get({ id })),
    categorySlugExists: async (slug, id) => Boolean((await db.prepare('SELECT id FROM categories WHERE slug = :slug AND id <> :id').get({ slug, id }))),
    createCategory: async params => Number((await db.prepare('INSERT INTO categories (nombre, slug, descripcion, icono, activa) VALUES (:nombre, :slug, :descripcion, :icono, :activa) RETURNING id').run(params)).insertId),
    editCategory: async params => (await db.prepare('UPDATE categories SET nombre = :nombre, slug = :slug, descripcion = :descripcion, icono = :icono, activa = :activa WHERE id = :id').run(params)),
    stats: async () => (await db.prepare(`SELECT
      (SELECT COUNT(*) FROM users WHERE rol = 'emprendedor' AND estado_cuenta = 'pendiente') AS solicitudes_pendientes,
      (SELECT COUNT(*) FROM users WHERE rol = 'emprendedor' AND estado_cuenta = 'aprobada') AS cuentas_aprobadas,
      (SELECT COUNT(*) FROM users WHERE rol = 'emprendedor' AND estado_cuenta = 'suspendida') AS cuentas_suspendidas,
      (SELECT COUNT(*) FROM businesses b JOIN users u ON u.id = b.user_id WHERE u.rol = 'emprendedor' AND u.estado_cuenta = 'aprobada' AND b.inactivo_oculto = 0 AND b.esta_abierto = 1) AS negocios_abiertos,
      (SELECT COUNT(*) FROM businesses WHERE inactivo_oculto = 1) AS negocios_inactivos,
      (SELECT COUNT(*) FROM products WHERE estado = 'oculto_admin') AS productos_ocultos,
      (SELECT COUNT(*) FROM reports WHERE estado_reporte IN ('pendiente', 'en_revision')) AS reportes_pendientes`).get()),
    hideInactive: async dias => (await db.prepare("UPDATE businesses SET inactivo_oculto = 1, esta_abierto = 0 WHERE inactivo_oculto = 0 AND last_activity_at < (CURRENT_TIMESTAMP - CAST(:dias AS integer) * INTERVAL '1 day')").run({ dias })).changes,
    inactiveCount: async dias => (await db.prepare("SELECT COUNT(*) AS total FROM businesses WHERE inactivo_oculto = 0 AND last_activity_at < (CURRENT_TIMESTAMP - CAST(:dias AS integer) * INTERVAL '1 day')").get({ dias })).total,
    expiredSuspensions: async () => (await db.prepare("SELECT id FROM users WHERE rol = 'emprendedor' AND estado_cuenta = 'suspendida' AND suspendida_hasta <= CURRENT_TIMESTAMP").all()),
    reactivate: async id => (await db.prepare("UPDATE users SET estado_cuenta = 'aprobada', motivo_estado = NULL, suspendida_hasta = NULL WHERE id = :id").run({ id })),
    databaseSize: async () => (await db.prepare('SELECT pg_database_size(current_database()) AS size_bytes').get()).size_bytes,
    counts: async () => Object.fromEntries(await Promise.all(databaseTables.map(async table => [table, (await db.prepare(`SELECT COUNT(*) AS total FROM ${table}`).get()).total]))),
    referencedUploads: async () => (await db.prepare(`SELECT foto_perfil_url AS url FROM businesses WHERE foto_perfil_url IS NOT NULL
      UNION SELECT foto_menu_url FROM businesses WHERE foto_menu_url IS NOT NULL UNION SELECT imagen_url FROM products WHERE imagen_url IS NOT NULL`).all()).map(row => row.url)
  };
}
export function adminListParams(query) {
  return { ...query, q_like: query.q ? `%${escapeLike(normalizar(query.q))}%` : null, estado: query.estado ?? null,
    business_id: query.business_id ?? null, offset: (query.page - 1) * query.limit };
}
