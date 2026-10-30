/**
 * ============================================================================
 * MODUL TRANSAKSI: ROUTER MANAJEMEN TRANSAKSI & PERSETUJUAN KAS (transaction.routes.ts)
 * ============================================================================
 * File router ini mengelola seluruh siklus hidup transaksi kas komunitas:
 * 1. Ringkasan saldo kas aktif, dicadangkan (reserved), dan tersedia (available).
 * 2. Daftar riwayat transaksi dengan pembatasan hak lihat (Visibility Scoping RBAC).
 * 3. Pembuatan draf transaksi (INCOME oleh Warga/Pengurus, EXPENSE oleh Pengurus).
 * 4. Pengajuan (Submission) draf ke tahap persetujuan / verifikasi FSM.
 * 5. Multi-Approval M-of-N Quorum untuk pengeluaran kas (EXPENSE).
 * 6. Verifikasi tunggal (Single-Manager Verification) untuk setoran iuran warga (INCOME).
 * 7. Eksekusi pembayaran dan pembukuan resmi ke buku besar (Ledger DEBIT / CREDIT).
 * 8. Pembatalan (Cancellation) draf transaksi.
 */

import { Router, Response } from 'express';
import { TransactionService } from './transaction.service';
import { requireAuth, requireWalletRole, AuthRequest } from '../auth/auth.middleware';
import { sendSuccess, sendError } from '../../common/response';
import { WalletRole, TransactionType, TransactionState } from '@prisma/client';
import { ZodError } from 'zod';
import { prisma } from '../../common/prisma';

export const transactionRouter = Router();

/**
 * ============================================================================
 * ENDPOINT 1: GET /api/v1/wallets/:walletId/summary
 * ============================================================================
 * Fungsi Blok:
 * Menghitung dan mengembalikan posisi likuiditas kas dompet:
 * - Saldo Buku Besar (Total Balance)
 * - Saldo Dicadangkan (Reserved Balance) untuk pengeluaran yang sedang menunggu persetujuan
 * - Saldo Efektif Tersedia (Available Balance = Total Balance - Reserved Balance)
 * 
 * Konteks Otorisasi & RBAC:
 * - Terbuka untuk seluruh anggota aktif dompet (ADMIN, PENGELOLA, WARGA).
 */
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

/**
 * ============================================================================
 * ENDPOINT 2: GET /api/v1/wallets/:walletId/transactions
 * ============================================================================
 * Fungsi Blok:
 * Mengambil daftar transaksi kas dalam dompet dengan dukungan filter dan pagination.
 * 
 * Konteks Otorisasi & Visibility Scoping (RBAC):
 * - ADMIN & PENGELOLA: Berwenang melihat seluruh transaksi kas (INCOME dan EXPENSE) dari seluruh anggota.
 * - WARGA: Hanya berwenang melihat transaksi yang dilaporkan oleh dirinya sendiri (`creatorId = req.user.id`).
 * 
 * Alur Kerja:
 * 1. Periksa peran pemohon melalui `req.walletMember`.
 * 2. Tentukan parameter filter `creatorId` jika pemohon adalah WARGA.
 * 3. Panggil `TransactionService.getWalletTransactions` dengan filter tipe, state, dan paginasi.
 * 4. Kembalikan array transaksi dan pagination metadata.
 */
