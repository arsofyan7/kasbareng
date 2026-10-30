/**
 * ============================================================================
 * MODUL AUDIT: ROUTER AUDIT TRAIL & TAMPER-EVIDENT HASH CHAIN (audit.routes.ts)
 * ============================================================================
 * Modul ini menyediakan endpoint API untuk memverifikasi keutuhan audit trail kriptografis (SHA-256),
 * membaca rekaman histori event secara terpaginasi, serta melakukan simulasi manipulasi data
 * (tamper drill) dan pemulihan (repair) khusus untuk demonstrasi integritas data bagi Administrator.
 * 
 * Prinsip Keamanan:
 * Audit trail menerapkan arsitektur immutable append-only hash chain yang mirip dengan blockchain,
 * di mana setiap event memuat hash dari event sebelumnya. Setiap anggota komunitas (termasuk Warga)
 * berhak memverifikasi integritas rantai secara matematis secara transparan.
 */

import { Router, Response } from 'express';
import { AuditService } from './audit.service';
import { requireAuth, requireWalletRole, AuthRequest } from '../auth/auth.middleware';
import { sendSuccess, sendError } from '../../common/response';
import { WalletRole } from '@prisma/client';
import { z, ZodError } from 'zod';

export const auditRouter = Router();

/**
 * Skema Validasi Zod: Simulasi Manipulasi Data
 * - `sequenceNo`: Nomor urut log yang akan dirusak (harus bilangan bulat positif).
 * - `maliciousPayload`: Payload palsu/manipulasi yang akan disuntikkan langsung ke database.
 */
const SimulateTamperSchema = z.object({
  sequenceNo: z.number().int().positive('Sequence number harus bilangan bulat positif'),
  maliciousPayload: z.string().min(1, 'Payload manipulasi tidak boleh kosong'),
});

/**
 * Skema Validasi Zod: Pemulihan Log Setelah Simulasi
 * - `sequenceNo`: Nomor urut log yang akan dipulihkan.
 * - `restoredPayload`: Payload asli sebelum dimanipulasi.
 */
const RepairLogSchema = z.object({
  sequenceNo: z.number().int().positive(),
  restoredPayload: z.string().min(1),
});

/**
 * ============================================================================
 * ENDPOINT 1: GET /api/v1/wallets/:walletId/audit/verify
 * ============================================================================
 * Fungsi Blok:
 * Menjalankan kalkulasi verifikasi matematis seluruh rantai hash audit trail dompet secara runut (sequential).
 * 
 * Konteks Otorisasi & RBAC:
 * - `requireAuth`: Memastikan request membawa JWT token yang valid.
 * - `requireWalletRole()`: Terbuka untuk seluruh anggota aktif wallet (ADMIN, PENGELOLA, WARGA)
 *   sesuai prinsip transparansi kas komunitas.
 * 
 * Alur Kerja:
 * 1. Mengambil parameter `walletId`.
 * 2. Memanggil `AuditService.verifyWalletChain(walletId)` yang mengomputasi ulang SHA-256 dari setiap log.
 * 3. Menghasilkan pesan status: apakah rantai 100% utuh atau ditemukan anomali pada sequence tertentu.
 * 4. Mengembalikan respon sukses 200 OK dengan detail verifikasi (total diperiksa, validitas, sequence yang rusak jika ada).
 */
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

/**
 * ============================================================================
 * ENDPOINT 2: GET /api/v1/wallets/:walletId/audit/events
 * ============================================================================
 * Fungsi Blok:
 * Mengambil daftar kronologis peristiwa/event audit yang terjadi di dompet secara terpaginasi.
 * 
 * Konteks Otorisasi & RBAC:
 * - Terbuka bagi seluruh anggota dompet terverifikasi (ADMIN, PENGELOLA, WARGA).
 * 
 * Alur Kerja:
 * 1. Ekstrak query parameter `page` (default: 1) dan `limit` (default: 20).
 * 2. Memanggil `AuditService.getWalletAuditLogs` dengan paginasi.
 * 3. Mengembalikan daftar rekaman log beserta metadata paginasi (total count, total pages, current page).
 */
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

/**
 * ============================================================================
 * ENDPOINT 3: POST /api/v1/wallets/:walletId/audit/simulate-tamper
 * ============================================================================
 * Fungsi Blok:
 * Melakukan simulasi manipulasi data jahat (dril uji keamanan) dengan mengubah payload
 * suatu baris audit secara langsung di database tanpa menghitung ulang hash.
 * 
 * Konteks Otorisasi & RBAC:
 * - Dibatasi ketat hanya untuk role ADMIN (`requireWalletRole([WalletRole.ADMIN])`).
 * 
 * Alur Kerja:
 * 1. Validasi request body menggunakan `SimulateTamperSchema` Zod.
 * 2. Memanggil `AuditService.simulateTamper` untuk menyuntikkan payload palsu.
 * 3. Mengembalikan notifikasi sukses simulasi agar user dapat segera memicu verifikasi
 *    dan melihat bagaimana sistem mendeteksi ketidaksesuaian hash secara presisi.
 */
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

/**
 * ============================================================================
 * ENDPOINT 4: POST /api/v1/wallets/:walletId/audit/repair
 * ============================================================================
 * Fungsi Blok:
 * Mengembalikan data log audit ke payload aslinya setelah dilakukan pengujian simulasi tamper.
 * 
 * Konteks Otorisasi & RBAC:
 * - Dibatasi ketat hanya untuk role ADMIN (`requireWalletRole([WalletRole.ADMIN])`).
 * 
 * Alur Kerja:
 * 1. Validasi payload menggunakan `RepairLogSchema` Zod.
 * 2. Memanggil `AuditService.repairLog` untuk menyimpan kembali payload yang benar.
 * 3. Mengembalikan konfirmasi keberhasilan pemulihan rekaman log audit.
 */
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

