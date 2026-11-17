import { createHash } from 'node:crypto';
import { createReportRepository } from '../repositories/report.repository.js';
import { AppError } from '../utils/AppError.js';
export function createReportService(db, config) {
  const repository = createReportRepository(db);
  return { async create(data, ip) {
    return await db.transaction(async () => {
      if (!(await repository.visibleBusiness(data.business_id))) throw new AppError(404, 'NOT_FOUND');
      if (data.product_id && !(await repository.productBelongs(data.business_id, data.product_id))) throw new AppError(404, 'NOT_FOUND');
      const params = { ...data, product_id: data.product_id ?? null, ip_hash: createHash('sha256').update(ip + config.REPORT_IP_SALT).digest('hex') };
      if ((await repository.recent(params))) throw new AppError(429, 'RATE_LIMITED');
      return { id: await repository.insert(params), estado_reporte: 'pendiente' };
    });
  } };
}
