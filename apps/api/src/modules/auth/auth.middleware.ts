import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { prisma } from '../../common/prisma';
import { sendError } from '../../common/response';
import { WalletRole } from '@prisma/client';

export interface JwtPayload {
  userId: string;
  email: string;
}

export interface AuthenticatedUser {
  id: string;
  email: string;
  fullName: string;
}

export interface AuthenticatedWalletMember {
  id: string;
  walletId: string;
  userId: string;
  role: WalletRole;
  status: string;
}

export interface AuthRequest extends Request {
  user?: AuthenticatedUser;
  walletMember?: AuthenticatedWalletMember;
}

const JWT_SECRET = process.env.JWT_SECRET || 'kasbareng-super-secret-key-for-dev-2026';

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
 * Middleware to enforce per-wallet membership and RBAC.
 * Checks if req.user is a member of req.params.walletId.
 * If allowedRoles is provided, validates that member.role is one of allowedRoles.
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