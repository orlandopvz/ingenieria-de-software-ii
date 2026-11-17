export const businessSelect = String.raw`SELECT
  b.id, b.nombre_negocio, b.slug, b.descripcion, b.foto_perfil_url, b.foto_menu_url,
  b.esta_abierto, b.mostrar_ubicacion, b.updated_at,
  c.id AS category_id, c.nombre AS category_nombre, c.slug AS category_slug, c.icono AS category_icono,
  CASE WHEN b.mostrar_ubicacion = 1 THEN z.id END AS campus_zone_id,
  CASE WHEN b.mostrar_ubicacion = 1 THEN z.codigo END AS zona_codigo,
  CASE WHEN b.mostrar_ubicacion = 1 THEN z.nombre END AS zona_nombre,
  CASE WHEN b.mostrar_ubicacion = 1 THEN b.ubicacion_detalle END AS ubicacion_detalle,
  (SELECT MIN(p.precio) FROM products p WHERE p.business_id = b.id AND p.estado = 'activo') AS precio_minimo,
  (SELECT MAX(p.precio) FROM products p WHERE p.business_id = b.id AND p.estado = 'activo') AS precio_maximo,
  EXISTS (SELECT 1 FROM business_schedules s WHERE s.business_id = b.id AND s.dia_semana = :now_dow
    AND s.cerrado_todo_el_dia = 0 AND s.hora_apertura <= :now_time AND :now_time < s.hora_cierre) AS en_horario_ahora,
  CASE WHEN b.mostrar_ubicacion = 1 THEN z.mapa_x END AS _mapa_x,
  CASE WHEN b.mostrar_ubicacion = 1 THEN z.mapa_y END AS _mapa_y`;
export const businessJoins = `FROM businesses b JOIN users u ON u.id = b.user_id
  JOIN categories c ON c.id = b.category_id LEFT JOIN campus_zones z ON z.id = b.campus_zone_id`;
export const visibleBusiness = "u.estado_cuenta = 'aprobada' AND u.rol = 'emprendedor' AND b.inactivo_oculto = 0";
const filters = String.raw`WHERE ${visibleBusiness}
  AND (CAST(:ids_json AS text) IS NULL OR b.id IN (SELECT value::integer FROM json_array_elements_text(CAST(:ids_json AS json))))
  AND (CAST(:q_like AS text) IS NULL OR normalizar(b.nombre_negocio) LIKE :q_like ESCAPE '\'
    OR normalizar(b.descripcion) LIKE :q_like ESCAPE '\'
    OR EXISTS (SELECT 1 FROM products p WHERE p.business_id = b.id AND p.estado = 'activo' AND normalizar(p.nombre) LIKE :q_like ESCAPE '\'))
  AND (CAST(:category_id AS integer) IS NULL OR b.category_id = :category_id)
  AND (CAST(:zone_id AS integer) IS NULL OR (b.mostrar_ubicacion = 1 AND b.campus_zone_id = :zone_id))
  AND (CAST(:open_now AS integer) IS NULL OR b.esta_abierto = :open_now)
  AND ((CAST(:min_price AS numeric) IS NULL AND CAST(:max_price AS numeric) IS NULL) OR EXISTS (
    SELECT 1 FROM products p WHERE p.business_id = b.id AND p.estado = 'activo'
      AND p.precio >= COALESCE(:min_price, 0) AND p.precio <= COALESCE(:max_price, 99999.99)))
  AND (CAST(:day_of_week AS integer) IS NULL OR EXISTS (SELECT 1 FROM business_schedules s
    WHERE s.business_id = b.id AND s.dia_semana = :day_of_week AND s.cerrado_todo_el_dia = 0
      AND s.hora_apertura <= :time AND :time < s.hora_cierre))`;
export const SORT_CLAUSES = Object.freeze({
  open_now: 'b.esta_abierto DESC, en_horario_ahora DESC, normalizar(b.nombre_negocio) ASC, b.id ASC',
  alpha_asc: 'normalizar(b.nombre_negocio) ASC, b.id ASC', alpha_desc: 'normalizar(b.nombre_negocio) DESC, b.id ASC',
  proximity: 'CASE WHEN b.mostrar_ubicacion = 0 OR z.mapa_x IS NULL THEN 1 ELSE 0 END ASC, ((z.mapa_x - :px)*(z.mapa_x - :px) + (z.mapa_y - :py)*(z.mapa_y - :py)) ASC, b.esta_abierto DESC, normalizar(b.nombre_negocio) ASC, b.id ASC'
});
export function createBusinessPublicRepository(db) {
  return {
    async list(params, sort) {
      const order = Object.hasOwn(SORT_CLAUSES, sort) ? SORT_CLAUSES[sort] : SORT_CLAUSES.open_now;
      const items = await db.prepare(`${businessSelect} ${businessJoins} ${filters} ORDER BY ${order} LIMIT :limit OFFSET :offset`).all(params);
      const total = (await db.prepare(`SELECT COUNT(*) AS total ${businessJoins} ${filters}`).get(params)).total;
      return { items, total };
    },
    detail: async params => (await db.prepare(`${businessSelect} ${businessJoins} WHERE ${visibleBusiness} AND b.slug = :slug`).get(params)),
    schedules: async id => (await db.prepare('SELECT dia_semana, hora_apertura, hora_cierre, cerrado_todo_el_dia FROM business_schedules WHERE business_id = :id ORDER BY dia_semana').all({ id })),
    contacts: async id => (await db.prepare('SELECT id, tipo_contacto, valor, etiqueta, es_principal, orden FROM business_contacts WHERE business_id = :id ORDER BY es_principal DESC, orden ASC, id ASC').all({ id })),
    products: async id => (await db.prepare("SELECT id, nombre, descripcion, precio, imagen_url, estado FROM products WHERE business_id = :id AND estado IN ('activo', 'pausado') ORDER BY CASE WHEN estado = 'activo' THEN 0 ELSE 1 END, normalizar(nombre), id").all({ id }))
  };
}
