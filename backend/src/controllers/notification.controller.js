import { ok } from '../utils/response.js';
export const createNotificationController = service => ({
  list: async (req, res) => ok(res, (await service.listNotifications(req.user.id))),
  read: async (req, res) => ok(res, (await service.readNotification(req.user.id, req.params.id))),
  readAll: async (req, res) => ok(res, (await service.readAllNotifications(req.user.id)))
});
