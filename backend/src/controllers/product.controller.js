import { ok } from '../utils/response.js';
export const createProductController = service => ({
  async list(req, res) { const result = await service.list(req.query); return ok(res, result.items, undefined, result.meta); }
});
