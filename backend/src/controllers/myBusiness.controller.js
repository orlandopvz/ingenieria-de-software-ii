import { ok } from '../utils/response.js';
export function createMyBusinessController(service, products) {
  return {
    get: async (req, res) => ok(res, (await service.get(req.user.businessId))),
    preview: async (req, res) => ok(res, (await service.preview(req.user.businessId))),
    profile: async (req, res) => ok(res, (await service.profile(req.user.businessId, req.body))),
    photos: async (req, res) => ok(res, (await service.photos(req.user.businessId, req.files ?? {}))),
    removePhoto: async (req, res) => ok(res, (await service.removePhoto(req.user.businessId, req.params.tipo))),
    open: async (req, res) => ok(res, (await service.open(req.user.businessId, req.body.esta_abierto))),
    location: async (req, res) => ok(res, (await service.location(req.user.businessId, req.body))),
    schedules: async (req, res) => ok(res, (await service.schedules(req.user.businessId, req.body))),
    contacts: async (req, res) => ok(res, (await service.contacts(req.user.businessId, req.body))),
    createProduct: async (req, res) => ok(res.status(201), (await products.create(req.user.businessId, req.body, req.file))),
    editProduct: async (req, res) => ok(res, (await products.edit(req.user.businessId, req.params.id, req.body, req.file))),
    productStatus: async (req, res) => ok(res, (await products.status(req.user.businessId, req.params.id, req.body.estado))),
    removeProduct: async (req, res) => ok(res, (await products.remove(req.user.businessId, req.params.id)))
  };
}
