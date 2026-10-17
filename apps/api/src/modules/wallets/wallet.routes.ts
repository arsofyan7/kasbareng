import { Router, Response } from 'express';
import { WalletService } from './wallet.service';
import { requireAuth, requireWalletRole, AuthRequest } from '../auth/auth.middleware';
import { sendSuccess, sendError } from '../../common/response';
import { WalletRole } from '@prisma/client';
import { ZodError } from 'zod';

export const walletRouter = Router();

// List user's wallets
walletRouter.get('/', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const wallets = await WalletService.getUserWallets(req.user!.id);
    return sendSuccess(res, wallets, 200);
  } catch (err: any) {
    return sendError(
      res,
      err.code || 'INTERNAL_ERROR',
      err.message || 'Gagal memuat daftar dompet.',
      err.status || 500
    );
  }
});

// Create new wallet (caller becomes ADMIN)
walletRouter.post('/', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const wallet = await WalletService.createWallet(req.user!.id, req.body);
    return sendSuccess(res, wallet, 201);
  } catch (err: any) {
    if (err instanceof ZodError) {
      return sendError(res, 'VALIDATION_ERROR', 'Format data tidak valid.', 400, err.errors);
    }
    return sendError(
      res,
      err.code || 'CREATE_WALLET_FAILED',
      err.message || 'Gagal membuat dompet kas baru.',
      err.status || 400
    );
  }
});

// Get wallet details (any active member)
walletRouter.get('/:walletId', requireAuth, requireWalletRole(), async (req: AuthRequest, res: Response) => {
  try {
    const walletId = String(req.params.walletId);
    const wallet = await WalletService.getWalletDetails(walletId, req.user!.id);
    return sendSuccess(res, wallet, 200);
  } catch (err: any) {
    return sendError(
      res,
      err.code || 'INTERNAL_ERROR',
      err.message || 'Gagal memuat detail dompet.',
      err.status || 500
    );
  }
});

// Get members of a wallet (any active member)
walletRouter.get('/:walletId/members', requireAuth, requireWalletRole(), async (req: AuthRequest, res: Response) => {
  try {
    const walletId = String(req.params.walletId);
    const members = await WalletService.getWalletMembers(walletId);
    return sendSuccess(res, members, 200);
  } catch (err: any) {
    return sendError(
      res,
      err.code || 'INTERNAL_ERROR',
      err.message || 'Gagal memuat anggota dompet.',
      err.status || 500
    );
  }
});

// Add member to wallet (ADMIN only)
walletRouter.post(
  '/:walletId/members',
  requireAuth,
  requireWalletRole([WalletRole.ADMIN]),
  async (req: AuthRequest, res: Response) => {
    try {
      const walletId = String(req.params.walletId);
      const newMember = await WalletService.addWalletMember(walletId, req.body);
      return sendSuccess(res, newMember, 201);
    } catch (err: any) {
      if (err instanceof ZodError) {
        return sendError(res, 'VALIDATION_ERROR', 'Format data tidak valid.', 400, err.errors);
      }
      return sendError(
        res,
        err.code || 'ADD_MEMBER_FAILED',
        err.message || 'Gagal menambahkan anggota.',
        err.status || 400
      );
    }
  }
);

// Update member role or status (ADMIN only)
walletRouter.patch(
  '/:walletId/members/:memberId',
  requireAuth,
  requireWalletRole([WalletRole.ADMIN]),
  async (req: AuthRequest, res: Response) => {
    try {
      const walletId = String(req.params.walletId);
      const memberId = String(req.params.memberId);
      const updated = await WalletService.updateWalletMember(
        walletId,
        memberId,
        req.body
      );
      return sendSuccess(res, updated, 200);
    } catch (err: any) {
      if (err instanceof ZodError) {
        return sendError(res, 'VALIDATION_ERROR', 'Format data tidak valid.', 400, err.errors);
      }
      return sendError(
        res,
        err.code || 'UPDATE_MEMBER_FAILED',
        err.message || 'Gagal memperbarui data anggota.',
        err.status || 400
      );
    }
  }
);