import { getDb } from '../config/db.js';
import { createNotificationRepository } from '../repositories/notification.repository.js';
import { createUserRepository } from '../repositories/user.repository.js';

export function createNotificationService(db, logger = console) {
  const repository = createNotificationRepository(db);
  return {
    async notify(notification) {
      const id = await repository.insert(notification);
      logger.info(`[Notificación] usuario=${notification.user_id} tipo=${notification.tipo}: ${notification.titulo}`);
      return id;
    }
  };
}

export function notify(notification) {
  return createNotificationService(getDb()).notify(notification);
}

// Operación transversal requerida por requireAuth; el barrido periódico pertenece a F2B.
export async function reactivateExpiredAccount(db, id, logger = console) {
  const users = createUserRepository(db);
  const notifications = createNotificationRepository(db);
  const changed = await db.transaction(async () => {
    if (!(await users.reactivateExpired(id))) return false;
    await notifications.insert({ user_id: id, tipo: 'cuenta_reactivada', titulo: 'Cuenta reactivada',
      mensaje: 'Tu suspensión temporal terminó. Ya puedes acceder a tu cuenta.' });
    await users.auditReactivation(id);
    return true;
  });
  if (changed) logger.info(`[Notificación] usuario=${id} tipo=cuenta_reactivada: Cuenta reactivada`);
  return changed;
}
