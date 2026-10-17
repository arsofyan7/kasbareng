import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { prisma } from '../common/prisma';
import { AuthService } from './auth/auth.service';
import { WalletService } from './wallets/wallet.service';
import { WalletRole, UserStatus } from '@prisma/client';

describe('Fase 1: Auth, Wallets, & Membership RBAC', () => {
  const timestamp = Date.now();
  const emailAdmin = `admin_${timestamp}@kasbareng.test`;
  const emailWarga = `warga_${timestamp}@kasbareng.test`;
  const password = 'PasswordSuper123!';

  let adminUser: any;
  let wargaUser: any;
  let adminToken: string;
  let createdWallet: any;

  beforeAll(async () => {
    // Cleanup any leftovers if needed
  });

  afterAll(async () => {
    // Clean test data
    if (createdWallet) {
      await prisma.wallet.delete({ where: { id: createdWallet.id } }).catch(() => {});
    }
    if (adminUser) {
      await prisma.user.delete({ where: { id: adminUser.id } }).catch(() => {});
    }
    if (wargaUser) {
      await prisma.user.delete({ where: { id: wargaUser.id } }).catch(() => {});
    }
    await prisma.$disconnect();
  });

  describe('1. Authentication Flow', () => {
    it('registers a new user successfully and returns JWT', async () => {
      const res = await AuthService.register({
        fullName: 'Budi Administrator',
        email: emailAdmin,
        password,
      });

      expect(res.user.id).toBeDefined();
      expect(res.user.email).toBe(emailAdmin);
      expect(res.user.fullName).toBe('Budi Administrator');
      expect(res.token).toBeDefined();

      adminUser = res.user;
      adminToken = res.token;
    });

    it('rejects duplicate email registration with EMAIL_ALREADY_EXISTS', async () => {
      await expect(
        AuthService.register({
          fullName: 'Budi Kloning',
          email: emailAdmin,
          password,
        })
      ).rejects.toMatchObject({
        code: 'EMAIL_ALREADY_EXISTS',
        status: 409,
      });
    });

    it('registers a second user (Warga)', async () => {
      const res = await AuthService.register({
        fullName: 'Siti Warga',
        email: emailWarga,
        password,
      });
      wargaUser = res.user;
      expect(wargaUser.id).toBeDefined();
    });

    it('logs in successfully with valid credentials', async () => {
      const res = await AuthService.login({
        email: emailAdmin,
        password,
      });
      expect(res.user.id).toBe(adminUser.id);
      expect(res.token).toBeDefined();
    });

    it('rejects wrong password with generic INVALID_CREDENTIALS', async () => {
      await expect(
        AuthService.login({
          email: emailAdmin,
          password: 'wrong-password-123',
        })
      ).rejects.toMatchObject({
        code: 'INVALID_CREDENTIALS',
        status: 401,
      });
    });

    it('rejects non-existent user without leaking email existence (timing-safe generic message)', async () => {
      await expect(
        AuthService.login({
          email: 'ghost_non_existent@kasbareng.test',
          password: 'any-password',
        })
      ).rejects.toMatchObject({
        code: 'INVALID_CREDENTIALS',
        status: 401,
      });
    });

    it('fetches profile with getMe', async () => {
      const me = await AuthService.getMe(adminUser.id);
      expect(me.id).toBe(adminUser.id);
      expect(me.email).toBe(emailAdmin);
    });
  });

  describe('2. Wallet & Membership Flow', () => {
    it('creates a wallet with caller as ADMIN and creates default M-of-N policy', async () => {
      createdWallet = await WalletService.createWallet(adminUser.id, {
        name: 'Kas RT 05 RW 02 Sejahtera',
        description: 'Dana kas kebersihan dan keamanan warga',
        currency: 'IDR',
        requiredApprovals: 2,
      });

      expect(createdWallet.id).toBeDefined();
      expect(createdWallet.name).toBe('Kas RT 05 RW 02 Sejahtera');
      expect(createdWallet.myRole).toBe(WalletRole.ADMIN);
      expect(createdWallet.requiredApprovals).toBe(2);

      // Verify DB policy creation
      const policy = await prisma.approvalPolicy.findFirst({
        where: { walletId: createdWallet.id },
      });
      expect(policy).toBeDefined();
      expect(policy?.requiredApprovals).toBe(2);
      expect(policy?.policyVersion).toBe(1);
    });

    it('lists user wallets with role and counts', async () => {
      const wallets = await WalletService.getUserWallets(adminUser.id);
      expect(wallets.length).toBeGreaterThanOrEqual(1);

      const found = wallets.find((w) => w.id === createdWallet.id);
      expect(found).toBeDefined();
      expect(found?.myRole).toBe(WalletRole.ADMIN);
      expect(found?.memberCount).toBe(1);
    });

    it('adds a new member (Siti Warga) with role WARGA', async () => {
      const newMember = await WalletService.addWalletMember(createdWallet.id, {
        email: emailWarga,
        role: WalletRole.WARGA,
      });

      expect(newMember.id).toBeDefined();
      expect(newMember.role).toBe(WalletRole.WARGA);
      expect(newMember.userId).toBe(wargaUser.id);
    });

    it('lists all members of the wallet with their roles', async () => {
      const members = await WalletService.getWalletMembers(createdWallet.id);
      expect(members.length).toBe(2);

      const admin = members.find((m) => m.userId === adminUser.id);
      const warga = members.find((m) => m.userId === wargaUser.id);

      expect(admin?.role).toBe(WalletRole.ADMIN);
      expect(warga?.role).toBe(WalletRole.WARGA);
    });

    it('promotes Warga to PENGELOLA', async () => {
      const members = await WalletService.getWalletMembers(createdWallet.id);
      const wargaMember = members.find((m) => m.userId === wargaUser.id);

      const updated = await WalletService.updateWalletMember(
        createdWallet.id,
        wargaMember!.id,
        { role: WalletRole.PENGELOLA }
      );

      expect(updated.role).toBe(WalletRole.PENGELOLA);
    });

    it('strictly protects the last remaining ADMIN from demotion or deactivation', async () => {
      const members = await WalletService.getWalletMembers(createdWallet.id);
      const adminMember = members.find((m) => m.userId === adminUser.id);

      await expect(
        WalletService.updateWalletMember(createdWallet.id, adminMember!.id, {
          role: WalletRole.WARGA, // trying to demote sole admin!
        })
      ).rejects.toMatchObject({
        code: 'LAST_ADMIN_PROTECTED',
        status: 400,
      });

      await expect(
        WalletService.updateWalletMember(createdWallet.id, adminMember!.id, {
          status: UserStatus.INACTIVE, // trying to deactivate sole admin!
        })
      ).rejects.toMatchObject({
        code: 'LAST_ADMIN_PROTECTED',
        status: 400,
      });
    });
  });
});