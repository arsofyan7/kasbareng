import { prisma } from '../../common/prisma';
import { Prisma, WalletRole, UserStatus, WalletStatus, DuesType } from '@prisma/client';
import { z } from 'zod';
import crypto from 'crypto';
import { AuditService } from '../audit/audit.service';

export const CreateWalletSchema = z.object({
  name: z.string().min(3, 'Nama dompet kas minimal 3 karakter').max(100),
  description: z.string().max(500).optional(),
  currency: z.string().optional().default('IDR'),
  requiredApprovals: z.number().int().min(1, 'Minimal persetujuan adalah 1').default(2),
  duesType: z.nativeEnum(DuesType).optional().default(DuesType.FREEFORM),
  duesAmount: z.number().positive().optional().nullable(),
  targetInstallmentsCount: z.number().int().positive().optional().nullable(),
  customInviteCode: z
    .string()
    .trim()
    .optional()
    .refine((v) => !v || /^[A-Za-z0-9_-]{4,20}$/.test(v), {
      message: 'Kode kustom harus 4-20 karakter alfanumerik (bisa strip atau underscore).',
    }),
});

export const AddMemberSchema = z.object({
  email: z.string().email('Format email tidak valid').toLowerCase(),
  role: z.nativeEnum(WalletRole).default(WalletRole.WARGA),
});

export const UpdateMemberSchema = z.object({
  role: z.nativeEnum(WalletRole).optional(),
  status: z.nativeEnum(UserStatus).optional(),
});

export const JoinWalletSchema = z.object({
  inviteCode: z.string().min(3, 'Kode undangan wajib diisi').max(30),
});

export const UpdateInviteCodeSchema = z.object({
  customCode: z
    .string()
    .trim()
    .optional()
    .refine((v) => !v || /^[A-Za-z0-9_-]{4,20}$/.test(v), {
      message: 'Kode kustom harus 4-20 karakter alfanumerik (bisa strip atau underscore).',
    }),
});

export const UpdatePolicySchema = z.object({
  requiredApprovals: z.number().int().min(1, 'Jumlah persetujuan minimal adalah 1'),
  thresholdAmount: z.number().positive().optional().nullable(),
});

export const UpdateWalletSettingsSchema = z.object({
  name: z.string().min(3, 'Nama dompet kas minimal 3 karakter').max(100).optional(),
  description: z.string().max(500).optional().nullable(),
  duesType: z.nativeEnum(DuesType).optional(),
  duesAmount: z.number().positive().optional().nullable(),
  targetInstallmentsCount: z.number().int().positive().optional().nullable(),
});

export type CreateWalletInput = z.input<typeof CreateWalletSchema>;
export type AddMemberInput = z.infer<typeof AddMemberSchema>;
export type UpdateMemberInput = z.infer<typeof UpdateMemberSchema>;
export type JoinWalletInput = z.infer<typeof JoinWalletSchema>;
export type UpdateInviteCodeInput = z.infer<typeof UpdateInviteCodeSchema>;
export type UpdatePolicyInput = z.infer<typeof UpdatePolicySchema>;
export type UpdateWalletSettingsInput = z.infer<typeof UpdateWalletSettingsSchema>;

export class WalletService {
  /**
   * Helper to generate unambiguous random invite code (e.g. KAS-8X92KP)
   */
  static async generateUniqueInviteCode(prefix = 'KAS'): Promise<string> {
    const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
    for (let attempt = 0; attempt < 10; attempt++) {
      let rand = '';
      const bytes = crypto.randomBytes(6);
      for (let i = 0; i < 6; i++) {
        rand += chars[bytes[i] % chars.length];
      }
      const candidate = `${prefix}-${rand}`;
      const existing = await prisma.wallet.findUnique({
        where: { inviteCode: candidate },
      });
      if (!existing) return candidate;
    }
    return `${prefix}-${Date.now().toString(36).toUpperCase()}`;
  }

