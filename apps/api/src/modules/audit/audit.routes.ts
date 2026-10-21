import { Router, Response } from 'express';
import { AuditService } from './audit.service';
import { requireAuth, requireWalletRole, AuthRequest } from '../auth/auth.middleware';
import { sendSuccess, sendError } from '../../common/response';
import { WalletRole } from '@prisma/client';
import { z, ZodError } from 'zod';

export const auditRouter = Router();

const SimulateTamperSchema = z.object({
  sequenceNo: z.number().int().positive('Sequence number harus bilangan bulat positif'),
  maliciousPayload: z.string().min(1, 'Payload manipulasi tidak boleh kosong'),
});

const RepairLogSchema = z.object({
  sequenceNo: z.number().int().positive(),
  restoredPayload: z.string().min(1),
});

// 1. Verify Wallet Audit Hash Chain (Any active member can verify integrity)
auditRouter.get(
  '/wallets/:walletId/audit/verify',
  requireAuth,
  requireWalletRole(),
  async (req: AuthRequest, res: Response) => {
    try {
      const walletId = String(req.params.walletId);
      const result = await AuditService.verifyWalletChain(walletId);

      const message = result.valid
        ? 'Rantai audit SHA-256 valid dan utuh pada seluruh rentang yang diperiksa.'
        : `Peringatan Keamanan: Terdeteksi manipulasi data pada sequence #${result.failedSequenceNo}! (${result.errorMessage})`;

      return sendSuccess(res, result, 200, { message });
    } catch (err: any) {
      return sendError(
        res,
        err.code || 'AUDIT_VERIFICATION_FAILED',
        err.message || 'Gagal memverifikasi integritas rantai audit.',
        err.status || 500
      );
    }
  }
);

// 2. List Wallet Audit Events (Any active member)
auditRouter.get(
  '/wallets/:walletId/audit/events',
  requireAuth,
  requireWalletRole(),
  async (req: AuthRequest, res: Response) => {
    try {
      const walletId = String(req.params.walletId);
      const page = req.query.page ? parseInt(String(req.query.page), 10) : 1;
      const limit = req.query.limit ? parseInt(String(req.query.limit), 10) : 20;

      const result = await AuditService.getWalletAuditLogs(walletId, { page, limit });

      return sendSuccess(res, result.logs, 200, {
        pagination: result.pagination,
      });
    } catch (err: any) {
      return sendError(
        res,
        err.code || 'AUDIT_LOGS_FAILED',
        err.message || 'Gagal memuat log audit.',
        err.status || 500
      );
    }
  }
);

// 3. Simulate Tampering Drill (ADMIN only for testing/demonstration)
auditRouter.post(
  '/wallets/:walletId/audit/simulate-tamper',
  requireAuth,
  requireWalletRole([WalletRole.ADMIN]),
  async (req: AuthRequest, res: Response) => {
    try {
      const walletId = String(req.params.walletId);
      const validated = SimulateTamperSchema.parse(req.body);

      const result = await AuditService.simulateTamper(
        walletId,
        validated.sequenceNo,
        validated.maliciousPayload
      );

      return sendSuccess(res, result, 200, {
        message: `Simulasi manipulasi berhasil diterapkan pada sequence #${validated.sequenceNo}. Jalankan verifikasi untuk melihat deteksi pelanggaran.`,
      });
    } catch (err: any) {
      if (err instanceof ZodError) {
        return sendError(res, 'VALIDATION_ERROR', 'Format data tidak valid.', 400, err.errors);
      }
      return sendError(
        res,
        err.code || 'TAMPER_FAILED',
        err.message || 'Gagal menyimulasikan manipulasi.',
        err.status || 400
      );
    }
  }
);

// 4. Restore/Repair after Tampering Drill (ADMIN only)
auditRouter.post(
  '/wallets/:walletId/audit/repair',
  requireAuth,
  requireWalletRole([WalletRole.ADMIN]),
  async (req: AuthRequest, res: Response) => {
    try {
      const walletId = String(req.params.walletId);
      const validated = RepairLogSchema.parse(req.body);

      const result = await AuditService.repairLog(
        walletId,
        validated.sequenceNo,
        validated.restoredPayload
      );

      return sendSuccess(res, result, 200, {
        message: `Data log sequence #${validated.sequenceNo} berhasil dikembalikan ke format aslinya.`,
      });
    } catch (err: any) {
      if (err instanceof ZodError) {
        return sendError(res, 'VALIDATION_ERROR', 'Format data tidak valid.', 400, err.errors);
      }
      return sendError(
        res,
        err.code || 'REPAIR_FAILED',
        err.message || 'Gagal mengembalikan data log.',
        err.status || 400
      );
    }
  }
);
