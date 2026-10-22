import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { prisma } from '../common/prisma';
import { AuthService } from './auth/auth.service';
import { WalletService } from './wallets/wallet.service';
import { TransactionService } from './transactions/transaction.service';
import { AuditService } from './audit/audit.service';
import { TransactionType, TransactionState, WalletRole } from '@prisma/client';

describe('Special Feature: Member Income Self-Report & Single-Manager Verification', () => {
  let adminUser: any;
  let bendaharaUser: any;
  let wargaUser: any;
  let wallet: any;
  let attachment: any;
  let reportedIncomeTx: any;
  let secondIncomeTx: any;

  beforeAll(async () => {
    const id = `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

    // 1. Create Admin
    const adminRes = await AuthService.register({
      fullName: 'Ketua RT Testing',
      email: `admin_rt_${id}@kasbareng.test`,
      password: 'PasswordSuper123!',
    });
    adminUser = adminRes.user;

    // 2. Create Bendahara (Pengelola)
    const bendaharaRes = await AuthService.register({
      fullName: 'Ibu Bendahara Testing',
      email: `bendahara_${id}@kasbareng.test`,
      password: 'PasswordSuper123!',
    });
    bendaharaUser = bendaharaRes.user;

    // 3. Create Warga
    const wargaRes = await AuthService.register({
      fullName: 'Bpk. Warga Testing',
      email: `warga_${id}@kasbareng.test`,
      password: 'PasswordSuper123!',
    });
    wargaUser = wargaRes.user;

    // 4. Create Wallet by Admin
    wallet = await WalletService.createWallet(adminUser.id, {
      name: `Kas RT Demo ${id}`,
      description: 'Pengujian Lapor Pembayaran Warga',
      requiredApprovals: 2,
    });

    // 5. Add Bendahara as PENGELOLA
    await WalletService.addWalletMember(wallet.id, {
      email: bendaharaUser.email,
      role: WalletRole.PENGELOLA,
    });

    // 6. Add Warga as WARGA
    await WalletService.addWalletMember(wallet.id, {
      email: wargaUser.email,
      role: WalletRole.WARGA,
    });

    // 7. Create sample receipt attachment
    attachment = await prisma.attachment.create({
      data: {
        walletId: wallet.id,
        uploadedBy: wargaUser.id,
        storageKey: `test_transfer_receipt_${id}.jpg`,
        originalFilename: 'bukti_transfer.jpg',
        mimeType: 'image/jpeg',
        sizeBytes: BigInt(12345),
        checksum: 'a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2',
      },
    });
  });

  afterAll(async () => {
    if (wallet) {
      await prisma.wallet.delete({ where: { id: wallet.id } }).catch(() => {});
    }
    if (adminUser) {
      await prisma.user.delete({ where: { id: adminUser.id } }).catch(() => {});
    }
    if (bendaharaUser) {
      await prisma.user.delete({ where: { id: bendaharaUser.id } }).catch(() => {});
    }
    if (wargaUser) {
      await prisma.user.delete({ where: { id: wargaUser.id } }).catch(() => {});
    }
    await prisma.$disconnect();
  });

  it('1. allows WARGA to create and submit an INCOME report with receipt attachment', async () => {
    // Initial balance is 0
    const initialBalance = await TransactionService.getWalletBalanceSummary(wallet.id);
    expect(initialBalance.postedBalance).toBe(0);
    expect(initialBalance.availableBalance).toBe(0);

    // Warga creates draft
    reportedIncomeTx = await TransactionService.createDraft(wallet.id, wargaUser.id, {
      type: TransactionType.INCOME,
      amount: 150000, // Rp 150.000
      category: 'Iuran Bulanan Warga',
      notes: 'Iuran bulan Oktober Blok C No. 5',
      receiptAttachmentId: attachment.id,
    });

    expect(reportedIncomeTx.id).toBeDefined();
    expect(reportedIncomeTx.creatorId).toBe(wargaUser.id);
    expect(reportedIncomeTx.state).toBe(TransactionState.DRAFT);
    expect(reportedIncomeTx.receiptAttachmentId).toBe(attachment.id);

    // Warga submits transaction
    const submitted = await TransactionService.submitTransaction(
      reportedIncomeTx.id,
      wargaUser.id,
      reportedIncomeTx.version
    );

    // Must stay in SUBMITTED state (awaiting manager verification)
    expect(submitted.state).toBe(TransactionState.SUBMITTED);
    expect(submitted.version).toBe(2);

    reportedIncomeTx = submitted;
  });

  it('2. financial security invariant: wallet balance does NOT increase while in SUBMITTED state', async () => {
    const balance = await TransactionService.getWalletBalanceSummary(wallet.id);
    // Neither posted nor available balance increases prior to manager approval!
    expect(balance.postedBalance).toBe(0);
    expect(balance.availableBalance).toBe(0);

    // No ledger credit entry created yet
    const entries = await prisma.ledgerEntry.findMany({
      where: { transactionId: reportedIncomeTx.id },
    });
    expect(entries.length).toBe(0);
  });

  it('3. rejects verification attempt if performed by non-manager (WARGA)', async () => {
    await expect(
      TransactionService.verifyIncomeReport(reportedIncomeTx.id, wargaUser.id, {
        decision: 'APPROVE',
        notes: 'Verifikasi ilegal oleh warga sendiri',
      })
    ).rejects.toMatchObject({
      code: 'FORBIDDEN',
      status: 403,
    });
  });

  it('4. allows single manager (Bendahara / PENGELOLA) to VERIFY and APPROVE the income report', async () => {
    const verified = await TransactionService.verifyIncomeReport(
      reportedIncomeTx.id,
      bendaharaUser.id,
      {
        decision: 'APPROVE',
        notes: 'Dana sudah masuk di rekening BCA RT. Bukti transfer valid.',
      }
    );

    expect(verified.state).toBe(TransactionState.COMPLETED);
    expect(verified.version).toBe(3);

    // Wallet balance now actively reflects the approved income!
    const balance = await TransactionService.getWalletBalanceSummary(wallet.id);
    expect(balance.postedBalance).toBe(150000);
    expect(balance.availableBalance).toBe(150000);

    // Check ledger entry
    const entry = await prisma.ledgerEntry.findFirst({
      where: { transactionId: reportedIncomeTx.id },
    });
    expect(entry).toBeDefined();
    expect(entry?.entryType).toBe('CREDIT');
    expect(Number(entry?.amount)).toBe(150000);

    // Verify SHA-256 Audit Chain integrity
    const auditChain = await AuditService.verifyWalletChain(wallet.id);
    expect(auditChain.valid).toBe(true);

    const latestAudit = await prisma.auditLog.findFirst({
      where: {
        walletId: wallet.id,
        canonicalPayload: { contains: 'INCOME_VERIFIED' },
      },
    });
    expect(latestAudit).toBeDefined();
    expect(latestAudit?.canonicalPayload).toContain(bendaharaUser.id);
  });

  it('5. allows manager to REJECT an unverified report with notes without affecting balance', async () => {
    // Warga submits second report
    secondIncomeTx = await TransactionService.createDraft(wallet.id, wargaUser.id, {
      type: TransactionType.INCOME,
      amount: 500000,
      category: 'Donasi Kebersihan',
      notes: 'Transfer fiktif tanpa dana riil',
    });

    const submittedSecond = await TransactionService.submitTransaction(
      secondIncomeTx.id,
      wargaUser.id,
      secondIncomeTx.version
    );
    expect(submittedSecond.state).toBe(TransactionState.SUBMITTED);

    // Bendahara rejects it
    const rejected = await TransactionService.verifyIncomeReport(
      secondIncomeTx.id,
      bendaharaUser.id,
      {
        decision: 'REJECT',
        notes: 'Bukti transfer tidak valid dan mutasi bank tidak ditemukan.',
      }
    );

    expect(rejected.state).toBe(TransactionState.REJECTED);

    // Balance remains 150000 (from test #4), NOT 650000!
    const balance = await TransactionService.getWalletBalanceSummary(wallet.id);
    expect(balance.postedBalance).toBe(150000);
    expect(balance.availableBalance).toBe(150000);

    // Audit chain remains valid
    const auditChain = await AuditService.verifyWalletChain(wallet.id);
    expect(auditChain.valid).toBe(true);
  });

  it('6. transaction visibility scoping: ADMIN/PENGELOLA can view all transactions, while WARGA can only view their own transactions', async () => {
    // 1. Admin creates an expense transaction
    const adminExpense = await TransactionService.createDraft(wallet.id, adminUser.id, {
      type: TransactionType.EXPENSE,
      amount: 40000,
      category: 'Perlengkapan Pos Ronda',
      notes: 'Beli lampu bohlam & sapu',
    });

    // 2. Query as Admin / Pengelola (no creatorId filter) -> sees all 3 transactions (2 warga income reports + 1 admin expense)
    const allTransactions = await TransactionService.getWalletTransactions(wallet.id);
    expect(allTransactions.transactions.length).toBe(3);
    const txIds = allTransactions.transactions.map((t) => t.id);
    expect(txIds).toContain(reportedIncomeTx.id);
    expect(txIds).toContain(secondIncomeTx.id);
    expect(txIds).toContain(adminExpense.id);

    // 3. Query as WARGA (with creatorId: wargaUser.id) -> ONLY sees their own 2 transactions
    const wargaTransactions = await TransactionService.getWalletTransactions(wallet.id, {
      creatorId: wargaUser.id,
    });
    expect(wargaTransactions.transactions.length).toBe(2);
    const wargaTxIds = wargaTransactions.transactions.map((t) => t.id);
    expect(wargaTxIds).toContain(reportedIncomeTx.id);
    expect(wargaTxIds).toContain(secondIncomeTx.id);
    expect(wargaTxIds).not.toContain(adminExpense.id);

    // Every returned transaction must have creatorId === wargaUser.id
    for (const tx of wargaTransactions.transactions) {
      expect(tx.creatorId).toBe(wargaUser.id);
    }
  });

  it('7. verifies WARGA tracking integrity: warga can inspect their own transaction details', async () => {
    const ownTx = await TransactionService.getTransactionById(reportedIncomeTx.id);
    expect(ownTx.id).toBe(reportedIncomeTx.id);
    expect(ownTx.creatorId).toBe(wargaUser.id);
  });
});
