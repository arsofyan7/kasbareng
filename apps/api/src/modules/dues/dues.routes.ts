import { Router, Response } from 'express';
import { requireAuth, requireWalletRole, AuthRequest } from '../auth/auth.middleware';
import { sendSuccess, sendError } from '../../common/response';
import { DuesService } from './dues.service';

export const duesRouter = Router();

/**
 * GET /api/v1/wallets/:walletId/dues-board
 * Returns interactive dues board, member checklist, compliance statistics, and WhatsApp reminder draft.
 * Accessible by all active members of the wallet (ADMIN, PENGELOLA, and WARGA).
 */
duesRouter.get(
  '/wallets/:walletId/dues-board',
  requireAuth,
  requireWalletRole(),
  async (req: AuthRequest, res: Response) => {
    try {
      const walletId = String(req.params.walletId);
      const { year } = req.query;
      const parsedYear = year ? parseInt(String(year), 10) : undefined;

      const result = await DuesService.getDuesBoard(walletId, parsedYear);
      return sendSuccess(res, result, 200);
    } catch (err: any) {
      return sendError(
        res,
        err.code || 'DUES_BOARD_ERROR',
        err.message || 'Gagal memuat papan rekap iuran.',
        err.status || 500
      );
    }
  }
);
