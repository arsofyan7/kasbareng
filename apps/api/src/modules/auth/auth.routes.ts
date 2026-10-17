import { Router, Response } from 'express';
import { AuthService } from './auth.service';
import { requireAuth, AuthRequest } from './auth.middleware';
import { sendSuccess, sendError } from '../../common/response';
import { ZodError } from 'zod';

export const authRouter = Router();

authRouter.post('/register', async (req: AuthRequest, res: Response) => {
  try {
    const result = await AuthService.register(req.body);
    return sendSuccess(res, result, 201);
  } catch (err: any) {
    if (err instanceof ZodError) {
      return sendError(res, 'VALIDATION_ERROR', 'Format data tidak valid.', 400, err.errors);
    }
    return sendError(
      res,
      err.code || 'REGISTER_FAILED',
      err.message || 'Gagal mendaftar akun.',
      err.status || 400
    );
  }
});

authRouter.post('/login', async (req: AuthRequest, res: Response) => {
  try {
    const result = await AuthService.login(req.body);
    return sendSuccess(res, result, 200);
  } catch (err: any) {
    if (err instanceof ZodError) {
      return sendError(res, 'VALIDATION_ERROR', 'Format data tidak valid.', 400, err.errors);
    }
    return sendError(
      res,
      err.code || 'LOGIN_FAILED',
      err.message || 'Gagal masuk akun.',
      err.status || 400
    );
  }
});

authRouter.post('/logout', requireAuth, async (_req: AuthRequest, res: Response) => {
  // Stateless JWT logout: client discards token
  return sendSuccess(res, { message: 'Berhasil keluar.' }, 200);
});

authRouter.get('/me', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const user = await AuthService.getMe(req.user!.id);
    return sendSuccess(res, user, 200);
  } catch (err: any) {
    return sendError(
      res,
      err.code || 'INTERNAL_ERROR',
      err.message || 'Gagal memuat profil.',
      err.status || 500
    );
  }
});