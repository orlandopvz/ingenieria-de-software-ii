import fs from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
const runFile = promisify(execFile);
import { createAdminRepository } from '../repositories/admin.repository.js';
import { createAuditRepository } from '../repositories/audit.repository.js';
import { createNotificationRepository } from '../repositories/notification.repository.js';
import { safePath } from '../utils/files.js';
import { AppError } from '../utils/AppError.js';

const backupPattern = /^emprendebuho_\d{8}_\d{6}\.dump$/;
function filesWithin(root, relative = '') {
  const directory = relative ? safePath(root, relative) : root;
  if (!fs.existsSync(directory) || fs.lstatSync(directory).isSymbolicLink()) return [];
  const result = [];
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    if (entry.name.startsWith('.') || entry.isSymbolicLink()) continue;
    const name = path.join(relative, entry.name);
    const target = safePath(root, name);
    if (entry.isDirectory()) result.push(...filesWithin(root, name));
    else if (entry.isFile()) result.push({ relative: name, path: target, stat: fs.statSync(target) });
  }
  return result;
}
export function createMaintenanceService(db, config) {
  const repository = createAdminRepository(db);
  const audit = createAuditRepository(db);
  const notifications = createNotificationRepository(db);
  const backups = () => filesWithin(config.BACKUP_DIR).filter(file => backupPattern.test(file.relative)).map(file => ({ filename: file.relative, size_bytes: file.stat.size, created_at: file.stat.mtime.toISOString() }))
    .sort((a, b) => b.filename.localeCompare(a.filename));
  let backupRunning = false;
  return {
    async runInactivityCheck(actor = null) {
      const result = await db.transaction(async () => {
        const ocultados = await repository.hideInactive(config.INACTIVITY_DAYS_LIMIT);
        const expired = await repository.expiredSuspensions();
        for (const { id } of expired) {
          await repository.reactivate(id);
          await notifications.insert({ user_id: id, tipo: 'cuenta_reactivada', titulo: 'Cuenta reactivada', mensaje: 'Tu suspensión temporal terminó. Ya puedes iniciar sesión.' });
          await audit.record(actor, 'reactivar_cuenta', 'user', id, { motivo: 'Suspensión temporal vencida' });
        }
        const result = { ocultados, reactivados: expired.length };
        await audit.record(actor, 'barrido_inactividad', 'system', null, result);
        return result;
      });
      if (result.reactivados) console.info(`[Mantenimiento] Cuentas reactivadas: ${result.reactivados}`);
      return result;
    },
    async health() {
      return { size_bytes: await repository.databaseSize(),
        filas_por_tabla: await repository.counts(), candidatos_inactividad: await repository.inactiveCount(config.INACTIVITY_DAYS_LIMIT),
        archivos_uploads: filesWithin(config.UPLOAD_DIR).length, backups: backups() };
    },
    async backup(actor) {
      if (backupRunning) throw new AppError(409, 'CONFLICT', 'Ya hay un respaldo en proceso.');
      backupRunning = true;
      let target;
      let temporary;
      let published = false;
      let renamed = false;
      try {
        fs.mkdirSync(config.BACKUP_DIR, { recursive: true });
        const stamp = new Date().toISOString().slice(0, 19).replace(/[-:T]/g, '').replace(/^(\d{8})(\d{6})$/, '$1_$2');
        const filename = `emprendebuho_${stamp}.dump`;
        target = safePath(config.BACKUP_DIR, filename);
        if (fs.existsSync(target)) throw new AppError(409, 'CONFLICT', 'Ya existe un respaldo de este segundo. Inténtalo de nuevo.');
        temporary = safePath(config.BACKUP_DIR, `.respaldo-${randomUUID()}.dump`);
        const args = ['--dbname', config.DATABASE_URL, '--format=custom', '--no-owner', '--no-acl', '--file', temporary];
        if (config.DB_SCHEMA) args.push('--schema', config.DB_SCHEMA);
        try { await runFile('pg_dump', args, { windowsHide: true }); }
        catch { throw new AppError(500, 'INTERNAL_ERROR', 'No se pudo generar el respaldo.'); }
        const metadata = { filename, size_bytes: fs.statSync(temporary).size, created_at: new Date().toISOString() };
        const obsolete = backups().slice(Math.max(0, config.BACKUP_KEEP - 1));
        await db.transaction(async () => {
          await audit.record(actor, 'respaldo_bd', 'system', null, { ...metadata, respaldos_retirados: obsolete.map(item => item.filename) });
          fs.renameSync(temporary, target); renamed = true;
        });
        published = true;
        for (const item of obsolete) fs.unlinkSync(safePath(config.BACKUP_DIR, item.filename));
        return metadata;
      } catch (error) {
        if (!published && temporary && fs.existsSync(temporary)) fs.unlinkSync(temporary);
        if (!published && renamed && fs.existsSync(target)) fs.unlinkSync(target);
        throw error;
      } finally { backupRunning = false; }
    },
    backupFile(filename) {
      if (!backupPattern.test(filename)) throw new AppError(400, 'VALIDATION_ERROR');
      const target = safePath(config.BACKUP_DIR, filename);
      if (!fs.existsSync(target) || !fs.statSync(target).isFile()) throw new AppError(404, 'NOT_FOUND');
      return target;
    },
    async cleanupOrphans(actor) {
      const referenced = new Set((await repository.referencedUploads()));
      const candidates = filesWithin(config.UPLOAD_DIR).filter(file => !referenced.has('/uploads/' + file.relative.split(path.sep).join('/')) && file.stat.mtimeMs < Date.now() - 3600000);
      // Se retiran primero a una zona privada; si falla la auditoría se restauran.
      const moved = [];
      try {
        await db.transaction(async () => {
          await audit.record(actor, 'limpiar_huerfanos', 'system', null, { eliminados: candidates.length });
          for (const file of candidates) {
            const staged = safePath(config.STORAGE_DIR, `.huerfano-${randomUUID()}`);
            fs.renameSync(file.path, staged); moved.push({ original: file.path, staged });
          }
        });
      } catch (error) {
        for (const file of moved.reverse()) fs.renameSync(file.staged, file.original);
        throw error;
      }
      for (const file of moved) fs.unlinkSync(file.staged);
      return { eliminados: moved.length };
    }
  };
}
