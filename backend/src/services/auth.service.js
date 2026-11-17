import { createHash, randomInt } from 'node:crypto';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { createUserRepository } from '../repositories/user.repository.js';
import { createCatalogRepository } from '../repositories/catalog.repository.js';
import { createNotificationRepository } from '../repositories/notification.repository.js';
import { reactivateExpiredAccount } from './notification.service.js';
import { uniqueSlug } from '../utils/text.js';
import { deleteStoredFile } from '../utils/files.js';
import { AppError } from '../utils/AppError.js';
import { toIsoUtc } from '../utils/time.js';

const hashCode = value => createHash('sha256').update(value).digest('hex');
const safeUser = user => Object.fromEntries(['id', 'nombre_completo', 'email_institucional', 'matricula_unison', 'rol', 'estado_cuenta'].map(key => [key, user[key]]));
export function createAuthService(db, config, logger = console) {
  const users = createUserRepository(db);
  const catalogs = createCatalogRepository(db);
  const notifications = createNotificationRepository(db);
  const snapshot = async id => {
    const user = await users.byId(id);
    const business = await users.business(id);
    return { user: safeUser(user), business: business ? { id: business.id, nombre_negocio: business.nombre_negocio,
      slug: business.slug, esta_abierto: business.esta_abierto === 1, mostrar_ubicacion: business.mostrar_ubicacion === 1 } : null,
    unread_notifications: await notifications.unreadCount(id) };
  };
  const removeOldCredential = relative => {
    if (!relative) return;
    try { deleteStoredFile(config.STORAGE_DIR, relative); }
    catch (error) { logger.error('No se pudo eliminar una credencial reemplazada del almacenamiento privado.', error); }
  };
  return {
    async register(data, credentialPath) {
      let oldCredential;
      const password_hash = bcrypt.hashSync(data.password, 10);
      const result = await db.transaction(async () => {
        if (!(await catalogs.activeCategory(data.category_id))) throw new AppError(400, 'VALIDATION_ERROR', 'Selecciona una categoría activa.');
        const matches = await users.matching(data);
        if (matches.length > 1 || matches.some(user => user.rol !== 'emprendedor' || !['rechazada', 'eliminada'].includes(user.estado_cuenta))) {
          throw new AppError(409, 'CONFLICT');
        }
        const previous = matches[0];
        if (previous && (previous.email_institucional.toLowerCase() !== data.email_institucional || previous.matricula_unison !== data.matricula_unison)) {
          throw new AppError(409, 'CONFLICT');
        }
        const account = { ...data, password_hash, credencial_path: credentialPath };
        let id;
        if (previous) {
          id = previous.id;
          oldCredential = previous.credencial_path;
          await users.reuse({ ...account, id });
          await users.invalidateResetCodes(id);
        } else id = (await users.insert(account));
        const business = await users.business(id);
        const params = { ...data, user_id: id, slug: await uniqueSlug(data.nombre_negocio, async slug => (await users.slugExists(slug, id))) };
        if (business) await users.updateBusiness(params);
        else {
          const business_id = await users.insertBusiness(params);
          for (let dia_semana = 0; dia_semana < 7; dia_semana += 1) await users.insertSchedule({ business_id, dia_semana });
        }
        return { user_id: id, estado_cuenta: 'pendiente', email_institucional: data.email_institucional, matricula_unison: data.matricula_unison };
      });
      if (oldCredential && oldCredential !== credentialPath) removeOldCredential(oldCredential);
      return result;
    },
    async login(data) {
      let user = await users.byIdentifier(data.identificador);
      if (!user || user.estado_cuenta === 'eliminada' || !bcrypt.compareSync(data.password, user.password_hash)) throw new AppError(401, 'INVALID_CREDENTIALS');
      if (user.estado_cuenta === 'suspendida') {
        if ((await reactivateExpiredAccount(db, user.id, logger))) user = (await users.byId(user.id));
        else throw new AppError(403, 'ACCOUNT_SUSPENDED', undefined, { estado_cuenta: user.estado_cuenta, motivo_estado: user.motivo_estado, suspendida_hasta: user.suspendida_hasta });
      }
      if (user.estado_cuenta === 'pendiente') throw new AppError(403, 'ACCOUNT_PENDING', undefined, { estado_cuenta: user.estado_cuenta, fecha_solicitud: toIsoUtc(user.created_at) });
      if (user.estado_cuenta === 'rechazada') throw new AppError(403, 'ACCOUNT_REJECTED', undefined, { estado_cuenta: user.estado_cuenta, motivo_estado: user.motivo_estado, fecha_resolucion: user.fecha_resolucion });
      await db.transaction(async () => { await users.touchLogin(user.id); if (user.rol === 'emprendedor') await users.touchActivity(user.id); });
      const token = jwt.sign({ sub: user.id, rol: user.rol, tv: user.token_version }, config.JWT_SECRET, { algorithm: 'HS256', expiresIn: config.JWT_EXPIRES_IN });
      return { token, ...(await snapshot(user.id)) };
    },
    me: snapshot,
    async requestStatus(data) {
      const result = await users.requestStatus(data);
      if (!result) throw new AppError(404, 'NOT_FOUND');
      return result;
    },
    async forgotPassword(data) {
      // También se genera un código ficticio para correos inexistentes: mismo sobre en desarrollo.
      const code = String(randomInt(100000, 1000000));
      const user = await users.byEmail(data.email_institucional);
      if (user && user.estado_cuenta !== 'eliminada') {
        await db.transaction(async () => { await users.invalidateResetCodes(user.id); await users.insertResetCode({ user_id: user.id, codigo_hash: hashCode(code) }); });
        logger.info(`[Recuperación de contraseña]\nPara: ${data.email_institucional}\nCódigo: ${code}\nVigencia: 15 minutos.`);
      }
      return { sent: true, ...(['development', 'test'].includes(config.NODE_ENV) ? { dev_codigo: code } : {}) };
    },
    async resetPassword(data) {
      // El intento fallido debe confirmarse; lanzar dentro de la transacción lo revertiría.
      const changed = await db.transaction(async () => {
        const user = await users.byEmail(data.email_institucional);
        if (!user || user.estado_cuenta === 'eliminada') return false;
        const reset = await users.activeResetCode(user.id);
        if (!reset) return false;
        if (reset.codigo_hash !== hashCode(data.codigo_recuperacion)) { await users.failedReset(reset.id); return false; }
        await users.changePassword({ id: user.id, password_hash: bcrypt.hashSync(data.nueva_password, 10) });
        await users.invalidateResetCodes(user.id);
        return true;
      });
      if (!changed) throw new AppError(400, 'RESET_CODE_INVALID');
      return { restablecida: true };
    },
    async removeAccount(id, password) {
      const user = await users.byId(id);
      if (!user || !bcrypt.compareSync(password, user.password_hash)) throw new AppError(401, 'INVALID_CREDENTIALS');
      await db.transaction(async () => { await users.deleteAccount(id); await users.closeBusiness(id); await users.invalidateResetCodes(id); await users.auditDeletion(id); });
      return { eliminada: true };
    },
    listNotifications: async id => ({ items: (await notifications.list(id)).map(item => ({ ...item, leida: item.leida === 1 })), unread_count: await notifications.unreadCount(id) }),
    async readNotification(userId, id) {
      if (!(await notifications.markRead(userId, id))) throw new AppError(404, 'NOT_FOUND');
      return { leida: true };
    },
    readAllNotifications: async id => ({ actualizadas: await notifications.markAllRead(id) })
  };
}
