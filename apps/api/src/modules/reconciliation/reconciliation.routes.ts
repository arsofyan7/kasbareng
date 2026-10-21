import { Router, Response } from 'express';
import { ReconciliationService } from './reconciliation.service';
import { requireAuth, requireWalletRole, AuthRequest } from '../auth/auth.middleware';
import { sendSuccess, sendError } from '../../common/response';
import { WalletRole } from '@prisma/client';
import { z, ZodError } from 'zod';

export const reconciliationRouter = Router();

const ImportCsvSchema = z.object({
  csvContent: z.string().min(1, 'Isi CSV tidak boleh kosong.'),
  filename: z.string().optional().default('mutasi_rekening.csv'),
});

const ManualMatchSchema = z.object({
  bankStatementId: z.string().uuid('ID mutasi bank tidak valid.'),
  transactionId: z.string().uuid('ID transaksi tidak valid.'),
  reason: z.string().min(5, 'Alasan pencocokan manual minimal 5 karakter.'),
});

const CreateFromMutationSchema = z.object({
  bankStatementId: z.string().uuid('ID mutasi bank tidak valid.'),
  category: z.string().min(2, 'Kategori transaksi minimal 2 karakter.'),
  notes: z.string().optional(),
});

/**
 * 1. POST /wallets/:walletId/reconciliation/import
 * Imports bank statement CSV and triggers deterministic reconciliation matching.
 * Accessible by ADMIN and PENGELOLA.
 */
reconciliationRouter.post(
  '/wallets/:walletId/reconciliation/import',
  requireAuth,
  requireWalletRole([WalletRole.ADMIN, WalletRole.PENGELOLA]),
  async (req: AuthRequest, res: Response) => {
    try {
      const walletId = String(req.params.walletId);
      const actorId = req.user!.id;

      const validated = ImportCsvSchema.parse(req.body);

      const result = await ReconciliationService.importBankStatementCsv(
        walletId,
        actorId,
        validated.csvContent,
        validated.filename
      );

      return sendSuccess(res, result, 201, {
        message: `Berhasil mengimpor ${result.parseResult.totalRowsParsed} baris mutasi bank (${result.parseResult.detectedBankFormat}) dan mencocokkan ${result.summary.matchedCount} transaksi secara otomatis.`,
      });
    } catch (err: any) {
      if (err instanceof ZodError) {
        return sendError(res, 'VALIDATION_ERROR', err.errors[0].message, 400);
      }
      return sendError(
        res,
        err.code || 'CSV_IMPORT_FAILED',
        err.message || 'Gagal mengimpor dan merekonsiliasi CSV mutasi bank.',
        err.status || 500
      );
    }
  }
);

/**
 * 2. GET /wallets/:walletId/reconciliation/summary
 * Retrieves reconciliation statistics, bank statements, and unmatched transactions.
 * Accessible by all members (WARGA, PENGELOLA, ADMIN).
 */
reconciliationRouter.get(
  '/wallets/:walletId/reconciliation/summary',
  requireAuth,
  requireWalletRole(),
  async (req: AuthRequest, res: Response) => {
    try {
      const walletId = String(req.params.walletId);
      const importBatchId = req.query.importBatchId ? String(req.query.importBatchId) : undefined;

      const summary = await ReconciliationService.getReconciliationSummary(walletId, importBatchId);

      return sendSuccess(res, summary, 200, {
        message: 'Ringkasan rekonsiliasi bank berhasil dimuat.',
      });
    } catch (err: any) {
      return sendError(
        res,
        err.code || 'RECONCILIATION_SUMMARY_FAILED',
        err.message || 'Gagal memuat ringkasan rekonsiliasi.',
        err.status || 500
      );
    }
  }
);

/**
 * 3. POST /wallets/:walletId/reconciliation/manual-match
 * Manually matches an ambiguous or unmatched bank mutation with an internal transaction.
 * Specification Requirement: Records actor, timestamp, reason, and audit event.
 * Accessible by ADMIN and PENGELOLA.
 */
reconciliationRouter.post(
  '/wallets/:walletId/reconciliation/manual-match',
  requireAuth,
  requireWalletRole([WalletRole.ADMIN, WalletRole.PENGELOLA]),
  async (req: AuthRequest, res: Response) => {
    try {
      const walletId = String(req.params.walletId);
      const actorId = req.user!.id;

      const validated = ManualMatchSchema.parse(req.body);

      const result = await ReconciliationService.resolveManualMatch(
        walletId,
        actorId,
        validated.bankStatementId,
        validated.transactionId,
        validated.reason
      );

      return sendSuccess(res, result, 200, { message: result.message });
    } catch (err: any) {
      if (err instanceof ZodError) {
        return sendError(res, 'VALIDATION_ERROR', err.errors[0].message, 400);
      }
      return sendError(
        res,
        err.code || 'MANUAL_MATCH_FAILED',
        err.message || 'Gagal mencocokkan mutasi bank secara manual.',
        err.status || 500
      );
    }
  }
);

/**
 * 4. POST /wallets/:walletId/reconciliation/create-transaction
 * Creates a new KasBareng internal transaction from an unmatched bank mutation.
 * Accessible by ADMIN and PENGELOLA.
 */
reconciliationRouter.post(
  '/wallets/:walletId/reconciliation/create-transaction',
  requireAuth,
  requireWalletRole([WalletRole.ADMIN, WalletRole.PENGELOLA]),
  async (req: AuthRequest, res: Response) => {
    try {
      const walletId = String(req.params.walletId);
      const actorId = req.user!.id;

      const validated = CreateFromMutationSchema.parse(req.body);

      const result = await ReconciliationService.createTransactionFromBankMutation(
        walletId,
        actorId,
        validated.bankStatementId,
        validated.category,
        validated.notes
      );

      return sendSuccess(res, result, 201, { message: result.message });
    } catch (err: any) {
      if (err instanceof ZodError) {
        return sendError(res, 'VALIDATION_ERROR', err.errors[0].message, 400);
      }
      return sendError(
        res,
        err.code || 'CREATE_TRANSACTION_FROM_MUTATION_FAILED',
        err.message || 'Gagal membuat transaksi dari mutasi bank.',
        err.status || 500
      );
    }
  }
);
