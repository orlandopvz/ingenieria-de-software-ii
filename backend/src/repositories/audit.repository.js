export function createAuditRepository(db) {
  const insert = db.prepare('INSERT INTO audit_logs (actor_id, accion, entidad_tipo, entidad_id, detalles) VALUES (:actor_id, :accion, :entidad_tipo, :entidad_id, :detalles) RETURNING id');
  return {
    record: async (actor_id, accion, entidad_tipo, entidad_id = null, detalles = null) => (await insert.run({ actor_id, accion, entidad_tipo, entidad_id, detalles: detalles === null ? null : JSON.stringify(detalles) })),
    async list(params) {
      const where = 'WHERE (CAST(:accion AS text) IS NULL OR accion = :accion) AND (CAST(:entidad_tipo AS text) IS NULL OR entidad_tipo = :entidad_tipo)';
      return { items: await db.prepare(`SELECT * FROM audit_logs ${where} ORDER BY id DESC LIMIT :limit OFFSET :offset`).all(params),
        total: (await db.prepare(`SELECT COUNT(*) AS total FROM audit_logs ${where}`).get(params)).total };
    }
  };
}
