import { databaseTables } from './admin.repository.js';

export function createMigrationRepository(db) {
  return {
    async isEmpty() {
      for (const table of databaseTables) {
        if (await db.prepare(`SELECT 1 FROM ${table} LIMIT 1`).get()) return false;
      }
      return true;
    },
    async columns(table) {
      if (!databaseTables.includes(table)) throw new Error('Tabla de migración inválida.');
      return db.prepare('SELECT column_name, data_type FROM information_schema.columns WHERE table_schema = current_schema() AND table_name = :table ORDER BY ordinal_position').all({ table });
    },
    async insert(table, columns, row) {
      if (!databaseTables.includes(table)) throw new Error('Tabla de migración inválida.');
      const values = columns.map(({ column_name, data_type }) => {
        const value = row[column_name];
        if (data_type === 'timestamp with time zone' && value != null) return /(?:Z|[+-]\d\d:\d\d)$/.test(value) ? value : value.replace(' ', 'T') + 'Z';
        return value;
      });
      if (columns.some(column => !/^[a-z_][a-z_0-9]*$/.test(column.column_name))) throw new Error('Columna de migración inválida.');
      const params = Object.fromEntries(columns.map((column, index) => [column.column_name, values[index]]));
      await db.prepare(`INSERT INTO ${table} (${columns.map(column => column.column_name).join(', ')}) VALUES (${columns.map(column => `:${column.column_name}`).join(', ')})`).run(params);
    },
    async deferUserReferences() {
      await db.exec('SET CONSTRAINTS users_resuelto_por_fkey DEFERRED');
    },
    async resetSequences(sequences = {}) {
      for (const table of databaseTables.filter(name => name !== 'business_schedules')) {
        await db.prepare(`SELECT setval(pg_get_serial_sequence(:table, 'id'), GREATEST(COALESCE(MAX(id), 1), CAST(:sequence AS bigint)), MAX(id) IS NOT NULL OR CAST(:sequence AS bigint) > 0) FROM ${table}`).get({ table, sequence: sequences[table] ?? 0 });
      }
    }
  };
}
