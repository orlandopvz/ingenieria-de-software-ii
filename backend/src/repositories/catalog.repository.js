export function createCatalogRepository(db) {
  return {
    categories: async () => (await db.prepare('SELECT id, nombre, slug, descripcion, icono FROM categories WHERE activa = 1 ORDER BY id').all()),
    zones: async () => (await db.prepare('SELECT id, codigo, nombre, descripcion, mapa_x, mapa_y, orden_visual FROM campus_zones WHERE activa = 1 ORDER BY orden_visual, id').all()),
    activeCategory: async id => (await db.prepare('SELECT id FROM categories WHERE id = :id AND activa = 1').get({ id })),
    zone: async id => (await db.prepare('SELECT mapa_x, mapa_y FROM campus_zones WHERE id = :id AND activa = 1').get({ id }))
  };
}