  static async createWallet(userId: string, input: CreateWalletInput) {
    const validated = CreateWalletSchema.parse(input);

    let inviteCode: string;
    if (validated.customInviteCode && validated.customInviteCode.trim().length > 0) {
      const code = validated.customInviteCode.trim().toUpperCase();
      const existing = await prisma.wallet.findUnique({
        where: { inviteCode: code },
      });
      if (existing) {
        throw {
          status: 409,
          code: 'INVITE_CODE_TAKEN',
          message: `Kode undangan "${code}" sudah digunakan oleh dompet lain. Silakan pilih kode lain.`,
        };
      }
      inviteCode = code;
    } else {
      inviteCode = await WalletService.generateUniqueInviteCode();
    }

    return await prisma.$transaction(async (tx) => {
      // 1. Create Wallet
      const wallet = await tx.wallet.create({
        data: {
          name: validated.name,
          description: validated.description,
          currency: validated.currency,
          inviteCode,
          duesType: validated.duesType,
          duesAmount: validated.duesAmount ? new Prisma.Decimal(validated.duesAmount) : null,
          targetInstallmentsCount: validated.targetInstallmentsCount || null,
        },
      });

      // 2. Add creator as ADMIN member
      await tx.walletMember.create({
        data: {
          walletId: wallet.id,
          userId,
          role: WalletRole.ADMIN,
          status: UserStatus.ACTIVE,
        },
      });

      // 3. Create default ApprovalPolicy for wallet
      const policy = await tx.approvalPolicy.create({
        data: {
          walletId: wallet.id,
          requiredApprovals: validated.requiredApprovals,
          policyVersion: 1,
          createdBy: userId,
        },
      });

      // 4. Record Genesis Audit Event for this wallet
      await AuditService.recordAuditEvent(tx, {
        walletId: wallet.id,
        actorId: userId,
        eventType: 'WALLET_GENESIS_CREATED',
        metadata: {
          name: validated.name,
          currency: validated.currency,
          requiredApprovals: validated.requiredApprovals,
          inviteCode,
        },
      });

      return {
        ...wallet,
        myRole: WalletRole.ADMIN,
        requiredApprovals: policy.requiredApprovals,
      };
    });
  }

  static async getUserWallets(userId: string) {
    const memberships = await prisma.walletMember.findMany({
      where: {
        userId,
        status: UserStatus.ACTIVE,
      },
      include: {
        wallet: {
          include: {
            _count: {
              select: {
                members: { where: { status: UserStatus.ACTIVE } },
                transactions: true,
              },
            },
            approvalPolicies: {
              where: { status: 'ACTIVE' },
              take: 1,
              orderBy: { policyVersion: 'desc' },
            },
          },
        },
      },
      orderBy: { joinedAt: 'desc' },
    });

    return memberships.map((m) => ({
      id: m.wallet.id,
      name: m.wallet.name,
      description: m.wallet.description,
      currency: m.wallet.currency,
      inviteCode: m.wallet.inviteCode,
      duesType: m.wallet.duesType,
      duesAmount: m.wallet.duesAmount ? Number(m.wallet.duesAmount) : null,
      targetInstallmentsCount: m.wallet.targetInstallmentsCount,
      status: m.wallet.status,
      myRole: m.role,
      joinedAt: m.joinedAt,
      memberCount: m.wallet._count.members,
      transactionCount: m.wallet._count.transactions,
      requiredApprovals: m.wallet.approvalPolicies[0]?.requiredApprovals || 1,
    }));
  }

  static async getWalletDetails(walletId: string, userId: string) {
    const wallet = await prisma.wallet.findUnique({
      where: { id: walletId },
      include: {
        _count: {
          select: {
            members: { where: { status: UserStatus.ACTIVE } },
            transactions: true,
          },
        },
        approvalPolicies: {
          where: { status: 'ACTIVE' },
          take: 1,
          orderBy: { policyVersion: 'desc' },
        },
        members: {
          where: { userId },
        },
      },
    });

    if (!wallet) {
      throw {
        status: 404,
        code: 'WALLET_NOT_FOUND',
        message: 'Dompet kas komunitas tidak ditemukan.',
      };
    }

    const membership = wallet.members[0];

    return {
      id: wallet.id,
      name: wallet.name,
      description: wallet.description,
      currency: wallet.currency,
      inviteCode: wallet.inviteCode,
      duesType: wallet.duesType,
      duesAmount: wallet.duesAmount ? Number(wallet.duesAmount) : null,
      targetInstallmentsCount: wallet.targetInstallmentsCount,
      status: wallet.status,
      version: wallet.version,
      createdAt: wallet.createdAt,
      myRole: membership?.role || null,
      memberCount: wallet._count.members,
      transactionCount: wallet._count.transactions,
      activePolicy: wallet.approvalPolicies[0] || null,
    };
  }

