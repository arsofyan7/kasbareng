import { Router, Response } from 'express';
import {
  WalletService,
  JoinWalletSchema,
  UpdateInviteCodeSchema,
  UpdatePolicySchema,
} from './wallet.service';
import { requireAuth, requireWalletRole, AuthRequest } from '../auth/auth.middleware';
import { sendSuccess, sendError } from '../../common/response';
import { WalletRole } from '@prisma/client';
import { ZodError } from 'zod';

export const walletRouter = Router();

// 1. Preview wallet by invite code (open for prospective members)
walletRouter.get('/preview-invite/:code', async (req: AuthRequest, res: Response) => {
  try {
    const code = String(req.params.code);
    const preview = await WalletService.previewWalletByCode(code);
    return sendSuccess(res, preview, 200);
  } catch (err: any) {
    return sendError(
      res,
      err.code || 'PREVIEW_FAILED',
      err.message || 'Gagal memuat pratinjau dompet kas.',
      err.status || 404
    );
  }
});

// 2. Check custom code availability (authenticated)
walletRouter.get('/check-code/:code', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const code = String(req.params.code);
    const excludeWalletId = req.query.excludeWalletId ? String(req.query.excludeWalletId) : undefined;
    const result = await WalletService.checkCodeAvailability(code, excludeWalletId);
    return sendSuccess(res, result, 200);
  } catch (err: any) {
    return sendError(
      res,
      err.code || 'CHECK_CODE_FAILED',
      err.message || 'Gagal memeriksa ketersediaan kode.',
      err.status || 400
    );
  }
});

// 3. Join wallet via invite code (Instant Join as WARGA)
walletRouter.post('/join', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const validated = JoinWalletSchema.parse(req.body);
    const result = await WalletService.joinWalletByCode(req.user!.id, validated.inviteCode);
    return sendSuccess(res, result, 200, { message: 'Berhasil bergabung dengan dompet kas!' });
  } catch (err: any) {
    if (err instanceof ZodError) {
      return sendError(res, 'VALIDATION_ERROR', 'Format kode undangan tidak valid.', 400, err.errors);
    }
    return sendError(
      res,
      err.code || 'JOIN_WALLET_FAILED',
      err.message || 'Gagal bergabung ke dompet kas.',
      err.status || 400
    );
  }
});

// 4. List user's wallets
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

// 5. Create new wallet (caller becomes ADMIN)
walletRouter.post('/', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const wallet = await WalletService.createWallet(req.user!.id, req.body);
    return sendSuccess(res, wallet, 201, { message: 'Dompet kas komunitas berhasil dibuat!' });
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

// 6. Update or Regenerate Invite Code (ADMIN only)
walletRouter.patch(
  '/:walletId/invite-code',
  requireAuth,
  requireWalletRole([WalletRole.ADMIN]),
  async (req: AuthRequest, res: Response) => {
    try {
      const walletId = String(req.params.walletId);
      const validated = UpdateInviteCodeSchema.parse(req.body);
      const updated = await WalletService.updateInviteCode(walletId, validated.customCode);
      return sendSuccess(res, updated, 200, { message: 'Kode undangan berhasil diperbarui!' });
    } catch (err: any) {
      if (err instanceof ZodError) {
        return sendError(res, 'VALIDATION_ERROR', 'Format kode tidak valid.', 400, err.errors);
      }
      return sendError(
        res,
        err.code || 'UPDATE_INVITE_CODE_FAILED',
        err.message || 'Gagal memperbarui kode undangan.',
        err.status || 400
      );
    }
  }
);

// 7. Get wallet details (any active member)
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

// 8. Get members of a wallet (any active member)
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

// 9. Add member manually to wallet by email (ADMIN only)
walletRouter.post(
  '/:walletId/members',
  requireAuth,
  requireWalletRole([WalletRole.ADMIN]),
  async (req: AuthRequest, res: Response) => {
    try {
      const walletId = String(req.params.walletId);
      const newMember = await WalletService.addWalletMember(walletId, req.body);
      return sendSuccess(res, newMember, 201, { message: 'Anggota berhasil ditambahkan.' });
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

// 10. Update member role or status (ADMIN only)
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
      return sendSuccess(res, updated, 200, { message: 'Data anggota berhasil diperbarui.' });
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

// 11. Get M-of-N Approval Policy (Any active member)
walletRouter.get(
  '/:walletId/policy',
  requireAuth,
  requireWalletRole(),
  async (req: AuthRequest, res: Response) => {
    try {
      const walletId = String(req.params.walletId);
      const policyData = await WalletService.getWalletPolicy(walletId);
      return sendSuccess(res, policyData, 200);
    } catch (err: any) {
      return sendError(
        res,
        err.code || 'INTERNAL_ERROR',
        err.message || 'Gagal memuat aturan persetujuan dompet.',
        err.status || 500
      );
    }
  }
);

// 12. Update M-of-N Approval Policy (ADMIN only)
walletRouter.put(
  '/:walletId/policy',
  requireAuth,
  requireWalletRole([WalletRole.ADMIN]),
  async (req: AuthRequest, res: Response) => {
    try {
      const walletId = String(req.params.walletId);
      const updated = await WalletService.updateWalletPolicy(
        walletId,
        req.user!.id,
        req.body
      );
      return sendSuccess(res, updated, 200, { message: 'Kebijakan kuorum persetujuan berhasil diperbarui!' });
    } catch (err: any) {
      if (err instanceof ZodError) {
        return sendError(res, 'VALIDATION_ERROR', 'Format data kebijakan tidak valid.', 400, err.errors);
      }
      return sendError(
        res,
        err.code || 'UPDATE_POLICY_FAILED',
        err.message || 'Gagal memperbarui kebijakan kuorum dompet.',
        err.status || 400
      );
    }
  }
);

// 13. Update General Wallet Settings & Dues Config (ADMIN or PENGELOLA)
walletRouter.patch(
  '/:walletId/settings',
  requireAuth,
  requireWalletRole([WalletRole.ADMIN, WalletRole.PENGELOLA]),
  async (req: AuthRequest, res: Response) => {
    try {
      const walletId = String(req.params.walletId);
      const updated = await WalletService.updateWalletSettings(
        walletId,
        req.user!.id,
        req.body
      );
      return sendSuccess(res, updated, 200, { message: 'Pengaturan iuran dompet kas berhasil diperbarui!' });
    } catch (err: any) {
      if (err instanceof ZodError) {
        return sendError(res, 'VALIDATION_ERROR', 'Format data pengaturan tidak valid.', 400, err.errors);
      }
      return sendError(
        res,
        err.code || 'UPDATE_SETTINGS_FAILED',
        err.message || 'Gagal memperbarui pengaturan dompet.',
        err.status || 400
      );
    }
  }
);

