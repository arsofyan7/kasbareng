import { z } from 'zod';
import { prisma } from '../../common/prisma';
import { WalletRole, UserStatus } from '@prisma/client';

export const CreateWalletSchema = z.object({
  name: z.string().min(3, 'Nama dompet kas minimal 3 karakter').max(100),
  description: z.string().max(500).optional(),
  currency: z.string().default('IDR'),
  requiredApprovals: z.number().int().min(1, 'Minimal persetujuan adalah 1').default(2),
});

export const AddMemberSchema = z.object({
  email: z.string().email('Format email tidak valid').toLowerCase(),
  role: z.nativeEnum(WalletRole).default(WalletRole.WARGA),
});

export const UpdateMemberSchema = z.object({
  role: z.nativeEnum(WalletRole).optional(),
  status: z.nativeEnum(UserStatus).optional(),
});

export type CreateWalletInput = z.infer<typeof CreateWalletSchema>;
export type AddMemberInput = z.infer<typeof AddMemberSchema>;
export type UpdateMemberInput = z.infer<typeof UpdateMemberSchema>;

export class WalletService {
  static async createWallet(userId: string, input: CreateWalletInput) {
    const validated = CreateWalletSchema.parse(input);

    return await prisma.$transaction(async (tx) => {
      // 1. Create Wallet
      const wallet = await tx.wallet.create({
        data: {
          name: validated.name,
          description: validated.description,
          currency: validated.currency,
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
      status: wallet.status,
      version: wallet.version,
      createdAt: wallet.createdAt,
      myRole: membership?.role || null,
      memberCount: wallet._count.members,
      transactionCount: wallet._count.transactions,
      activePolicy: wallet.approvalPolicies[0] || null,
    };
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
      // Reactivate inactive member
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

    // Invariant: Do not demote or deactivate the last ADMIN in the wallet
    if (
      targetMember.role === WalletRole.ADMIN &&
      (validated.role !== undefined && validated.role !== WalletRole.ADMIN ||
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
}