  static async previewWalletByCode(rawCode: string) {
    if (!rawCode || typeof rawCode !== 'string') {
      throw {
        status: 400,
        code: 'INVALID_CODE',
        message: 'Kode undangan wajib diisi.',
      };
    }
    const code = rawCode.trim().toUpperCase();

    const wallet = await prisma.wallet.findUnique({
      where: { inviteCode: code },
      select: {
        id: true,
        name: true,
        description: true,
        currency: true,
        status: true,
        inviteCode: true,
        createdAt: true,
        _count: {
          select: { members: { where: { status: UserStatus.ACTIVE } } },
        },
      },
    });

    if (!wallet || wallet.status !== WalletStatus.ACTIVE) {
      throw {
        status: 404,
        code: 'WALLET_NOT_FOUND',
        message: 'Kode undangan tidak valid atau dompet kas tidak aktif.',
      };
    }

    return {
      id: wallet.id,
      name: wallet.name,
      description: wallet.description,
      currency: wallet.currency,
      inviteCode: wallet.inviteCode,
      memberCount: wallet._count.members,
      createdAt: wallet.createdAt,
    };
  }

  static async checkCodeAvailability(rawCode: string, excludeWalletId?: string) {
    if (!rawCode || typeof rawCode !== 'string') {
      return { available: false, message: 'Kode tidak boleh kosong.' };
    }
    const code = rawCode.trim().toUpperCase();
    if (!/^[A-Z0-9_-]{4,20}$/.test(code)) {
      return {
        available: false,
        message: 'Kode harus 4-20 karakter alfanumerik (bisa strip atau underscore).',
      };
    }

    const existing = await prisma.wallet.findUnique({
      where: { inviteCode: code },
    });

    if (existing && existing.id !== excludeWalletId) {
      return {
        available: false,
        message: 'Kode sudah digunakan oleh dompet kas lain.',
      };
    }

    return {
      available: true,
      code,
      message: 'Kode tersedia!',
    };
  }

  static async joinWalletByCode(userId: string, rawCode: string) {
    if (!rawCode || typeof rawCode !== 'string') {
      throw {
        status: 400,
        code: 'INVALID_CODE',
        message: 'Kode undangan wajib diisi.',
      };
    }
    const code = rawCode.trim().toUpperCase();

    const wallet = await prisma.wallet.findUnique({
      where: { inviteCode: code },
      include: {
        _count: {
          select: { members: { where: { status: UserStatus.ACTIVE } } },
        },
      },
    });

    if (!wallet || wallet.status !== WalletStatus.ACTIVE) {
      throw {
        status: 404,
        code: 'WALLET_NOT_FOUND',
        message: 'Kode undangan tidak valid atau komunitas kas tidak aktif.',
      };
    }

    const existingMember = await prisma.walletMember.findUnique({
      where: {
        walletId_userId: {
          walletId: wallet.id,
          userId,
        },
      },
    });

    let finalRole: WalletRole = WalletRole.WARGA;

    if (existingMember) {
      if (existingMember.status === UserStatus.ACTIVE) {
        throw {
          status: 409,
          code: 'ALREADY_MEMBER',
          message: `Anda sudah menjadi anggota di dompet kas "${wallet.name}".`,
        };
      }
      finalRole = existingMember.role;
      await prisma.walletMember.update({
        where: { id: existingMember.id },
        data: {
          status: UserStatus.ACTIVE,
        },
      });
    } else {
      await prisma.walletMember.create({
        data: {
          walletId: wallet.id,
          userId,
          role: WalletRole.WARGA,
          status: UserStatus.ACTIVE,
        },
      });
    }

    return {
      walletId: wallet.id,
      name: wallet.name,
      description: wallet.description,
      currency: wallet.currency,
      inviteCode: wallet.inviteCode,
      myRole: finalRole,
      memberCount: wallet._count.members + (existingMember ? 0 : 1),
    };
  }

  static async updateInviteCode(walletId: string, customCode?: string) {
    let finalCode: string;

    if (customCode && customCode.trim().length > 0) {
      const code = customCode.trim().toUpperCase();
      if (!/^[A-Z0-9_-]{4,20}$/.test(code)) {
        throw {
          status: 400,
          code: 'INVALID_CODE_FORMAT',
          message: 'Kode kustom harus 4-20 karakter alfanumerik (bisa strip atau underscore).',
        };
      }

      const existing = await prisma.wallet.findUnique({
        where: { inviteCode: code },
      });

      if (existing && existing.id !== walletId) {
        throw {
          status: 409,
          code: 'INVITE_CODE_TAKEN',
          message: `Kode "${code}" sudah digunakan oleh dompet lain.`,
        };
      }

      finalCode = code;
    } else {
      finalCode = await WalletService.generateUniqueInviteCode();
    }

    const updated = await prisma.wallet.update({
      where: { id: walletId },
      data: { inviteCode: finalCode },
      select: {
        id: true,
        name: true,
        inviteCode: true,
      },
    });

    return updated;
  }

