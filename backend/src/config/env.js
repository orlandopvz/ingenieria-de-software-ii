import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import { z } from 'zod';

export const backendRoot = fileURLToPath(new URL('../../', import.meta.url));
export function loadEnvironmentFiles(source = process.env, root = backendRoot) {
  return dotenv.config({
    path: [path.resolve(root, '../.env.local'), path.resolve(root, '../.env'), path.join(root, '.env')],
    processEnv: source, override: false, quiet: true
  });
}
loadEnvironmentFiles();
z.config(z.locales.es());

const positiveInteger = z.coerce.number().int().positive();
const schema = z.object({
  PORT: positiveInteger.max(65535).default(4000),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  VERCEL: z.enum(['0', '1']).default('0').transform(value => value === '1'),
  CORS_ORIGIN: z.url().default('http://localhost:5173'),
  JWT_SECRET: z.string().min(32),
  JWT_EXPIRES_IN: z.string().regex(/^\d+[smhd]$/).default('7d'),
  DATABASE_URL: z.string().regex(/^postgres(?:ql)?:\/\//).default('postgresql://postgres:postgres@localhost:5432/emprendebuho'),
  DATABASE_URL_UNPOOLED: z.string().regex(/^postgres(?:ql)?:\/\//).optional(),
  DB_POOL_MAX: positiveInteger.max(20).default(5),
  DB_SCHEMA: z.string().regex(/^test_[a-f0-9]{32}$/).optional(),
  UPLOAD_DIR: z.string().min(1).default('./uploads'),
  STORAGE_DIR: z.string().min(1).default('./storage'),
  BACKUP_DIR: z.string().min(1).default('./database/backups'),
  BACKUP_KEEP: positiveInteger.default(10),
  ALLOWED_EMAIL_DOMAINS: z.string().min(1).default('unison.mx').transform(value => value.split(',').map(domain => domain.trim().toLowerCase()))
    .pipe(z.array(z.string().regex(/^[a-z0-9.-]+\.[a-z]{2,}$/)).min(1)),
  INACTIVITY_DAYS_LIMIT: positiveInteger.default(30),
  MAINTENANCE_INTERVAL_HOURS: positiveInteger.default(12),
  REPORT_IP_SALT: z.string().min(16)
});

export function loadEnv(source = process.env) {
  const result = schema.safeParse({ ...source, NODE_ENV: source.NODE_ENV ?? (source.VERCEL === '1' ? 'production' : 'development') });
  if (!result.success) {
    const fields = [...new Set(result.error.issues.map(issue => issue.path.join('.')))];
    throw new Error(`Configuración inválida. Revisa estas variables en backend/.env: ${fields.join(', ')}.`);
  }
  const config = result.data;
  if ((config.VERCEL || config.NODE_ENV === 'production') && !source.DATABASE_URL) {
    throw new Error('Configuración inválida. Configura DATABASE_URL para conectar PostgreSQL en producción.');
  }
  const deploymentHosts = config.VERCEL
    ? [source.VERCEL_URL, source.VERCEL_PROJECT_PRODUCTION_URL].filter(host => typeof host === 'string' && /^[a-z0-9.-]+$/i.test(host))
    : [];
  config.CORS_ORIGINS = Object.freeze([...new Set([config.CORS_ORIGIN, ...deploymentHosts.map(host => `https://${host}`)])]);
  for (const key of ['UPLOAD_DIR', 'STORAGE_DIR', 'BACKUP_DIR']) {
    config[key] = path.resolve(backendRoot, config[key]);
  }
  const uploads = config.UPLOAD_DIR;
  const privatePath = config.STORAGE_DIR;
  const overlaps = (a, b) => {
    const relative = path.relative(a, b);
    return relative === '' || (!relative.startsWith(`..${path.sep}`) && relative !== '..' && !path.isAbsolute(relative));
  };
  if (overlaps(uploads, privatePath) || overlaps(privatePath, uploads)
    || overlaps(uploads, config.BACKUP_DIR)) {
    throw new Error('Configuración inválida. Separa las imágenes públicas de las credenciales, respaldos y base de datos.');
  }
  return Object.freeze(config);
}

export const env = loadEnv();