transactionRouter.get(
  '/wallets/:walletId/transactions',
  requireAuth,
  requireWalletRole(),
  async (req: AuthRequest, res: Response) => {
    try {
      const walletId = String(req.params.walletId);
      const { type, state, page, limit } = req.query;
      const member = req.walletMember!;

      // Pembatasan hak akses visibilitas transaksi berdasarkan RBAC
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

/**
 * ============================================================================
 * ENDPOINT 3: POST /api/v1/wallets/:walletId/transactions
 * ============================================================================
 * Fungsi Blok:
 * Membuat draf (DRAFT) transaksi baru di dalam sistem.
 * 
 * Aturan Bisnis & RBAC:
 * - ADMIN & PENGELOLA: Dapat membuat draf pemasukan (INCOME) maupun pengeluaran kas (EXPENSE).
 * - WARGA: Hanya diizinkan melaporkan setoran pemasukan kas/iuran (INCOME). Pengajuan EXPENSE oleh warga ditolak (403 FORBIDDEN).
 * 
 * Alur Kerja:
 * 1. Ambil `walletId` dan ID user yang sedang login.
 * 2. Cek peran anggota: Jika role WARGA dan payload bukan `INCOME`, tolak dengan 403 FORBIDDEN.
 * 3. Panggil `TransactionService.createDraft` untuk validasi Zod dan penyimpanan draf.
 * 4. Kembalikan respon 201 Created.
 */
transactionRouter.post(
  '/wallets/:walletId/transactions',
  requireAuth,
  requireWalletRole(),
  async (req: AuthRequest, res: Response) => {
    try {
      const walletId = String(req.params.walletId);
      const userId = req.user!.id;

      // Pengecekan izin peran: WARGA hanya dapat melaporkan pemasukan (INCOME)
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

/**
 * ============================================================================
 * ENDPOINT 4: GET /api/v1/transactions/:transactionId
 * ============================================================================
 * Fungsi Blok:
 * Mengambil rincian lengkap sebuah transaksi (termasuk riwayat persetujuan, entri buku besar, dan lampiran struk).
 * 
 * Konteks Otorisasi & RBAC:
 * - Memeriksa keanggotaan aktif pemohon pada dompet transaksi terkait.
 * - Jika pemohon berposisi sebagai WARGA, ia hanya boleh membuka detail transaksi yang ia buat sendiri.
 */
transactionRouter.get(
  '/transactions/:transactionId',
  requireAuth,
  async (req: AuthRequest, res: Response) => {
    try {
      const transactionId = String(req.params.transactionId);
      const transaction = await TransactionService.getTransactionById(transactionId);

      // Verifikasi bahwa user adalah anggota aktif dompet kas bersangkutan
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

      // WARGA hanya dapat melihat detail transaksi yang dilaporkan oleh dirinya sendiri
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

/**
 * ============================================================================
 * ENDPOINT 5: PATCH /api/v1/transactions/:transactionId
 * ============================================================================
 * Fungsi Blok:
 * Memperbarui konten draf transaksi yang masih berstatus `DRAFT`.
 * 
 * Konteks RBAC:
 * - Hanya dapat dilakukan oleh ADMIN atau PENGELOLA.
 */
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

/**
 * ============================================================================
 * ENDPOINT 6: POST /api/v1/transactions/:transactionId/submit
 * ============================================================================
 * Fungsi Blok:
 * Mengajukan transaksi dari status `DRAFT` ke proses persetujuan (SUBMITTED / PENDING_APPROVAL).
 * 
 * Aturan Otorisasi:
 * - EXPENSE: Hanya Admin atau Pengelola yang berwenang mengajukan pencairan/pengeluaran dana kas.
 * - INCOME: Admin, Pengelola, atau anggota warga yang membuat draf laporan iuran tersebut berhak mengajukannya.
 * 
 * Penguncian Likuiditas (Reserve Balance):
 * Untuk transaksi EXPENSE, saat disubmit sistem memvalidasi kecukupan saldo tersedia (Available Balance)
 * dan secara otomatis mencadangkan dana tersebut agar tidak terjadi double-spending.
 */
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

      // Validasi hak pengajuan berdasarkan jenis transaksi
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

/**
 * ============================================================================
 * ENDPOINT 7: POST /api/v1/transactions/:transactionId/cancel
 * ============================================================================
 * Fungsi Blok:
 * Membatalkan draf atau pengajuan transaksi yang belum dieksekusi.
 * 
 * Konteks RBAC:
 * - Hanya dapat dibatalkan oleh pembuat transaksi (creator) atau oleh ADMIN dompet.
 */
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

/**
 * ============================================================================
 * ENDPOINT 8: POST /api/v1/transactions/:transactionId/approvals
 * ============================================================================
 * Fungsi Blok:
 * Merekam suara persetujuan (APPROVE) atau penolakan (REJECT) dari pengurus dompet
 * untuk pengeluaran kas (EXPENSE) berbasis kuorum M-of-N.
 * 
 * Konteks Otorisasi:
 * - Dibatasi ketat hanya untuk ADMIN dan PENGELOLA.
 * - Menggunakan optimis locking (expectedVersion) untuk mencegah race condition persetujuan paralel.
 * 
 * Alur Kerja:
 * 1. Panggil `TransactionService.processApproval`.
 * 2. Algoritma Quorum Evaluator mengevaluasi ambang batas M suara.
 * 3. Jika kuorum terpenuhi, status berpindah ke `APPROVED`.
 * 4. Jika ada penolakan, status langsung menjadi `REJECTED` dan cadangan saldo dilepas.
 */
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

/**
 * ============================================================================
 * ENDPOINT 9: POST /api/v1/transactions/:transactionId/pay
 * ============================================================================
 * Fungsi Blok:
 * Mengeksekusi pembayaran pengeluaran kas yang telah disetujui kuorum (`APPROVED`),
 * membukukan entri buku besar resmi (Ledger DEBIT), mencatat bukti transfer,
 * dan memindahkan status transaksi ke `COMPLETED`.
 * 
 * Konteks Otorisasi:
 * - Khusus ADMIN atau PENGELOLA.
 */
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

/**
 * ============================================================================
 * ENDPOINT 10: POST /api/v1/transactions/:transactionId/verify-income
 * ============================================================================
 * Fungsi Blok:
 * Memverifikasi laporan setoran kas/iuran (INCOME) mandiri dari warga.
 * Menerapkan skema Single-Manager Verification (cukup satu pengurus ADMIN atau PENGELOLA).
 * 
 * Alur Kerja:
 * 1. Validasi keputusan ('APPROVE' atau 'REJECT').
 * 2. Jika disetujui (`APPROVE`):
 *    - Transaksi berpindah ke `COMPLETED`.
 *    - Sistem memposting entri buku besar resmi (Ledger CREDIT) sehingga saldo kas aktif bertambah seketika.
 *    - Status iuran di `DuesRecord` diperbarui menjadi `PAID`.
 * 3. Jika ditolak (`REJECT`):
 *    - Transaksi berpindah ke `REJECTED`.
 *    - Catatan iuran dihapus agar warga dapat melaporkan ulang dengan bukti transfer yang benar.
 * 4. Mencatat peristiwa ke tamper-evident audit hash chain SHA-256.
 */
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
