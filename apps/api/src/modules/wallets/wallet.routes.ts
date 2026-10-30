/**
 * ============================================================================
 * MODUL WALLETS: ROUTER MANAJEMEN DOMPET, ANGGOTA & ATURAN KUORUM (wallet.routes.ts)
 * ============================================================================
 * File routing ini mengekspos endpoint manajemen dompet kas komunitas:
 * 1. Pratinjau dompet via kode undangan terbuka (`/preview-invite/:code`).
 * 2. Cek ketersediaan custom invite code (`/check-code/:code`).
 * 3. Bergabung instan sebagai WARGA via invite code (`/join`).
 * 4. Daftar dompet pengguna (`/`).
 * 5. Pembuatan dompet baru (`/`) di mana pembuat otomatis menjadi ADMIN.
 * 6. Manajemen kode undangan (regenerasi / kustomisasi).
 * 7. Rincian dompet dan daftar anggota (RBAC).
 * 8. Penambahan anggota manual dan perubahan role anggota (ADMIN only).
 * 9. Konfigurasi aturan persetujuan kuorum M-of-N (`/:walletId/policy`).
 * 10. Konfigurasi skema iuran kas warga (`/:walletId/settings`).
 */

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

/**
 * ============================================================================
 * ENDPOINT 1: GET /api/v1/wallets/preview-invite/:code
 * ============================================================================
 * Fungsi Blok:
 * Memberikan pratinjau publik (nama dompet, deskripsi, jumlah anggota) kepada calon anggota
 * yang membuka tautan undangan sebelum mereka login / registrasi.
 * 
 * Alur Kerja:
 * 1. Menerima parameter `code` dari URL.
 * 2. Memanggil `WalletService.previewWalletByCode(code)`.
 * 3. Mengembalikan 200 OK dengan ringkasan publik tanpa membocorkan data sensitif.
 */
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

/**
 * ============================================================================
 * ENDPOINT 2: GET /api/v1/wallets/check-code/:code
 * ============================================================================
 * Fungsi Blok:
 * Memeriksa apakah suatu custom invite code masih tersedia atau sudah dipakai dompet lain.
 * 
 * Konteks Otorisasi:
 * - Memerlukan otentikasi login (`requireAuth`).
 */
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

/**
 * ============================================================================
 * ENDPOINT 3: POST /api/v1/wallets/join
 * ============================================================================
 * Fungsi Blok:
 * Memfasilitasi pengguna yang sudah login untuk langsung bergabung (Instant Join)
 * ke dompet kas komunitas menggunakan kode undangan dengan peran default `WARGA`.
 * 
 * Alur Kerja:
 * 1. Validasi format kode undangan via `JoinWalletSchema`.
 * 2. Panggil `WalletService.joinWalletByCode(userId, inviteCode)`.
 * 3. Jika kode valid dan belum terdaftar, buat relasi `WalletMember` aktif (role: WARGA).
 * 4. Kembalikan konfirmasi 200 OK.
 */
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

/**
 * ============================================================================
 * ENDPOINT 4: GET /api/v1/wallets/
 * ============================================================================
 * Fungsi Blok:
 * Mengambil daftar seluruh dompet kas yang diikuti oleh pengguna yang sedang login.
 */
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

/**
 * ============================================================================
 * ENDPOINT 5: POST /api/v1/wallets/
 * ============================================================================
 * Fungsi Blok:
 * Membuat dompet kas komunitas baru.
 * Pembuat dompet otomatis ditetapkan sebagai ADMIN pertama dan aturan kuorum default dibuatkan.
 */
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

/**
 * ============================================================================
 * ENDPOINT 6: PATCH /api/v1/wallets/:walletId/invite-code
 * ============================================================================
 * Fungsi Blok:
 * Mengubah atau mengacak ulang (regenerate) kode undangan dompet.
 * 
 * Konteks RBAC:
 * - Dibatasi ketat hanya untuk ADMIN dompet (`requireWalletRole([WalletRole.ADMIN])`).
 */
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

/**
 * ============================================================================
 * ENDPOINT 7: GET /api/v1/wallets/:walletId
 * ============================================================================
 * Fungsi Blok:
 * Mengambil detail informasi dompet kas (termasuk saldo, jumlah anggota, dan aturan kuorum).
 * Terbuka untuk seluruh anggota aktif dompet.
 */
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

/**
 * ============================================================================
 * ENDPOINT 8: GET /api/v1/wallets/:walletId/members
 * ============================================================================
 * Fungsi Blok:
 * Mengambil daftar seluruh anggota dompet beserta perannya (ADMIN, PENGELOLA, WARGA).
 * Terbuka untuk seluruh anggota aktif dompet.
 */
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

/**
 * ============================================================================
 * ENDPOINT 9: POST /api/v1/wallets/:walletId/members
 * ============================================================================
 * Fungsi Blok:
 * Menambahkan anggota secara manual ke dalam dompet kas menggunakan alamat email pengguna.
 * 
 * Konteks RBAC:
 * - Dibatasi ketat hanya untuk ADMIN dompet.
 */
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

/**
 * ============================================================================
 * ENDPOINT 10: PATCH /api/v1/wallets/:walletId/members/:memberId
 * ============================================================================
 * Fungsi Blok:
 * Mengubah peran (promosi/demosi role) atau status keaktifan anggota dompet.
 * 
 * Konteks RBAC:
 * - Dibatasi ketat hanya untuk ADMIN dompet.
 */
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

/**
 * ============================================================================
 * ENDPOINT 11: GET /api/v1/wallets/:walletId/policy
 * ============================================================================
 * Fungsi Blok:
 * Mengambil konfigurasi kebijakan kuorum persetujuan M-of-N pengeluaran kas yang sedang aktif.
 * Terbuka untuk seluruh anggota aktif dompet.
 */
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

/**
 * ============================================================================
 * ENDPOINT 12: PUT /api/v1/wallets/:walletId/policy
 * ============================================================================
 * Fungsi Blok:
 * Memperbarui kebijakan kuorum M-of-N persetujuan pengeluaran kas.
 * 
 * Konteks RBAC:
 * - Dibatasi ketat hanya untuk ADMIN dompet.
 * - Memperbarui versi kebijakan (`policyVersion`) dan merekam perubahan ke audit hash chain.
 */
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

/**
 * ============================================================================
 * ENDPOINT 13: PATCH /api/v1/wallets/:walletId/settings
 * ============================================================================
 * Fungsi Blok:
 * Memperbarui konfigurasi skema iuran kas warga (tipe: BULANAN / TARGET TERMIN / SUKARELA,
 * nominal iuran, target termin cicilan) dan nomor rekening bank resmi kas.
 * 
 * Konteks RBAC:
 * - Terbuka untuk peran ADMIN dan PENGELOLA dompet.
 */
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


