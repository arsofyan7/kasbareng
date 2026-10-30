/**
 * ============================================================================
 * MODUL AUTH: MIDDLEWARE OTENTIKASI & OTORISASI RBAC (auth.middleware.ts)
 * ============================================================================
 * File ini menyediakan middleware Express untuk:
 * 1. Otentikasi berbasis JWT (JSON Web Token) untuk memvalidasi identitas pengguna (`requireAuth`).
 * 2. Otorisasi berbasis peran per dompet (Wallet-level Role-Based Access Control / RBAC) (`requireWalletRole`).
 * 
 * Desain Keamanan:
 * - Menggunakan skema HTTP Authorization Bearer token.
 * - Memverifikasi status aktif pengguna di database Prisma untuk mencegah akses dari akun yang disuspend/dihapus.
 * - Menerapkan isolasi multi-tenant pada tingkat dompet: Pengguna hanya dapat mengakses dompet jika
 *   memiliki relasi keanggotaan (`WalletMember`) aktif dengan peran (Role) yang diizinkan.
 */

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { prisma } from '../../common/prisma';
import { sendError } from '../../common/response';
import { WalletRole } from '@prisma/client';

/**
 * Interface `JwtPayload`:
 * Payload yang didekode dari JWT access token.
 */
export interface JwtPayload {
  userId: string;
  email: string;
}

/**
 * Interface `AuthenticatedUser`:
 * Representasi ringkas entitas pengguna yang berhasil diotentikasi.
 */
export interface AuthenticatedUser {
  id: string;
  email: string;
  fullName: string;
}

/**
 * Interface `AuthenticatedWalletMember`:
 * Representasi entitas keanggotaan pengguna pada dompet tertentu beserta role RBAC-nya.
 */
export interface AuthenticatedWalletMember {
  id: string;
  walletId: string;
  userId: string;
  role: WalletRole;
  status: string;
}

/**
 * Interface `AuthRequest`:
 * Ekstensi dari `Request` bawaan Express yang menambahkan properti `user` dan `walletMember`.
 */
export interface AuthRequest extends Request {
  user?: AuthenticatedUser;
  walletMember?: AuthenticatedWalletMember;
}

const JWT_SECRET = process.env.JWT_SECRET || 'kasbareng-super-secret-key-for-dev-2026';

/**
 * ============================================================================
 * MIDDLEWARE: requireAuth
 * ============================================================================
 * Fungsi Blok:
 * Memvalidasi apakah request membawa JWT Bearer Token yang sah, mendekode token tersebut,
 * memverifikasi status user di database, dan melampirkan data user ke `req.user`.
 * 
 * Alur Kerja:
 * 1. Periksa header `Authorization`. Jika tidak ada atau tidak diawali 'Bearer ', tolak dengan 401 UNAUTHENTICATED.
 * 2. Ekstrak string token (menghilangkan prefix 'Bearer ').
 * 3. Verifikasi token menggunakan kunci rahasia `JWT_SECRET`.
 * 4. Cari pengguna di database via Prisma (`prisma.user.findUnique`).
 * 5. Jika akun tidak ditemukan atau status bukan 'ACTIVE', tolak dengan 401 UNAUTHENTICATED.
 * 6. Setel objek `req.user` dengan data pengguna (id, email, fullName).
 * 7. Teruskan eksekusi ke middleware/controller berikutnya via `next()`.
 */
export async function requireAuth(req: AuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return sendError(res, 'UNAUTHENTICATED', 'Otentikasi diperlukan untuk mengakses resource ini.', 401);
  }

  const token = authHeader.substring(7);
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload;
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { id: true, email: true, fullName: true, status: true },
    });

    if (!user || user.status !== 'ACTIVE') {
      return sendError(res, 'UNAUTHENTICATED', 'Akun tidak ditemukan atau tidak aktif.', 401);
    }

    req.user = {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
    };
    return next();
  } catch (_err) {
    return sendError(res, 'UNAUTHENTICATED', 'Token otentikasi tidak valid atau telah kedaluwarsa.', 401);
  }
}

/**
 * ============================================================================
 * MIDDLEWARE FACTORY: requireWalletRole
 * ============================================================================
 * Fungsi Blok:
 * Memastikan pengguna yang terotentikasi adalah anggota sah dari dompet yang diminta (`walletId`)
 * dan memiliki salah satu dari role yang diizinkan (RBAC).
 * 
 * Konteks RBAC (Role-Based Access Control):
 * - Peran yang didukung: ADMIN (Ketua/Bendahara Utama), PENGELOLA (Seksi Keuangan/Pengurus), WARGA (Anggota Komunitas).
 * - Jika `allowedRoles` tidak diberikan atau kosong, seluruh anggota aktif (ADMIN, PENGELOLA, WARGA) diizinkan lewat.
 * 
 * Alur Kerja:
 * 1. Memastikan `req.user` sudah ada (harus dijalankan setelah `requireAuth`).
 * 2. Mendapatkan `walletId` dari URL parameter (`req.params.walletId`) atau request body (`req.body.walletId`).
 * 3. Query relasi keanggotaan dompet pada Prisma (`prisma.walletMember.findUnique`) menggunakan composite key `walletId_userId`.
 * 4. Tolak dengan 403 FORBIDDEN jika user bukan anggota atau status keanggotaannya bukan 'ACTIVE'.
 * 5. Jika parameter `allowedRoles` ditentukan, periksa apakah `membership.role` termasuk di dalam array tersebut.
 *    Jika tidak, tolak dengan 403 FORBIDDEN dengan rincian role yang disyaratkan.
 * 6. Lampirkan informasi keanggotaan ke `req.walletMember`.
 * 7. Lanjutkan ke handler berikutnya via `next()`.
 */
export function requireWalletRole(allowedRoles?: WalletRole[]) {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return sendError(res, 'UNAUTHENTICATED', 'Otentikasi diperlukan.', 401);
    }

    const walletId = req.params.walletId || req.body.walletId;
    if (!walletId) {
      return sendError(res, 'VALIDATION_ERROR', 'Parameter walletId diperlukan.', 400);
    }

    try {
      const membership = await prisma.walletMember.findUnique({
        where: {
          walletId_userId: {
            walletId,
            userId: req.user.id,
          },
        },
      });

      if (!membership || membership.status !== 'ACTIVE') {
        return sendError(
          res,
          'FORBIDDEN',
          'Anda bukan anggota aktif dari dompet kas komunitas ini.',
          403
        );
      }

      if (allowedRoles && allowedRoles.length > 0 && !allowedRoles.includes(membership.role)) {
        return sendError(
          res,
          'FORBIDDEN',
          `Akses ditolak. Tindakan ini memerlukan salah satu role: [${allowedRoles.join(', ')}].`,
          403
        );
      }

      req.walletMember = {
        id: membership.id,
        walletId: membership.walletId,
        userId: membership.userId,
        role: membership.role,
        status: membership.status,
      };

      return next();
    } catch (err: unknown) {
      return sendError(res, 'INTERNAL_SERVER_ERROR', 'Gagal memverifikasi keanggotaan dompet.', 500, {
        error: err instanceof Error ? err.message : String(err),
      });
    }
  };
}
