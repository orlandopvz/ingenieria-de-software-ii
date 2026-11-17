import { createCatalogRepository } from '../repositories/catalog.repository.js';
export function createCatalogService(db) {
  const repository = createCatalogRepository(db);
  return { list: async () => ({ categories: await repository.categories(), campus_zones: await repository.zones() }) };
}
