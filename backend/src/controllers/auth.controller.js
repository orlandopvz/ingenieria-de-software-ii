import { ok } from '../utils/response.js';
import { AppError } from '../utils/AppError.js';
export function createAuthController(service) {
  return {
    async register(req, res) {
      if (!req.file) throw new AppError(400, 'VALIDATION_ERROR', 'Adjunta una foto de tu credencial UNISON.');
      return ok(res.status(201), (await service.register(req.body, `credentials/${req.file.filename}`)), 'Tu solicitud está en revisión.');
    },
    login: async (req, res) => ok(res, (await service.login(req.body))),
    me: async (req, res) => ok(res, (await service.me(req.user.id))),
    requestStatus: async (req, res) => ok(res, (await service.requestStatus(req.body))),
    forgotPassword: async (req, res) => ok(res, (await service.forgotPassword(req.body)), 'Si la cuenta existe, se generó un código de recuperación.'),
    resetPassword: async (req, res) => ok(res, (await service.resetPassword(req.body)), 'Tu contraseña se restableció. Inicia sesión nuevamente.'),
    removeAccount: async (req, res) => ok(res, (await service.removeAccount(req.user.id, req.body.password_actual)), 'Tu cuenta se dio de baja.')
  };
}
