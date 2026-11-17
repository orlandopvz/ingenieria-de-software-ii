import { ok } from '../utils/response.js';
export const createBusinessController = service => ({
  async list(req, res) { const result = await service.list(req.query); return ok(res, result.items, undefined, result.meta); },
  detail: async (req, res) => ok(res, (await service.detail(req.params.slug)))
});
