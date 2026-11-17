// Conserva el contrato usado por F1 y agrega las operaciones de cuenta de F2A.
export function createUserRepository(db) {
  const find = db.prepare(`SELECT u.id, u.rol, u.estado_cuenta, u.motivo_estado, u.suspendida_hasta, u.token_version,
    b.id AS "businessId" FROM users u LEFT JOIN businesses b ON b.user_id = u.id WHERE u.id = :sub`);
  const reactivate = db.prepare(`UPDATE users SET estado_cuenta = 'aprobada', motivo_estado = NULL, suspendida_hasta = NULL
    WHERE id = :id AND estado_cuenta = 'suspendida' AND suspendida_hasta IS NOT NULL
      AND suspendida_hasta <= CURRENT_TIMESTAMP`);
  const audit = db.prepare(`INSERT INTO audit_logs (actor_id, accion, entidad_tipo, entidad_id, detalles)
    VALUES (NULL, 'reactivar_cuenta', 'user', :id, :detalles) RETURNING id`);
  return {
    findForAuth: async sub => (await find.get({ sub })),
    reactivateExpired: async id => (await reactivate.run({ id })).changes > 0,
    auditReactivation: async id => (await audit.run({ id, detalles: JSON.stringify({ motivo: 'Suspensión temporal vencida' }) })),
    byId: async id => (await db.prepare('SELECT * FROM users WHERE id = :id').get({ id })),
    byIdentifier: async identificador => (await db.prepare('SELECT * FROM users WHERE lower(email_institucional) = lower(:identificador) OR matricula_unison = :identificador').get({ identificador })),
    byEmail: async email => (await db.prepare('SELECT * FROM users WHERE lower(email_institucional) = lower(:email)').get({ email })),
    matching: async params => (await db.prepare('SELECT * FROM users WHERE lower(email_institucional) = lower(:email_institucional) OR matricula_unison = :matricula_unison').all(params)),
    insert: async params => Number((await db.prepare(`INSERT INTO users (nombre_completo, email_institucional, matricula_unison, password_hash, credencial_path)
      VALUES (:nombre_completo, :email_institucional, :matricula_unison, :password_hash, :credencial_path) RETURNING id`).run(params)).insertId),
    reuse: async params => (await db.prepare(`UPDATE users SET nombre_completo = :nombre_completo, email_institucional = :email_institucional,
      matricula_unison = :matricula_unison, password_hash = :password_hash, credencial_path = :credencial_path,
      estado_cuenta = 'pendiente', motivo_estado = NULL, suspendida_hasta = NULL, resuelto_por = NULL,
      fecha_resolucion = NULL, last_login_at = NULL, token_version = token_version + 1 WHERE id = :id`).run(params)),
    business: async user_id => (await db.prepare('SELECT * FROM businesses WHERE user_id = :user_id').get({ user_id })),
    slugExists: async (slug, user_id) => Boolean((await db.prepare('SELECT id FROM businesses WHERE slug = :slug AND user_id <> :user_id').get({ slug, user_id }))),
    insertBusiness: async params => Number((await db.prepare(`INSERT INTO businesses (user_id, nombre_negocio, slug, category_id, descripcion)
      VALUES (:user_id, :nombre_negocio, :slug, :category_id, :descripcion) RETURNING id`).run(params)).insertId),
    updateBusiness: async params => (await db.prepare(`UPDATE businesses SET nombre_negocio = :nombre_negocio, slug = :slug, category_id = :category_id,
      descripcion = :descripcion, esta_abierto = 0, mostrar_ubicacion = 0, inactivo_oculto = 0, last_activity_at = CURRENT_TIMESTAMP
      WHERE user_id = :user_id`).run(params)),
    insertSchedule: async params => (await db.prepare('INSERT INTO business_schedules (business_id, dia_semana) VALUES (:business_id, :dia_semana)').run(params)),
    touchLogin: async id => (await db.prepare('UPDATE users SET last_login_at = CURRENT_TIMESTAMP WHERE id = :id').run({ id })),
    touchActivity: async user_id => (await db.prepare('UPDATE businesses SET last_activity_at = CURRENT_TIMESTAMP, inactivo_oculto = 0 WHERE user_id = :user_id').run({ user_id })),
    requestStatus: async params => (await db.prepare(`SELECT u.estado_cuenta, u.motivo_estado, u.suspendida_hasta, u.created_at, u.fecha_resolucion, b.nombre_negocio
      FROM users u LEFT JOIN businesses b ON b.user_id = u.id WHERE lower(u.email_institucional) = lower(:email_institucional) AND u.matricula_unison = :matricula_unison`).get(params)),
    invalidateResetCodes: async user_id => (await db.prepare('UPDATE password_reset_tokens SET usado = 1 WHERE user_id = :user_id AND usado = 0').run({ user_id })),
    insertResetCode: async params => (await db.prepare("INSERT INTO password_reset_tokens (user_id, codigo_hash, expires_at) VALUES (:user_id, :codigo_hash, (CURRENT_TIMESTAMP + INTERVAL '15 minutes')) RETURNING id").run(params)),
    activeResetCode: async user_id => (await db.prepare(`SELECT * FROM password_reset_tokens WHERE user_id = :user_id AND usado = 0
      AND expires_at > CURRENT_TIMESTAMP AND intentos < 5 ORDER BY id DESC LIMIT 1`).get({ user_id })),
    failedReset: async id => (await db.prepare('UPDATE password_reset_tokens SET intentos = intentos + 1, usado = CASE WHEN intentos + 1 >= 5 THEN 1 ELSE usado END WHERE id = :id').run({ id })),
    changePassword: async params => (await db.prepare('UPDATE users SET password_hash = :password_hash, token_version = token_version + 1 WHERE id = :id').run(params)),
    deleteAccount: async id => (await db.prepare("UPDATE users SET estado_cuenta = 'eliminada', token_version = token_version + 1 WHERE id = :id").run({ id })),
    closeBusiness: async user_id => (await db.prepare('UPDATE businesses SET esta_abierto = 0, mostrar_ubicacion = 0 WHERE user_id = :user_id').run({ user_id })),
    auditDeletion: async id => (await db.prepare("INSERT INTO audit_logs (actor_id, accion, entidad_tipo, entidad_id) VALUES (:id, 'eliminar_cuenta', 'user', :id) RETURNING id").run({ id }))
  };
}
