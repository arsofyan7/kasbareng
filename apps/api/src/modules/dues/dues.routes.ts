/**
 * ============================================================================
 * MODUL DUES: ROUTER PAPAN REKAPITULASI IURAN WARGA (dues.routes.ts)
 * ============================================================================
 * File routing ini mengekspos endpoint untuk fitur papan rekap iuran warga (Dues Board),
 * checklist pembayaran bulanan per anggota, persentase kepatuhan (compliance rate),
 * serta generator teks pesan pengingat iuran otomatis untuk WhatsApp.
 * 
 * Prinsip Transparansi:
 * Sesuai asas tata kelola kas komunitas yang terbuka, seluruh anggota aktif
 * (termasuk Warga biasa) memiliki hak visibilitas untuk melihat status iuran kas.
 */

import { Router, Response } from 'express';
import { requireAuth, requireWalletRole, AuthRequest } from '../auth/auth.middleware';
import { sendSuccess, sendError } from '../../common/response';
import { DuesService } from './dues.service';

export const duesRouter = Router();

/**
 * ============================================================================
 * ENDPOINT: GET /api/v1/wallets/:walletId/dues-board
 * ============================================================================
 * Fungsi Blok:
 * Mengambil ringkasan matriks pembayaran iuran 12 bulan (Januari - Desember) untuk tahun tertentu,
 * status lunas/belum lunas per warga, persentase kepatuhan, dan draf pesan WhatsApp reminder.
 * 
 * Konteks Otorisasi & RBAC:
 * - `requireAuth`: Memverifikasi JWT Bearer token user.
 * - `requireWalletRole()`: Memastikan pemohon terdaftar sebagai anggota aktif dompet (ADMIN, PENGELOLA, WARGA).
 * 
 * Alur Kerja:
 * 1. Mengambil parameter `walletId` dari URL.
 * 2. Mengambil query parameter `year` jika disediakan dan melakukan parsing integer (contoh: 2026).
 *    Jika tidak disediakan, service akan menggunakan tahun berjalan saat ini.
 * 3. Memanggil `DuesService.getDuesBoard(walletId, parsedYear)` untuk mengagregasi data transaksi dan keanggotaan.
 * 4. Mengembalikan respon HTTP 200 OK dengan payload struktur papan iuran.
 * 5. Menangani exception error dengan helper `sendError`.
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

