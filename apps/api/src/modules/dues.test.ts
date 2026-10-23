import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { prisma } from '../common/prisma';
import { AuthService } from './auth/auth.service';
import { WalletService } from './wallets/wallet.service';
import { TransactionService } from './transactions/transaction.service';
import { DuesService } from './dues/dues.service';
import { DuesType, DuesPaymentStatus, WalletRole } from '@prisma/client';

describe('Fase 7: Papan Rekap Iuran Komunitas (Billing Board)', () => {
  const timestamp = Date.now();
  let admin: any;
  let pengelola: any;
  let warga1: any;
  let warga2: any;

  let monthlyWallet: any;
  let installmentWallet: any;

  beforeAll(async () => {
    // 1. Create Admin
    const uAdmin = await AuthService.register({
      fullName: 'Ketua RT 05 ASRI',
      email: `ketua_${timestamp}@kasbareng.test`,
      password: 'PasswordSuper123!',
    });
    admin = uAdmin.user;

    // 2. Create Pengelola / Bendahara
    const uBendahara = await AuthService.register({
      fullName: 'Bendahara Kas ASRI',
      email: `bendahara_${timestamp}@kasbareng.test`,
      password: 'PasswordSuper123!',
    });
    pengelola = uBendahara.user;

    // 3. Create Warga 1
    const uWarga1 = await AuthService.register({
      fullName: 'Bapak Budi Santoso',
      email: `budi_${timestamp}@kasbareng.test`,
      password: 'PasswordSuper123!',
    });
    warga1 = uWarga1.user;

    // 4. Create Warga 2
    const uWarga2 = await AuthService.register({
      fullName: 'Ibu Siti Rahma',
      email: `siti_${timestamp}@kasbareng.test`,
      password: 'PasswordSuper123!',
    });
    warga2 = uWarga2.user;

    // 5. Create Monthly Wallet
    monthlyWallet = await WalletService.createWallet(admin.id, {
      name: 'Kas RT 05 Bulanan',
      requiredApprovals: 1,
      duesType: DuesType.MONTHLY,
      duesAmount: 50000,
    });

    // Add members to monthly wallet
    await WalletService.addWalletMember(monthlyWallet.id, {
      email: pengelola.email,
      role: WalletRole.PENGELOLA,
    });
    await WalletService.addWalletMember(monthlyWallet.id, {
      email: warga1.email,
      role: WalletRole.WARGA,
    });
    await WalletService.addWalletMember(monthlyWallet.id, {
      email: warga2.email,
      role: WalletRole.WARGA,
    });

    // 6. Create Installment Wallet (10x termin)
    installmentWallet = await WalletService.createWallet(admin.id, {
      name: 'Kas Qurban 10x Termin',
      requiredApprovals: 1,
      duesType: DuesType.TARGET_INSTALLMENTS,
      duesAmount: 100000,
      targetInstallmentsCount: 10,
    });
    await WalletService.addWalletMember(installmentWallet.id, {
      email: warga1.email,
      role: WalletRole.WARGA,
    });
  });

  afterAll(async () => {
    // Clean up
    if (monthlyWallet?.id) {
      await prisma.wallet.delete({ where: { id: monthlyWallet.id } }).catch(() => {});
    }
    if (installmentWallet?.id) {
      await prisma.wallet.delete({ where: { id: installmentWallet.id } }).catch(() => {});
    }
  });

  it('1. Period generator produces correct keys and labels for MONTHLY and TARGET_INSTALLMENTS', () => {
    const monthlyPeriods = DuesService.getPeriodsForWallet(DuesType.MONTHLY, 2026);
    expect(monthlyPeriods.length).toBe(12);
    expect(monthlyPeriods[0].key).toBe('2026-01');
    expect(monthlyPeriods[0].label).toBe('Januari 2026');
    expect(monthlyPeriods[0].shortLabel).toBe('Jan');
    expect(monthlyPeriods[11].key).toBe('2026-12');

    const installmentPeriods = DuesService.getPeriodsForWallet(DuesType.TARGET_INSTALLMENTS, 2026, 10);
    expect(installmentPeriods.length).toBe(10);
    expect(installmentPeriods[0].key).toBe('TERMIN-1');
    expect(installmentPeriods[0].label).toBe('Setoran ke-1');
    expect(installmentPeriods[0].shortLabel).toBe('T1');
    expect(installmentPeriods[9].key).toBe('TERMIN-10');
  });

  it('2. Initial dues board shows 0% compliance and WhatsApp reminder list', async () => {
    const board = await DuesService.getDuesBoard(monthlyWallet.id, 2026);

    expect(board.summary.walletName).toBe('Kas RT 05 Bulanan');
    expect(board.summary.duesType).toBe(DuesType.MONTHLY);
    expect(board.summary.duesAmount).toBe(50000);
    expect(board.summary.totalMembers).toBe(4); // admin, pengelola, warga1, warga2
    expect(board.summary.totalCollected).toBe(0);
    expect(board.summary.complianceRatePercent).toBe(0);
    expect(board.summary.unpaidMembers.length).toBe(4);
    expect(board.summary.whatsappReminderText).toContain('PENGINGAT IURAN KAS: KAS RT 05 BULANAN');
    expect(board.summary.whatsappReminderText).toContain('Bapak Budi Santoso');
  });

  it('3. Warga reports multi-period payment (Jan & Feb 2026) -> records PENDING status', async () => {
    const draft = await TransactionService.createDraft(monthlyWallet.id, warga1.id, {
      type: 'INCOME' as any,
      amount: 100000,
      notes: 'Lapor Iuran Kas RT Jan & Feb 2026',
      category: 'IURAN_WARGA',
      periodKeys: ['2026-01', '2026-02'],
    });

    const reportTx = await TransactionService.submitTransaction(draft.id, warga1.id, draft.version);
    expect(reportTx.state).toBe('SUBMITTED');

    const board = await DuesService.getDuesBoard(monthlyWallet.id, 2026);
    const budiRow = board.members.find((m) => m.userId === warga1.id);
    expect(budiRow).toBeDefined();
    expect(budiRow?.records['2026-01']?.status).toBe(DuesPaymentStatus.PENDING);
    expect(budiRow?.records['2026-02']?.status).toBe(DuesPaymentStatus.PENDING);
    expect(budiRow?.pendingCount).toBe(2);
    expect(board.summary.totalPending).toBe(100000);
    expect(board.summary.totalCollected).toBe(0);
  });

  it('4. Pengelola verifies income report (APPROVE) -> records transition to PAID and compliance increases', async () => {
    const boardBefore = await DuesService.getDuesBoard(monthlyWallet.id, 2026);
    const budiRowBefore = boardBefore.members.find((m) => m.userId === warga1.id);
    const txId = budiRowBefore?.records['2026-01']?.transactionId;
    expect(txId).toBeDefined();

    // Verify income report
    const verifiedTx = await TransactionService.verifyIncomeReport(
      txId!,
      pengelola.id,
      {
        decision: 'APPROVE',
        notes: 'Sudah dicek transfer masuk di m-Banking',
      }
    );
    expect(verifiedTx.state).toBe('COMPLETED');

    // Check board state
    const boardAfter = await DuesService.getDuesBoard(monthlyWallet.id, 2026);
    const budiRowAfter = boardAfter.members.find((m) => m.userId === warga1.id);

    expect(budiRowAfter?.records['2026-01']?.status).toBe(DuesPaymentStatus.PAID);
    expect(budiRowAfter?.records['2026-02']?.status).toBe(DuesPaymentStatus.PAID);
    expect(budiRowAfter?.paidCount).toBe(2);
    expect(budiRowAfter?.pendingCount).toBe(0);
    expect(budiRowAfter?.totalPaidAmount).toBe(100000);

    expect(boardAfter.summary.totalCollected).toBe(100000);
    expect(boardAfter.summary.totalPending).toBe(0);
    // 2 paid slots out of (4 members * 12 months = 48 slots) -> 2/48 = 4%
    expect(boardAfter.summary.complianceRatePercent).toBe(4);
  });

  it('5. Rejection of income report removes pending DuesRecord and frees the periods', async () => {
    // Warga 2 reports payment for March 2026
    const draft = await TransactionService.createDraft(monthlyWallet.id, warga2.id, {
      type: 'INCOME' as any,
      amount: 50000,
      notes: 'Iuran Kas Maret 2026',
      category: 'IURAN_WARGA',
      periodKeys: ['2026-03'],
    });

    const reportTx = await TransactionService.submitTransaction(draft.id, warga2.id, draft.version);
    expect(reportTx.state).toBe('SUBMITTED');

    // Check it is pending
    const board1 = await DuesService.getDuesBoard(monthlyWallet.id, 2026);
    const sitiRow1 = board1.members.find((m) => m.userId === warga2.id);
    expect(sitiRow1?.records['2026-03']?.status).toBe(DuesPaymentStatus.PENDING);

    // Pengelola REJECTS it
    await TransactionService.verifyIncomeReport(
      reportTx.id,
      pengelola.id,
      {
        decision: 'REJECT',
        notes: 'Bukti transfer buram/tidak terbaca',
      }
    );

    // Check board again: period 2026-03 should no longer exist in records (freed)
    const board2 = await DuesService.getDuesBoard(monthlyWallet.id, 2026);
    const sitiRow2 = board2.members.find((m) => m.userId === warga2.id);
    expect(sitiRow2?.records['2026-03']).toBeUndefined();
    expect(sitiRow2?.pendingCount).toBe(0);
  });

  it('6. Installment wallet board functions with TERMIN keys', async () => {
    // Admin records income for Warga 1 for Termin 1 and 2
    const draft = await TransactionService.createDraft(installmentWallet.id, admin.id, {
      type: 'INCOME' as any,
      amount: 200000,
      notes: 'Setoran Termin 1 dan 2 Qurban',
      category: 'IURAN_WARGA',
      periodKeys: ['TERMIN-1', 'TERMIN-2'],
      targetUserId: warga1.id,
    });

    const completedTx = await TransactionService.submitTransaction(draft.id, admin.id, draft.version);
    expect(completedTx.state).toBe('COMPLETED');

    const board = await DuesService.getDuesBoard(installmentWallet.id);
    expect(board.periods.length).toBe(10);
    expect(board.periods[0].key).toBe('TERMIN-1');

    const budiRow = board.members.find((m) => m.userId === warga1.id);
    expect(budiRow?.records['TERMIN-1']?.status).toBe(DuesPaymentStatus.PAID);
    expect(budiRow?.records['TERMIN-2']?.status).toBe(DuesPaymentStatus.PAID);
    expect(budiRow?.paidCount).toBe(2);
    expect(board.summary.totalCollected).toBe(200000);
  });
});
