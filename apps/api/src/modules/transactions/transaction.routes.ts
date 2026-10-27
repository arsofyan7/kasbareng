import { Router, Response } from 'express';
import { TransactionService } from './transaction.service';
import { requireAuth, requireWalletRole, AuthRequest } from '../auth/auth.middleware';
import { sendSuccess, sendError } from '../../common/response';
import { WalletRole, TransactionType, TransactionState } from '@prisma/client';
import { ZodError } from 'zod';
import { prisma } from '../../common/prisma';

export const transactionRouter = Router();

// 1. Get Wallet Balance Summary
transactionRouter.get(
  '/wallets/:walletId/summary',
  requireAuth,
  requireWalletRole(),
  async (req: AuthRequest, res: Response) => {
    try {
      const walletId = String(req.params.walletId);
      const summary = await TransactionService.getWalletBalanceSummary(walletId);
      return sendSuccess(res, summary, 200);
    } catch (err: any) {
      return sendError(res, err.code || 'INTERNAL_ERROR', err.message || 'Gagal menghitung saldo dompet.', err.status || 500);
    }
  }
);

// 2. List Wallet Transactions
transactionRouter.get(
  '/wallets/:walletId/transactions',
  requireAuth,
  requireWalletRole(),
  async (req: AuthRequest, res: Response) => {
    try {
      const walletId = String(req.params.walletId);
      const { type, state, page, limit } = req.query;
      const member = req.walletMember!;

      // Scope transaction visibility:
      // ADMIN & PENGELOLA: can see all transactions.
      // WARGA: can ONLY see transactions created by themselves.
      const creatorId = member.role === WalletRole.WARGA ? req.user!.id : undefined;

      const result = await TransactionService.getWalletTransactions(walletId, {
        type: type as TransactionType,
        state: state as TransactionState,
        page: page ? parseInt(String(page), 10) : 1,
        limit: limit ? parseInt(String(limit), 10) : 20,
        creatorId,
      });

      return sendSuccess(res, result.transactions, 200, {
        pagination: result.pagination,
      });
    } catch (err: any) {
      return sendError(res, err.code || 'INTERNAL_ERROR', err.message || 'Gagal memuat transaksi.', err.status || 500);
    }
  }
);

// 3. Create Transaction Draft (ADMIN / PENGELOLA can create any; WARGA can report INCOME only)
transactionRouter.post(
  '/wallets/:walletId/transactions',
  requireAuth,
  requireWalletRole(),
  async (req: AuthRequest, res: Response) => {
    try {
      const walletId = String(req.params.walletId);
      const userId = req.user!.id;

      // Check role permissions: WARGA can only create INCOME
      const member = await prisma.walletMember.findUnique({
        where: {
          walletId_userId: {
            walletId,
            userId,
          },
        },
      });

      if (member?.role === WalletRole.WARGA && req.body.type !== TransactionType.INCOME) {
        return sendError(
          res,
          'FORBIDDEN',
          'Anggota warga hanya dapat melaporkan pemasukan / iuran kas. Pengeluaran hanya dapat diajukan oleh Pengelola atau Admin.',
          403
        );
      }

      const transaction = await TransactionService.createDraft(
        walletId,
        userId,
        req.body
      );
      return sendSuccess(res, transaction, 201);
    } catch (err: any) {
      if (err instanceof ZodError) {
        return sendError(res, 'VALIDATION_ERROR', 'Format data tidak valid.', 400, err.errors);
      }
      return sendError(
        res,
        err.code || 'CREATE_TRANSACTION_FAILED',
        err.message || 'Gagal membuat draf transaksi.',
        err.status || 400
      );
    }
  }
);

// 4. Get Transaction Details (checks membership of the wallet)
transactionRouter.get(
  '/transactions/:transactionId',
  requireAuth,
  async (req: AuthRequest, res: Response) => {
    try {
      const transactionId = String(req.params.transactionId);
      const transaction = await TransactionService.getTransactionById(transactionId);

      // Verify caller is member of this wallet
      const member = await prisma.walletMember.findUnique({
        where: {
          walletId_userId: {
            walletId: transaction.walletId,
            userId: req.user!.id,
          },
        },
      });

      if (!member || member.status !== 'ACTIVE') {
        return sendError(res, 'FORBIDDEN', 'Anda bukan anggota aktif dari dompet transaksi ini.', 403);
      }

      // WARGA can only view details of transactions they created themselves
      if (member.role === WalletRole.WARGA && transaction.creatorId !== req.user!.id) {
        return sendError(
          res,
          'FORBIDDEN',
          'Anda hanya berwenang melihat detail transaksi yang Anda laporkan sendiri.',
          403
        );
      }

      return sendSuccess(res, transaction, 200);
    } catch (err: any) {
      return sendError(res, err.code || 'INTERNAL_ERROR', err.message || 'Gagal memuat detail transaksi.', err.status || 500);
    }
  }
);

