/**
 * ============================================================================
 * MODUL REKONSILIASI: ROUTER REKONSILIASI BANK (reconciliation.routes.ts)
 * ============================================================================
 * File ini menangani endpoint API untuk fitur rekonsiliasi mutasi rekening koran bank:
 * 1. Unggah dan impor CSV rekening bank (`/reconciliation/import`).
 * 2. Mengambil ringkasan statistik kecocokan dan daftar transaksi anomali (`/reconciliation/summary`).
 * 3. Resolusi pencocokan manual dengan pencatatan alasan audit trail (`/reconciliation/manual-match`).
 * 4. Pembuatan transaksi internal KasBareng baru langsung dari mutasi bank yang belum tercatat (`/reconciliation/create-transaction`).
 * 
 * Prinsip Otorisasi & RBAC:
 * - Operasi tulis / perubahan rekonsiliasi dibatasi untuk peran ADMIN dan PENGELOLA.
 * - Pembacaan ringkasan statistik rekonsiliasi terbuka bagi seluruh anggota (termasuk WARGA) demi transparansi.
 */

import { Router, Response } from 'express';
import { ReconciliationService } from './reconciliation.service';
import { requireAuth, requireWalletRole, AuthRequest } from '../auth/auth.middleware';
import { sendSuccess, sendError } from '../../common/response';
import { WalletRole } from '@prisma/client';
import { z, ZodError } from 'zod';

export const reconciliationRouter = Router();

/**
 * Skema Validasi Zod: Impor Berkas CSV Rekening Koran
 * - `csvContent`: String isi file CSV mentah (wajib tidak boleh kosong).
 * - `filename`: Nama file CSV opsional (default: 'mutasi_rekening.csv').
 */
const ImportCsvSchema = z.object({
  csvContent: z.string().min(1, 'Isi CSV tidak boleh kosong.'),
  filename: z.string().optional().default('mutasi_rekening.csv'),
});

/**
 * Skema Validasi Zod: Pencocokan Manual (Manual Match)
 * - `bankStatementId`: UUID baris mutasi bank.
 * - `transactionId`: UUID transaksi internal kas.
 * - `reason`: Catatan alasan audit pencocokan manual (minimal 5 karakter).
 */
const ManualMatchSchema = z.object({
  bankStatementId: z.string().uuid('ID mutasi bank tidak valid.'),
  transactionId: z.string().uuid('ID transaksi tidak valid.'),
  reason: z.string().min(5, 'Alasan pencocokan manual minimal 5 karakter.'),
});

/**
 * Skema Validasi Zod: Pembuatan Transaksi dari Mutasi Bank
 * - `bankStatementId`: UUID baris mutasi bank yang belum memiliki padanan transaksi internal.
 * - `category`: Kategori transaksi (misal: "Bunga Bank", "Pajak Bunga", "Biaya Admin").
 * - `notes`: Catatan opsional.
 */
const CreateFromMutationSchema = z.object({
  bankStatementId: z.string().uuid('ID mutasi bank tidak valid.'),
  category: z.string().min(2, 'Kategori transaksi minimal 2 karakter.'),
  notes: z.string().optional(),
});

/**
 * ============================================================================
 * ENDPOINT 1: POST /api/v1/wallets/:walletId/reconciliation/import
 * ============================================================================
 * Fungsi Blok:
 * Menerima unggahan teks CSV mutasi bank, menjalankan parser bank statement,
 * menyimpan baris mutasi ke database, dan mengeksekusi algoritma 3-Pass Deterministic Matching.
 * 
 * Konteks Otorisasi & RBAC:
 * - `requireAuth`: Memastikan token JWT valid.
 * - `requireWalletRole([ADMIN, PENGELOLA])`: Dibatasi khusus pengurus dompet kas.
 * 
 * Alur Kerja:
 * 1. Ambil `walletId` dari URL parameter dan `actorId` dari user yang login.
 * 2. Validasi body menggunakan `ImportCsvSchema`.
 * 3. Panggil `ReconciliationService.importBankStatementCsv`.
 * 4. Layanan akan mem-parsing CSV, mencatat batch impor, mencocokkan transaksi internal,
 *    dan merekam audit trail SHA-256.
 * 5. Kembalikan respon 201 Created dengan ringkasan jumlah baris terimpor dan transaksi yang cocok otomatis.
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
 * ============================================================================
 * ENDPOINT 2: GET /api/v1/wallets/:walletId/reconciliation/summary
 * ============================================================================
 * Fungsi Blok:
 * Mengambil statistik menyeluruh status rekonsiliasi (total mutasi bank, total cocok,
 * total gantung/belum cocok, dan transaksi kas yang tidak ditemukan di rekening koran).
 * 
 * Konteks Otorisasi & RBAC:
 * - Terbuka untuk seluruh anggota terverifikasi (ADMIN, PENGELOLA, WARGA).
 * 
 * Alur Kerja:
 * 1. Ekstrak `walletId` dan opsional `importBatchId` dari query string.
 * 2. Panggil `ReconciliationService.getReconciliationSummary`.
 * 3. Kembalikan respon 200 OK beserta metrik persentase kecocokan rekening koran.
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
 * ============================================================================
 * ENDPOINT 3: POST /api/v1/wallets/:walletId/reconciliation/manual-match
 * ============================================================================
 * Fungsi Blok:
 * Memfasilitasi bendahara/pengurus untuk mengaitkan secara manual satu mutasi bank
 * yang ambigu dengan transaksi internal kas yang bersesuaian, lengkap dengan alasan audit.
 * 
 * Konteks Otorisasi & RBAC:
 * - Khusus peran ADMIN dan PENGELOLA.
 * 
 * Alur Kerja:
 * 1. Validasi body menggunakan `ManualMatchSchema` (memastikan ID mutasi, ID transaksi, dan alasan minimal 5 karakter).
 * 2. Panggil `ReconciliationService.resolveManualMatch`.
 * 3. Status mutasi diubah menjadi MATCHED (rule: MANUAL_MATCH) dan event audit dicatat ke hash chain.
 * 4. Kembalikan respon 200 OK.
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
 * ============================================================================
 * ENDPOINT 4: POST /api/v1/wallets/:walletId/reconciliation/create-transaction
 * ============================================================================
 * Fungsi Blok:
 * Menangani kasus di mana terdapat mutasi di rekening bank (misal: bunga tabungan bank,
 * pajak bunga, atau transfer warga tanpa konfirmasi) yang belum dibuatkan draft transaksinya di sistem.
 * Endpoint ini secara instan membukukan transaksi kas dan langsung menandainya sebagai MATCHED.
 * 
 * Konteks Otorisasi & RBAC:
 * - Khusus peran ADMIN dan PENGELOLA.
 * 
 * Alur Kerja:
 * 1. Validasi body menggunakan `CreateFromMutationSchema`.
 * 2. Panggil `ReconciliationService.createTransactionFromBankMutation`.
 * 3. Transaksi baru dibuat dengan status APPROVED/EXECUTED, saldo kas diperbarui,
 *    dan mutasi bank ditautkan.
 * 4. Kembalikan respon 201 Created beserta data transaksi yang baru terbentuk.
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