  static async getWalletMembers(walletId: string) {
    const members = await prisma.walletMember.findMany({
      where: { walletId },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            email: true,
          },
        },
      },
      orderBy: [{ role: 'asc' }, { joinedAt: 'asc' }],
    });

    return members.map((m) => ({
      id: m.id,
      userId: m.user.id,
      fullName: m.user.fullName,
      email: m.user.email,
      role: m.role,
      status: m.status,
      joinedAt: m.joinedAt,
    }));
  }

  static async addWalletMember(walletId: string, input: AddMemberInput) {
    const validated = AddMemberSchema.parse(input);

    const userToAdd = await prisma.user.findUnique({
      where: { email: validated.email },
    });

    if (!userToAdd) {
      throw {
        status: 404,
        code: 'USER_NOT_FOUND',
        message: `Pengguna dengan email ${validated.email} belum terdaftar di platform.`,
      };
    }

    const existingMembership = await prisma.walletMember.findUnique({
      where: {
        walletId_userId: {
          walletId,
          userId: userToAdd.id,
        },
      },
    });

    if (existingMembership) {
      if (existingMembership.status === UserStatus.ACTIVE) {
        throw {
          status: 409,
          code: 'MEMBER_ALREADY_EXISTS',
          message: 'Pengguna sudah menjadi anggota aktif di dompet ini.',
        };
      }
      return await prisma.walletMember.update({
        where: { id: existingMembership.id },
        data: {
          status: UserStatus.ACTIVE,
          role: validated.role,
        },
      });
    }

    return await prisma.walletMember.create({
      data: {
        walletId,
        userId: userToAdd.id,
        role: validated.role,
        status: UserStatus.ACTIVE,
      },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            email: true,
          },
        },
      },
    });
  }

  static async updateWalletMember(
    walletId: string,
    memberId: string,
    input: UpdateMemberInput
  ) {
    const validated = UpdateMemberSchema.parse(input);

    const targetMember = await prisma.walletMember.findUnique({
      where: { id: memberId },
    });

    if (!targetMember || targetMember.walletId !== walletId) {
      throw {
        status: 404,
        code: 'MEMBER_NOT_FOUND',
        message: 'Anggota tidak ditemukan pada dompet ini.',
      };
    }

    if (
      targetMember.role === WalletRole.ADMIN &&
      ((validated.role !== undefined && validated.role !== WalletRole.ADMIN) ||
        validated.status === UserStatus.INACTIVE)
    ) {
      const activeAdminCount = await prisma.walletMember.count({
        where: {
          walletId,
          role: WalletRole.ADMIN,
          status: UserStatus.ACTIVE,
        },
      });

      if (activeAdminCount <= 1) {
        throw {
          status: 400,
          code: 'LAST_ADMIN_PROTECTED',
          message: 'Tidak dapat mengubah role atau menonaktifkan admin terakhir di dompet ini.',
        };
      }
    }

    return await prisma.walletMember.update({
      where: { id: memberId },
      data: {
        ...(validated.role && { role: validated.role }),
        ...(validated.status && { status: validated.status }),
      },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            email: true,
          },
        },
      },
    });
  }

  /**
   * Fetches the active M-of-N approval policy and eligible approvers.
   */
  static async getWalletPolicy(walletId: string) {
    const policy = await prisma.approvalPolicy.findFirst({
      where: { walletId, status: 'ACTIVE' },
      orderBy: { policyVersion: 'desc' },
    });

    const eligibleMembers = await prisma.walletMember.findMany({
      where: {
        walletId,
        status: UserStatus.ACTIVE,
        role: { in: [WalletRole.ADMIN, WalletRole.PENGELOLA] },
      },
      include: {
        user: {
          select: { id: true, fullName: true, email: true },
        },
      },
      orderBy: { joinedAt: 'asc' },
    });

    return {
      policy: policy
        ? {
            ...policy,
            thresholdAmount: policy.thresholdAmount ? Number(policy.thresholdAmount) : null,
          }
        : {
            id: 'default',
            walletId,
            requiredApprovals: 1,
            thresholdAmount: null,
            policyVersion: 1,
            status: 'ACTIVE',
            createdAt: new Date(),
          },
      eligibleApproverCount: eligibleMembers.length,
      eligibleApprovers: eligibleMembers.map((m) => ({
        id: m.user.id,
        fullName: m.user.fullName,
        email: m.user.email,
        role: m.role,
      })),
    };
  }

  /**
   * Updates M-of-N approval policy (ADMIN only).
   * Archives previous policy to maintain strict audit trail.
   */
  static async updateWalletPolicy(walletId: string, actorId: string, input: UpdatePolicyInput) {
    const validated = UpdatePolicySchema.parse(input);

    const eligibleCount = await prisma.walletMember.count({
      where: {
        walletId,
        status: UserStatus.ACTIVE,
        role: { in: [WalletRole.ADMIN, WalletRole.PENGELOLA] },
      },
    });

    if (validated.requiredApprovals > eligibleCount) {
      throw {
        status: 400,
        code: 'INVALID_POLICY_QUORUM',
        message: `Jumlah persetujuan kuorum (${validated.requiredApprovals}) tidak boleh melebihi jumlah pengelola/admin yang ada (${eligibleCount}).`,
      };
    }

    return await prisma.$transaction(async (tx) => {
      const currentPolicy = await tx.approvalPolicy.findFirst({
        where: { walletId, status: 'ACTIVE' },
        orderBy: { policyVersion: 'desc' },
      });

      const nextVersion = (currentPolicy?.policyVersion || 0) + 1;

      if (currentPolicy) {
        await tx.approvalPolicy.update({
          where: { id: currentPolicy.id },
          data: { status: 'ARCHIVED' },
        });
      }

      const newPolicy = await tx.approvalPolicy.create({
        data: {
          walletId,
          requiredApprovals: validated.requiredApprovals,
          thresholdAmount: validated.thresholdAmount ? new Prisma.Decimal(validated.thresholdAmount) : null,
          policyVersion: nextVersion,
          status: 'ACTIVE',
          createdBy: actorId,
        },
      });

      await AuditService.recordAuditEvent(tx, {
        walletId,
        actorId,
        eventType: 'POLICY_UPDATED',
        metadata: {
          policyVersion: nextVersion,
          requiredApprovals: validated.requiredApprovals,
          thresholdAmount: validated.thresholdAmount || null,
        },
      });

      return {
        ...newPolicy,
        thresholdAmount: newPolicy.thresholdAmount ? Number(newPolicy.thresholdAmount) : null,
      };
    });
  }

  /**
   * Updates general wallet settings including dues configuration (duesType, duesAmount, targetInstallmentsCount).
   * Automatically records a tamper-evident audit event in the SHA-256 hash chain.
   */
  static async updateWalletSettings(walletId: string, actorId: string, input: unknown) {
    const validated = UpdateWalletSettingsSchema.parse(input);

    return await prisma.$transaction(async (tx) => {
      const wallet = await tx.wallet.findUnique({
        where: { id: walletId },
      });

      if (!wallet) {
        throw { status: 404, code: 'NOT_FOUND', message: 'Dompet kas tidak ditemukan.' };
      }

      const updated = await tx.wallet.update({
        where: { id: walletId },
        data: {
          ...(validated.name !== undefined ? { name: validated.name.trim() } : {}),
          ...(validated.description !== undefined ? { description: validated.description?.trim() || null } : {}),
          ...(validated.duesType !== undefined ? { duesType: validated.duesType } : {}),
          ...(validated.duesAmount !== undefined
            ? { duesAmount: validated.duesAmount !== null ? new Prisma.Decimal(validated.duesAmount) : null }
            : {}),
          ...(validated.targetInstallmentsCount !== undefined
            ? { targetInstallmentsCount: validated.targetInstallmentsCount }
            : {}),
        },
      });

      await AuditService.recordAuditEvent(tx, {
        walletId,
        actorId,
        eventType: 'WALLET_SETTINGS_UPDATED',
        metadata: {
          previous: {
            name: wallet.name,
            duesType: wallet.duesType,
            duesAmount: wallet.duesAmount ? Number(wallet.duesAmount) : null,
            targetInstallmentsCount: wallet.targetInstallmentsCount,
          },
          updated: {
            name: updated.name,
            duesType: updated.duesType,
            duesAmount: updated.duesAmount ? Number(updated.duesAmount) : null,
            targetInstallmentsCount: updated.targetInstallmentsCount,
          },
          reason: 'Pengurus memperbarui konfigurasi atau nominal acuan iuran kas.',
        },
      });

      return {
        ...updated,
        duesAmount: updated.duesAmount ? Number(updated.duesAmount) : null,
      };
    });
  }
}
