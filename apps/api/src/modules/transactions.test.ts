import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { prisma } from '../common/prisma';
import { AuthService } from './auth/auth.service';
import { WalletService } from './wallets/wallet.service';
import { TransactionService } from './transactions/transaction.service';
import { TransactionType, TransactionState, WalletRole } from '@prisma/client';

describe('Fase 3: Transaction Core & FSM Integration', () => {
  const timestamp = Date.now();
  let adminUser: any;
  let wallet: any;
  let incomeTx: any;
  let expenseTx: any;

  beforeAll(async () => {
    // 1. Create admin user
    const authRes = await AuthService.register({
      fullName: 'Bendahara Kas',
      email: `bendahara_${timestamp}@kasbareng.test`,
      password: 'PasswordSuper123!',
    });
    adminUser = authRes.user;

    // 2. Create wallet
    wallet = await WalletService.createWallet(adminUser.id, {
      name: `Kas RW Transparan ${timestamp}`,
      description: 'Pengujian transaksi dan FSM',
      requiredApprovals: 2,
    });
  });

  afterAll(async () => {
    if (wallet) {
      await prisma.wallet.delete({ where: { id: wallet.id } }).catch(() => {});
    }
    if (adminUser) {
      await prisma.user.delete({ where: { id: adminUser.id } }).catch(() => {});
    }
    await prisma.$disconnect();
  });

  it('1. creates an INCOME transaction draft in DRAFT state with version 1', async () => {
    incomeTx = await TransactionService.createDraft(wallet.id, adminUser.id, {
      type: TransactionType.INCOME,
      amount: 1000000, // Rp 1.000.000
      category: 'Iuran Bulanan',
      notes: 'Iuran warga blok A',
    });

    expect(incomeTx.id).toBeDefined();
    expect(incomeTx.state).toBe(TransactionState.DRAFT);
    expect(incomeTx.version).toBe(1);
    expect(Number(incomeTx.amount)).toBe(1000000);

    // Verify transaction event created
    const event = await prisma.transactionEvent.findFirst({
      where: { transactionId: incomeTx.id, eventType: 'DRAFT_CREATED' },
    });
    expect(event).toBeDefined();
    expect(event?.toState).toBe(TransactionState.DRAFT);
  });

  it('2. updates draft fields with correct optimistic locking (version incremented)', async () => {
    const updated = await TransactionService.updateDraft(incomeTx.id, adminUser.id, {
      expectedVersion: 1,
      amount: 1500000, // Revised to Rp 1.500.000
      category: 'Iuran Bulanan Revisi',
    });

    expect(updated.version).toBe(2);
    expect(updated.amount).toBe(1500000);
    expect(updated.category).toBe('Iuran Bulanan Revisi');

    incomeTx = updated;
  });

  it('3. rejects updateDraft when expectedVersion does not match (optimistic lock conflict)', async () => {
    await expect(
      TransactionService.updateDraft(incomeTx.id, adminUser.id, {
        expectedVersion: 1, // Stale version! (Current is 2)
        amount: 2000000,
      })
    ).rejects.toMatchObject({
      code: 'TRANSACTION_VERSION_CONFLICT',
      status: 409,
    });
  });

  it('4. submits INCOME draft: transitions to COMPLETED and books CREDIT to ledger', async () => {
    const submitted = await TransactionService.submitTransaction(
      incomeTx.id,
      adminUser.id,
      incomeTx.version
    );

    expect(submitted.state).toBe(TransactionState.COMPLETED);
    expect(submitted.version).toBe(3);

    // Check balance summary: posted & available balance should both be 1,500,000
    const summary = await TransactionService.getWalletBalanceSummary(wallet.id);
    expect(summary.postedBalance).toBe(1500000);
    expect(summary.availableBalance).toBe(1500000);
    expect(summary.activeReservations).toBe(0);
  });

  it('5. rejects EXPENSE submission if amount exceeds available balance', async () => {
    // Current available balance is 1,500,000. Try to create expense of 5,000,000!
    const bigExpense = await TransactionService.createDraft(wallet.id, adminUser.id, {
      type: TransactionType.EXPENSE,
      amount: 5000000, // Rp 5.000.000
      category: 'Renovasi Pos',
      notes: 'Biaya renovasi melebihi kas',
    });

    await expect(
      TransactionService.submitTransaction(bigExpense.id, adminUser.id, 1)
    ).rejects.toMatchObject({
      code: 'INSUFFICIENT_AVAILABLE_BALANCE',
      status: 400,
    });
  });

  it('6. submits EXPENSE with sufficient balance: moves DRAFT -> SUBMITTED -> PENDING_APPROVAL and reserves funds', async () => {
    // Expense of 500,000 (within 1,500,000 balance)
    expenseTx = await TransactionService.createDraft(wallet.id, adminUser.id, {
      type: TransactionType.EXPENSE,
      amount: 500000, // Rp 500.000
      category: 'Konsumsi Rapat',
      notes: 'Snack dan konsumsi musyawarah warga',
    });

    const submittedExpense = await TransactionService.submitTransaction(
      expenseTx.id,
      adminUser.id,
      1
    );

    expect(submittedExpense.state).toBe(TransactionState.PENDING_APPROVAL);

    // Verify available balance is reduced by reservation (1,500,000 - 500,000 = 1,000,000)
    // while posted balance remains 1,500,000
    const summary = await TransactionService.getWalletBalanceSummary(wallet.id);
    expect(summary.postedBalance).toBe(1500000);
    expect(summary.activeReservations).toBe(500000);
    expect(summary.availableBalance).toBe(1000000);

    expenseTx = submittedExpense;
  });

  it('7. rejects editing a transaction that is already PENDING_APPROVAL', async () => {
    await expect(
      TransactionService.updateDraft(expenseTx.id, adminUser.id, {
        expectedVersion: expenseTx.version,
        amount: 400000,
      })
    ).rejects.toMatchObject({
      code: 'INVALID_STATE_TRANSITION',
      status: 400,
    });
  });

  it('8. cancels transaction: moves to CANCELLED and releases funds from active reservations', async () => {
    const cancelled = await TransactionService.cancelTransaction(
      expenseTx.id,
      adminUser.id,
      'Rapat diundur, anggaran dibatalkan.'
    );

    expect(cancelled.state).toBe(TransactionState.CANCELLED);

    // Reservation should be released, restoring available balance to 1,500,000
    const summary = await TransactionService.getWalletBalanceSummary(wallet.id);
    expect(summary.postedBalance).toBe(1500000);
    expect(summary.activeReservations).toBe(0);
    expect(summary.availableBalance).toBe(1500000);
  });
});