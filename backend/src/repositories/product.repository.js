export function createProductRepository(db) {
  return {
    list: async business_id => (await db.prepare("SELECT * FROM products WHERE business_id = :business_id AND estado <> 'eliminado' ORDER BY id DESC").all({ business_id })),
    find: async (business_id, id) => (await db.prepare("SELECT * FROM products WHERE id = :id AND business_id = :business_id AND estado <> 'eliminado'").get({ business_id, id })),
    insert: async params => Number((await db.prepare('INSERT INTO products (business_id, nombre, descripcion, precio, imagen_url) VALUES (:business_id, :nombre, :descripcion, :precio, :imagen_url) RETURNING id').run(params)).insertId),
    edit: async params => (await db.prepare(`UPDATE products SET nombre = :nombre, descripcion = :descripcion, precio = :precio, imagen_url = :imagen_url,
      updated_at = CASE WHEN estado = 'oculto_admin' AND CURRENT_TIMESTAMP <= moderado_at THEN (moderado_at + INTERVAL '1 second') ELSE CURRENT_TIMESTAMP END
      WHERE id = :id AND business_id = :business_id`).run(params)),
    status: async params => (await db.prepare('UPDATE products SET estado = :estado WHERE id = :id AND business_id = :business_id').run(params)),
    remove: async (business_id, id) => (await db.prepare("UPDATE products SET estado = 'eliminado', imagen_url = NULL WHERE id = :id AND business_id = :business_id").run({ business_id, id }))
  };
}
