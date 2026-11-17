import { ok } from '../utils/response.js';
import { AppError } from '../utils/AppError.js';
const listing = (res, result) => ok(res, result.items, undefined, result.meta);
const fileError = next => error => {
  // Cerrar el visor o cancelar un fetch no es un fallo interno del servidor.
  if (error && error.code !== 'ECONNABORTED') next(error.code === 'ENOENT' ? new AppError(404, 'NOT_FOUND') : error);
};
export function createAdminController(service, maintenance) {
  return {
    stats: async (req, res) => ok(res, (await service.stats())),
    requests: async (req, res) => listing(res, (await service.requests(req.query))),
    async credential(req, res, next) { res.set('Cache-Control', 'private, no-store'); res.sendFile((await service.credential(req.params.userId)), fileError(next)); },
    decide: async (req, res) => ok(res, (await service.decide(req.user.id, req.params.userId, req.body))),
    suspend: async (req, res) => ok(res, (await service.suspend(req.user.id, req.params.userId, req.body))),
    products: async (req, res) => listing(res, (await service.products(req.query))),
    moderate: async (req, res) => ok(res, (await service.moderate(req.user.id, req.params.productId, req.body))),
    reports: async (req, res) => listing(res, (await service.reports(req.query))),
    resolve: async (req, res) => ok(res, (await service.resolve(req.user.id, req.params.reportId, req.body))),
    categories: async (req, res) => ok(res, (await service.categories())),
    createCategory: async (req, res) => ok(res.status(201), (await service.saveCategory(req.user.id, null, req.body))),
    editCategory: async (req, res) => ok(res, (await service.saveCategory(req.user.id, req.params.id, req.body))),
    health: async (req, res) => ok(res, (await maintenance.health())),
    inactivity: async (req, res) => ok(res, (await maintenance.runInactivityCheck(req.user.id))),
    backup: async (req, res) => ok(res, await maintenance.backup(req.user.id)),
    async download(req, res, next) { res.set('Cache-Control', 'private, no-store'); res.download((await maintenance.backupFile(req.params.filename)), req.params.filename, fileError(next)); },
    cleanup: async (req, res) => ok(res, (await maintenance.cleanupOrphans(req.user.id))),
    auditLogs: async (req, res) => listing(res, (await service.auditLogs(req.query)))
  };
}