// 5. Update Draft (ADMIN / PENGELOLA)
transactionRouter.patch(
  '/transactions/:transactionId',
  requireAuth,
  async (req: AuthRequest, res: Response) => {
    try {
      const transactionId = String(req.params.transactionId);
      const transaction = await prisma.transaction.findUnique({
        where: { id: transactionId },
        select: { walletId: true },
      });

      if (!transaction) {
        return sendError(res, 'NOT_FOUND', 'Transaksi tidak ditemukan.', 404);
      }

      const member = await prisma.walletMember.findUnique({
        where: {
          walletId_userId: {
            walletId: transaction.walletId,
            userId: req.user!.id,
          },
        },
      });

      if (!member || (member.role !== WalletRole.ADMIN && member.role !== WalletRole.PENGELOLA)) {
        return sendError(res, 'FORBIDDEN', 'Hanya Pengelola atau Admin yang dapat mengubah draf transaksi.', 403);
      }

      const updated = await TransactionService.updateDraft(
        transactionId,
        req.user!.id,
        req.body
      );

      return sendSuccess(res, updated, 200);
    } catch (err: any) {
      if (err instanceof ZodError) {
        return sendError(res, 'VALIDATION_ERROR', 'Format data tidak valid.', 400, err.errors);
      }
      return sendError(
        res,
        err.code || 'UPDATE_TRANSACTION_FAILED',
        err.message || 'Gagal mengubah transaksi.',
        err.status || 400
      );
    }
  }
);

// 6. Submit Transaction
transactionRouter.post(
  '/transactions/:transactionId/submit',
  requireAuth,
  async (req: AuthRequest, res: Response) => {
    try {
      const transactionId = String(req.params.transactionId);
      const { expectedVersion } = req.body || {};

      const transaction = await prisma.transaction.findUnique({
        where: { id: transactionId },
        select: { walletId: true, type: true, creatorId: true },
      });

      if (!transaction) {
        return sendError(res, 'NOT_FOUND', 'Transaksi tidak ditemukan.', 404);
      }

      const member = await prisma.walletMember.findUnique({
        where: {
          walletId_userId: {
            walletId: transaction.walletId,
            userId: req.user!.id,
          },
        },
      });

      if (!member) {
        return sendError(res, 'FORBIDDEN', 'Anda bukan anggota dompet kas ini.', 403);
      }

      // Role check based on transaction type:
      // EXPENSE: Only Admin and Pengelola can propose spending
      // INCOME: Admin, Pengelola, or the member creator can submit their income/dues report
      if (transaction.type === TransactionType.EXPENSE) {
        if (member.role !== WalletRole.ADMIN && member.role !== WalletRole.PENGELOLA) {
          return sendError(res, 'FORBIDDEN', 'Hanya Pengelola atau Admin yang dapat mengajukan pengeluaran kas.', 403);
        }
      } else {
        if (
          member.role !== WalletRole.ADMIN &&
          member.role !== WalletRole.PENGELOLA &&
          transaction.creatorId !== req.user!.id
        ) {
          return sendError(res, 'FORBIDDEN', 'Hanya pengelola atau anggota yang bersangkutan yang dapat mengajukan laporan setoran ini.', 403);
        }
      }

      const result = await TransactionService.submitTransaction(
        transactionId,
        req.user!.id,
        expectedVersion
      );

      return sendSuccess(res, result, 200);
    } catch (err: any) {
      return sendError(
        res,
        err.code || 'SUBMIT_FAILED',
        err.message || 'Gagal mengajukan transaksi.',
        err.status || 400
      );
    }
  }
);

