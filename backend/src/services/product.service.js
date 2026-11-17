import { createProductRepository } from '../repositories/product.repository.js';
import { createMyBusinessService } from './myBusiness.service.js';
import { deleteUploadIfExists } from '../utils/files.js';
import { AppError } from '../utils/AppError.js';
export function createProductService(db, config) {
  const repository = createProductRepository(db);
  const business = createMyBusinessService(db, config);
  const owned = async (businessId, id) => { const row = await repository.find(businessId, id); if (!row) throw new AppError(404, 'NOT_FOUND'); return row; };
  const mutate = async (businessId, operation) => (await db.transaction(async () => { await business.get(businessId); const result = await operation(); await business.touchActivity(businessId); return result; }));
  const removeImage = url => { try { deleteUploadIfExists(url, config); } catch (error) { console.error('No se pudo eliminar una imagen anterior de producto.', error); } };
  return {
    async create(businessId, data, file) {
      if (!file) throw new AppError(400, 'VALIDATION_ERROR', 'Adjunta una imagen del producto.');
      const id = await mutate(businessId, async () => (await repository.insert({ ...data, business_id: businessId, imagen_url: `/uploads/products/${file.filename}` })));
      return await owned(businessId, id);
    },
    async edit(businessId, id, data, file) {
      let previous;
      await mutate(businessId, async () => {
        const row = await owned(businessId, id);
        if (!file && Object.keys(data).length === 0) throw new AppError(400, 'VALIDATION_ERROR', 'Envía al menos un cambio del producto.');
        previous = file ? row.imagen_url : null;
        await repository.edit({ ...row, ...data, imagen_url: file ? `/uploads/products/${file.filename}` : row.imagen_url });
      });
      removeImage(previous); return await owned(businessId, id);
    },
    async status(businessId, id, estado) {
      await mutate(businessId, async () => { const row = await owned(businessId, id); if (row.estado === 'oculto_admin') throw new AppError(409, 'PRODUCT_LOCKED'); await repository.status({ business_id: businessId, id, estado }); });
      return await owned(businessId, id);
    },
    async remove(businessId, id) {
      let previous;
      await mutate(businessId, async () => { previous = (await owned(businessId, id)).imagen_url; await repository.remove(businessId, id); });
      removeImage(previous); return { eliminado: true };
    }
  };
}
