import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { prisma } from '../common/prisma';
import { AuthService } from './auth/auth.service';
import { WalletService } from './wallets/wallet.service';
import { TransactionService } from './transactions/transaction.service';
import { TransactionType, TransactionState, WalletRole, ApprovalDecision } from '@prisma/client';

describe('Fase 4: Multi-Approval M-of-N & Ledger Balance', () => {
  const timestamp = Date.now();
  let admin1: any; // Creator
  let admin2: any; // Second approver
  let pengelola: any; // Third approver
  let warga: any; // Citizen (non-approver)
  let wallet: any;
  let expenseTx: any;
  let rejectedTx: any;

  beforeAll(async () => {
    // 1. Create Users
    const u1 = await AuthService.register({
      fullName: 'Ketua RT (Admin 1)',
      email: `admin1_${timestamp}@kasbareng.test`,
      password: 'PasswordSuper123!',
    });
    admin1 = u1.user;

    const u2 = await AuthService.register({
      fullName: 'Sekretaris (Admin 2)',
      email: `admin2_${timestamp}@kasbareng.test`,
      password: 'PasswordSuper123!',
    });
    admin2 = u2.user;

    const u3 = await AuthService.register({
      fullName: 'Bendahara (Pengelola)',
      email: `pengelola_${timestamp}@kasbareng.test`,
      password: 'PasswordSuper123!',
    });
    pengelola = u3.user;

    const u4 = await AuthService.register({
      fullName: 'Warga Pak Budi',
      email: `warga_${timestamp}@kasbareng.test`,
      password: 'PasswordSuper123!',
    });
    warga = u4.user;

    // 2. Create Wallet with requiredApprovals = 2
    wallet = await WalletService.createWallet(admin1.id, {
      name: `Kas RW Fase 4 ${timestamp}`,
      description: 'Pengujian Kuorum M-of-N & Ledger',
      requiredApprovals: 2,
    });

    // 3. Add members
    await WalletService.addWalletMember(wallet.id, {
      email: admin2.email,
      role: WalletRole.ADMIN,
    });

    await WalletService.addWalletMember(wallet.id, {
      email: pengelola.email,
      role: WalletRole.PENGELOLA,
    });

    await WalletService.addWalletMember(wallet.id, {
      email: warga.email,
      role: WalletRole.WARGA,
    });

    // 4. Inject initial income to have sufficient balance (Rp 2.000.000)
    const incomeDraft = await TransactionService.createDraft(wallet.id, admin1.id, {
      type: TransactionType.INCOME,
      amount: 2000000,
      category: 'Iuran Awal',
      notes: 'Saldo awal kas untuk operasional',
    });
    await TransactionService.submitTransaction(incomeDraft.id, admin1.id, incomeDraft.version);
  });

  afterAll(async () => {
    if (wallet) {
      await prisma.wallet.delete({ where: { id: wallet.id } }).catch(() => {});
    }
    const userIds = [admin1?.id, admin2?.id, pengelola?.id, warga?.id].filter(Boolean);
    for (const uid of userIds) {
      await prisma.user.delete({ where: { id: uid } }).catch(() => {});
    }
    await prisma.$disconnect();
  });

  it('1. fetches active approval policy and eligible approvers correctly', async () => {
    const policyData = await WalletService.getWalletPolicy(wallet.id);

    expect(policyData.policy).toBeDefined();
    expect(policyData.policy.requiredApprovals).toBe(2);
    expect(policyData.policy.policyVersion).toBe(1);
    expect(policyData.eligibleApproverCount).toBe(3); // admin1, admin2, pengelola
    const approverIds = policyData.eligibleApprovers.map((a) => a.id);
    expect(approverIds).toContain(admin1.id);
    expect(approverIds).toContain(admin2.id);
    expect(approverIds).toContain(pengelola.id);
    expect(approverIds).not.toContain(warga.id);
  });

  it('2. allows Admin to update M-of-N policy and increments policyVersion', async () => {
    const updated = await WalletService.updateWalletPolicy(wallet.id, admin1.id, {
      requiredApprovals: 2,
      thresholdAmount: 500000, // Rp 500.000
    });

    expect(updated.policyVersion).toBe(2);
    expect(updated.requiredApprovals).toBe(2);
    expect(updated.thresholdAmount).toBe(500000);
  });

  it('3. rejects policy update when requiredApprovals exceeds eligible approvers count', async () => {
    await expect(
      WalletService.updateWalletPolicy(wallet.id, admin1.id, {
        requiredApprovals: 99, // Only 3 eligible approvers exist
      })
    ).rejects.toMatchObject({
      code: 'INVALID_POLICY_QUORUM',
      status: 400,
    });
  });

  it('4. creates and submits an EXPENSE draft: reserves balance in PENDING_APPROVAL', async () => {
    const draft = await TransactionService.createDraft(wallet.id, admin1.id, {
      type: TransactionType.EXPENSE,
      amount: 400000, // Rp 400.000
      category: 'Perbaikan Lampu Ronda',
      notes: 'Beli kabel dan lampu LED pos ronda',
    });

    const submitted = await TransactionService.submitTransaction(draft.id, admin1.id, draft.version);

    expect(submitted.state).toBe(TransactionState.PENDING_APPROVAL);

    // Verify balance reservation: postedBalance is still 2,000,000, but available is 1,600,000!
    const summary = await TransactionService.getWalletBalanceSummary(wallet.id);
    expect(summary.postedBalance).toBe(2000000);
    expect(summary.activeReservations).toBe(400000);
    expect(summary.availableBalance).toBe(1600000);

    expenseTx = submitted;
  });

  it('5. enforces Anti-Self Approval: creator (Admin 1) cannot approve their own expense', async () => {
    await expect(
      TransactionService.processApproval(expenseTx.id, admin1.id, {
        decision: ApprovalDecision.APPROVE,
        expectedVersion: expenseTx.version,
      })
    ).rejects.toMatchObject({
      code: 'SELF_APPROVAL_NOT_ALLOWED',
      status: 403,
    });
  });

  it('6. enforces role check: WARGA cannot approve expenses', async () => {
    await expect(
      TransactionService.processApproval(expenseTx.id, warga.id, {
        decision: ApprovalDecision.APPROVE,
        expectedVersion: expenseTx.version,
      })
    ).rejects.toMatchObject({
      code: 'NOT_AN_ELIGIBLE_APPROVER',
      status: 403,
    });
  });

  it('7. processes first approval (1 of 2): state remains PENDING_APPROVAL', async () => {
    const res1 = await TransactionService.processApproval(expenseTx.id, admin2.id, {
      decision: ApprovalDecision.APPROVE,
      expectedVersion: expenseTx.version,
      comment: 'Disetujui untuk keamanan lingkungan',
    });

    expect(res1.approval.decision).toBe(ApprovalDecision.APPROVE);
    expect(res1.quorumResult.approved).toBe(false);
    expect(res1.quorumResult.validApprovalCount).toBe(1);
    expect(res1.quorumResult.requiredApprovals).toBe(2);
    expect(res1.transaction.state).toBe(TransactionState.PENDING_APPROVAL);
  });

  it('8. rejects duplicate approval from the same approver on the same version', async () => {
    await expect(
      TransactionService.processApproval(expenseTx.id, admin2.id, {
        decision: ApprovalDecision.APPROVE,
        expectedVersion: expenseTx.version,
      })
    ).rejects.toMatchObject({
      code: 'DUPLICATE_APPROVAL',
      status: 409,
    });
  });

  it('9. processes second approval (2 of 2): Quorum met! Transitions to APPROVED and increments version', async () => {
    const res2 = await TransactionService.processApproval(expenseTx.id, pengelola.id, {
      decision: ApprovalDecision.APPROVE,
      expectedVersion: expenseTx.version,
      comment: 'Sesuai dengan anggaran RT',
    });

    expect(res2.quorumResult.approved).toBe(true);
    expect(res2.quorumResult.validApprovalCount).toBe(2);
    expect(res2.transaction.state).toBe(TransactionState.APPROVED);
    expect(res2.transaction.version).toBe(expenseTx.version + 1);

    expenseTx = res2.transaction;
  });

  it('10. executes payment: transitions to COMPLETED, posts DEBIT to ledger, and releases reservation', async () => {
    const paymentRes = await TransactionService.executePayment(expenseTx.id, pengelola.id, {
      paymentReference: 'TRF-BCA-98765',
      notes: 'Transfer via m-BCA ke Toko Listrik Jaya',
      expectedVersion: expenseTx.version,
    });

    expect(paymentRes.transaction.state).toBe(TransactionState.COMPLETED);
    expect(paymentRes.paymentRecord.paymentStatus).toBe('VERIFIED');
    expect(paymentRes.paymentRecord.paymentReference).toBe('TRF-BCA-98765');
    expect(paymentRes.ledgerEntry.entryType).toBe('DEBIT');
    expect(Number(paymentRes.ledgerEntry.amount)).toBe(400000);

    // Verify balance summary:
    // Posted balance was 2,000,000 - 400,000 = 1,600,000
    // Active reservation is 0!
    // Available balance is 1,600,000!
    const summary = await TransactionService.getWalletBalanceSummary(wallet.id);
    expect(summary.postedBalance).toBe(1600000);
    expect(summary.activeReservations).toBe(0);
    expect(summary.availableBalance).toBe(1600000);
    expect(summary.isValid).toBe(true);
  });

  it('11. handles explicit rejection: state becomes REJECTED and releases active reservation immediately', async () => {
    // Create new expense draft
    const draft = await TransactionService.createDraft(wallet.id, admin1.id, {
      type: TransactionType.EXPENSE,
      amount: 250000,
      category: 'Snack Rapat',
      notes: 'Snack rapat warga mingguan',
    });

    const submitted = await TransactionService.submitTransaction(draft.id, admin1.id, draft.version);

    // Check reservation
    let summary = await TransactionService.getWalletBalanceSummary(wallet.id);
    expect(summary.activeReservations).toBe(250000);
    expect(summary.availableBalance).toBe(1600000 - 250000);

    // Admin 2 rejects the transaction
    const rejectRes = await TransactionService.processApproval(submitted.id, admin2.id, {
      decision: ApprovalDecision.REJECT,
      comment: 'Snack sudah disediakan sukarela oleh warga',
    });

    expect(rejectRes.transaction.state).toBe(TransactionState.REJECTED);
    expect(rejectRes.quorumResult.hasRejectionDecision).toBe(true);

    // Check that reservation is completely released!
    summary = await TransactionService.getWalletBalanceSummary(wallet.id);
    expect(summary.activeReservations).toBe(0);
    expect(summary.postedBalance).toBe(1600000);
    expect(summary.availableBalance).toBe(1600000);
  });
});
