import { ok } from '../utils/response.js';
export const createCatalogController = service => ({ list: async (req, res) => ok(res, (await service.list())) });