// 7. Cancel Transaction
transactionRouter.post(
  '/transactions/:transactionId/cancel',
  requireAuth,
  async (req: AuthRequest, res: Response) => {
    try {
      const transactionId = String(req.params.transactionId);
      const { reason } = req.body || {};

      const transaction = await prisma.transaction.findUnique({
        where: { id: transactionId },
        select: { walletId: true, creatorId: true },
      });

      if (!transaction) {
        return sendError(res, 'NOT_FOUND', 'Transaksi tidak ditemukan.', 404);
      }

      const member = await prisma.walletMember.findUnique({
        where: {
          walletId_userId: {
            walletId: transaction.walletId,
            userId: req.user!.id,
          },
        },
      });

      if (!member || (member.role !== WalletRole.ADMIN && transaction.creatorId !== req.user!.id)) {
        return sendError(res, 'FORBIDDEN', 'Hanya pembuat transaksi atau Admin yang dapat membatalkan transaksi ini.', 403);
      }

      const result = await TransactionService.cancelTransaction(
        transactionId,
        req.user!.id,
        reason
      );

      return sendSuccess(res, result, 200);
    } catch (err: any) {
      return sendError(
        res,
        err.code || 'CANCEL_FAILED',
        err.message || 'Gagal membatalkan transaksi.',
        err.status || 400
      );
    }
  }
);

// 8. Submit Approval / Rejection Decision (ADMIN / PENGELOLA)
transactionRouter.post(
  '/transactions/:transactionId/approvals',
  requireAuth,
  async (req: AuthRequest, res: Response) => {
    try {
      const transactionId = String(req.params.transactionId);
      const result = await TransactionService.processApproval(
        transactionId,
        req.user!.id,
        req.body
      );

      const msg =
        req.body?.decision === 'REJECT'
          ? 'Keputusan penolakan transaksi telah dicatat.'
          : result.quorumResult.approved
          ? 'Kuorum terpenuhi! Pengeluaran kas berhasil disetujui.'
          : 'Persetujuan Anda telah dicatat. Menunggu persetujuan pengelola/admin lainnya.';

      return sendSuccess(res, result, 200, { message: msg });
    } catch (err: any) {
      if (err instanceof ZodError) {
        return sendError(res, 'VALIDATION_ERROR', 'Format data persetujuan tidak valid.', 400, err.errors);
      }
      return sendError(
        res,
        err.code || 'APPROVAL_FAILED',
        err.message || 'Gagal memproses persetujuan transaksi.',
        err.status || 400
      );
    }
  }
);

// 9. Execute Payment & Post Ledger DEBIT (ADMIN / PENGELOLA)
transactionRouter.post(
  ['/transactions/:transactionId/pay', '/transactions/:transactionId/payment-records'],
  requireAuth,
  async (req: AuthRequest, res: Response) => {
    try {
      const transactionId = String(req.params.transactionId);
      const result = await TransactionService.executePayment(
        transactionId,
        req.user!.id,
        req.body
      );

      return sendSuccess(res, result, 200, {
        message: 'Pembayaran kas berhasil dieksekusi dan dibukukan resmi ke ledger.',
      });
    } catch (err: any) {
      if (err instanceof ZodError) {
        return sendError(res, 'VALIDATION_ERROR', 'Format data pembayaran tidak valid.', 400, err.errors);
      }
      return sendError(
        res,
        err.code || 'PAYMENT_EXECUTION_FAILED',
        err.message || 'Gagal mengeksekusi pembayaran transaksi.',
        err.status || 400
      );
    }
  }
);

// 10. Verify Income Report (Single-approver: ADMIN / PENGELOLA)
transactionRouter.post(
  '/transactions/:transactionId/verify-income',
  requireAuth,
  async (req: AuthRequest, res: Response) => {
    try {
      const transactionId = String(req.params.transactionId);
      const actorId = req.user!.id;
      const { decision, notes } = req.body;

      if (!decision || !['APPROVE', 'REJECT'].includes(decision)) {
        return sendError(res, 'INVALID_PAYLOAD', 'Keputusan harus berupa APPROVE atau REJECT.', 400);
      }

      const result = await TransactionService.verifyIncomeReport(transactionId, actorId, {
        decision,
        notes,
      });

      const message =
        decision === 'APPROVE'
          ? 'Laporan pemasukan kas berhasil diverifikasi dan dibukukan ke saldo kas aktif.'
          : 'Laporan pemasukan kas telah ditolak.';

      return sendSuccess(res, result, 200, { message });
    } catch (err: any) {
      if (err instanceof ZodError) {
        return sendError(res, 'VALIDATION_ERROR', 'Format data verifikasi tidak valid.', 400, err.errors);
      }
      return sendError(
        res,
        err.code || 'VERIFY_INCOME_FAILED',
        err.message || 'Gagal memproses verifikasi laporan pemasukan.',
        err.status || 400
      );
    }
  }
);