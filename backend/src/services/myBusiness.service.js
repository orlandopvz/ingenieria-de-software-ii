import fs from 'node:fs';
import { createMyBusinessRepository } from '../repositories/myBusiness.repository.js';
import { createProductRepository } from '../repositories/product.repository.js';
import { createBusinessPublicRepository } from '../repositories/businessPublic.repository.js';
import { sanitizePublicBusiness } from './serializers.js';
import { uniqueSlug } from '../utils/text.js';
import { nowInHermosillo } from '../utils/time.js';
import { deleteUploadIfExists, safePath } from '../utils/files.js';
import { AppError } from '../utils/AppError.js';

export function createMyBusinessService(db, config) {
  const repository = createMyBusinessRepository(db);
  const products = createProductRepository(db);
  const publicRepository = createBusinessPublicRepository(db);
  const own = async id => { const row = await repository.find(id); if (!row) throw new AppError(404, 'NOT_FOUND'); return row; };
  const touchActivity = async businessId => (await repository.touchActivity(businessId));
  const mutate = async (id, operation) => (await db.transaction(async () => { const result = await operation((await own(id))); await touchActivity(id); return result; }));
  const full = async id => {
    const row = await own(id);
    return { ...row, esta_abierto: row.esta_abierto === 1, mostrar_ubicacion: row.mostrar_ubicacion === 1, inactivo_oculto: row.inactivo_oculto === 1,
      schedules: (await publicRepository.schedules(id)).map(day => ({ ...day, cerrado_todo_el_dia: day.cerrado_todo_el_dia === 1 })),
      contacts: (await publicRepository.contacts(id)).map(contact => ({ ...contact, es_principal: contact.es_principal === 1 })), products: await products.list(id) };
  };
  function deletePrevious(url) {
    try { deleteUploadIfExists(url, config); } catch (error) { console.error('No se pudo eliminar una imagen reemplazada.', error); }
  }
  return {
    touchActivity, get: full,
    async preview(id) {
      await own(id);
      const now = nowInHermosillo();
      const row = await repository.preview({ id, now_dow: now.dow, now_time: now.time });
      return sanitizePublicBusiness({ ...row, schedules: await publicRepository.schedules(id), contacts: await publicRepository.contacts(id), products: await publicRepository.products(id) });
    },
    async profile(id, data) {
      await mutate(id, async row => {
        const category = await repository.category(data.category_id);
        if (!category || (!category.activa && category.id !== row.category_id)) throw new AppError(400, 'VALIDATION_ERROR', 'Selecciona una categoría activa.');
        await repository.profile({ ...data, id, slug: row.nombre_negocio === data.nombre_negocio ? row.slug : (await uniqueSlug(data.nombre_negocio, async slug => (await repository.slugExists(slug, id)))) });
      });
      return await full(id);
    },
    async open(id, value) { await mutate(id, async () => (await repository.open(id, value ? 1 : 0))); return await full(id); },
    async location(id, data) {
      await mutate(id, async row => {
        const result = { ...row, ...data, id };
        if (data.campus_zone_id != null && !(await repository.zone(data.campus_zone_id))) throw new AppError(400, 'VALIDATION_ERROR', 'Selecciona una zona activa del campus.');
        if (result.mostrar_ubicacion && result.campus_zone_id === null) throw new AppError(400, 'VALIDATION_ERROR', 'Selecciona una zona del campus antes de mostrar tu ubicación.');
        await repository.location({ ...result, mostrar_ubicacion: result.mostrar_ubicacion ? 1 : 0 });
      }); return await full(id);
    },
    async schedules(id, data) {
      await mutate(id, async () => { await repository.clearSchedules(id); for (const day of data.schedules) await repository.schedule({ ...day, business_id: id,
        hora_apertura: day.cerrado_todo_el_dia ? null : day.hora_apertura, hora_cierre: day.cerrado_todo_el_dia ? null : day.hora_cierre, cerrado_todo_el_dia: day.cerrado_todo_el_dia ? 1 : 0 }); });
      return await full(id);
    },
    async contacts(id, data) {
      await mutate(id, async () => {
        await repository.clearContacts(id);
        const hasPrincipal = data.contacts.some(contact => contact.es_principal);
        for (const [orden, contact] of data.contacts.entries()) await repository.contact({ ...contact, business_id: id, orden, etiqueta: contact.etiqueta ?? null,
          es_principal: contact.es_principal || (!hasPrincipal && orden === 0) ? 1 : 0 });
      }); return await full(id);
    },
    async photos(id, files) {
      await own(id);
      if (!Object.values(files).some(items => items.length)) throw new AppError(400, 'VALIDATION_ERROR', 'Adjunta una foto de perfil o de menú.');
      const old = [];
      await mutate(id, async row => {
        const result = { id, foto_perfil_url: row.foto_perfil_url, foto_menu_url: row.foto_menu_url };
        for (const [field, items] of Object.entries(files)) {
          const file = items[0];
          const subdir = field === 'foto_menu' ? 'menus' : 'profiles';
          if (subdir === 'menus') fs.renameSync(safePath(config.UPLOAD_DIR, `profiles/${file.filename}`), safePath(config.UPLOAD_DIR, `menus/${file.filename}`));
          file.publicUrl = `/uploads/${subdir}/${file.filename}`;
          old.push(result[field + '_url']); result[field + '_url'] = file.publicUrl;
        }
        await repository.photos(result);
      });
      old.forEach(deletePrevious); return await full(id);
    },
    async removePhoto(id, tipo) {
      let previous;
      await mutate(id, async row => { const key = tipo === 'perfil' ? 'foto_perfil_url' : 'foto_menu_url'; previous = row[key]; await repository.photos({ ...row, [key]: null }); });
      deletePrevious(previous); return await full(id);
    }
  };
}
