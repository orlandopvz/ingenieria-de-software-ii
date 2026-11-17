import { ok } from '../utils/response.js';
export const createReportController = service => ({ create: async (req, res) => ok(res.status(201), (await service.create(req.body, req.ip)), 'Tu reporte se recibió correctamente.') });
