import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { prisma } from '../common/prisma';
import { AuthService } from './auth/auth.service';
import { WalletService } from './wallets/wallet.service';
import { TransactionService } from './transactions/transaction.service';
import { AuditService } from './audit/audit.service';
import { GENESIS_PREVIOUS_HASH } from '../algorithms/hash-chain/hash-chain';
import { TransactionType, WalletRole, ApprovalDecision } from '@prisma/client';

describe('Fase 5: Tamper-Evident SHA-256 Audit Hash Chain', () => {
  const timestamp = Date.now();
  let admin: any;
  let pengelola: any;
  let wallet: any;
  let expenseTx: any;
  let originalSequence2Payload: string;

  beforeAll(async () => {
    // 1. Create Users
    const u1 = await AuthService.register({
      fullName: 'Ketua Lingkungan (Admin)',
      email: `audit_admin_${timestamp}@kasbareng.test`,
      password: 'PasswordSuper123!',
    });
    admin = u1.user;

    const u2 = await AuthService.register({
      fullName: 'Bendahara Kas (Pengelola)',
      email: `audit_pengelola_${timestamp}@kasbareng.test`,
      password: 'PasswordSuper123!',
    });
    pengelola = u2.user;

    // 2. Create Wallet (This automatically creates WALLET_GENESIS_CREATED in AuditLog)
    wallet = await WalletService.createWallet(admin.id, {
      name: `Kas Audit Rantai ${timestamp}`,
      description: 'Pengujian Audit Hash Chain',
      requiredApprovals: 1,
    });

    // 3. Add Pengelola
    await WalletService.addWalletMember(wallet.id, {
      email: pengelola.email,
      role: WalletRole.PENGELOLA,
    });

    // 4. Inject Income so balance is sufficient
    const incomeDraft = await TransactionService.createDraft(wallet.id, admin.id, {
      type: TransactionType.INCOME,
      amount: 1000000,
      category: 'Iuran Awal',
      notes: 'Kas awal',
    });
    await TransactionService.submitTransaction(incomeDraft.id, admin.id, incomeDraft.version);
  });

  afterAll(async () => {
    if (wallet) {
      await prisma.wallet.delete({ where: { id: wallet.id } }).catch(() => {});
    }
    const userIds = [admin?.id, pengelola?.id].filter(Boolean);
    for (const uid of userIds) {
      await prisma.user.delete({ where: { id: uid } }).catch(() => {});
    }
    await prisma.$disconnect();
  });

  it('1. generates a valid Genesis Audit Event linked to 64-zero genesis hash', async () => {
    const genesisLog = await prisma.auditLog.findUnique({
      where: {
        walletId_sequenceNo: { walletId: wallet.id, sequenceNo: 1 },
      },
    });

    expect(genesisLog).toBeDefined();
    expect(genesisLog?.sequenceNo).toBe(1);
    expect(genesisLog?.previousHash).toBe(GENESIS_PREVIOUS_HASH);
    expect(genesisLog?.payloadHash).toBeDefined();
    expect(genesisLog?.currentHash).toBeDefined();
    expect(genesisLog?.canonicalPayload).toContain('WALLET_GENESIS_CREATED');
  });

  it('2. forms a strictly linked hash chain (H_1 -> H_2 -> H_3...) across transaction events', async () => {
    // Create an Expense Draft (seq 4)
    expenseTx = await TransactionService.createDraft(wallet.id, admin.id, {
      type: TransactionType.EXPENSE,
      amount: 150000,
      category: 'Belanja Sapu & Alat Bersih',
      notes: 'Keperluan kerja bakti',
    });

    // Submit Expense (seq 5)
    expenseTx = await TransactionService.submitTransaction(expenseTx.id, admin.id, expenseTx.version);

    // Pengelola Approves -> Quorum Met! (seq 6)
    const approvalRes = await TransactionService.processApproval(expenseTx.id, pengelola.id, {
      decision: ApprovalDecision.APPROVE,
      expectedVersion: expenseTx.version,
      comment: 'Disetujui untuk kerja bakti',
    });
    expenseTx = approvalRes.transaction;

    // Execute Payment (seq 7)
    await TransactionService.executePayment(expenseTx.id, pengelola.id, {
      paymentReference: 'TRF-ALATBERSIH-001',
      notes: 'Dibeli di Toko Kelontong Bu Siti',
      expectedVersion: expenseTx.version,
    });

    // Fetch all logs
    const logs = await prisma.auditLog.findMany({
      where: { walletId: wallet.id },
      orderBy: { sequenceNo: 'asc' },
    });

    expect(logs.length).toBeGreaterThanOrEqual(6);

    // Verify monotonic sequencing and cryptographic link
    for (let i = 1; i < logs.length; i++) {
      expect(logs[i].sequenceNo).toBe(logs[i - 1].sequenceNo + 1);
      expect(logs[i].previousHash).toBe(logs[i - 1].currentHash);
    }
  });

  it('3. verifies the entire audit hash chain successfully (valid: true)', async () => {
    const verification = await AuditService.verifyWalletChain(wallet.id);

    expect(verification.valid).toBe(true);
    expect(verification.totalEvents).toBeGreaterThanOrEqual(6);
    expect(verification.failedIndex).toBeUndefined();
    expect(verification.errorCode).toBeUndefined();
  });

  it('4. returns paginated audit log events with parsed payloads', async () => {
    const listRes = await AuditService.getWalletAuditLogs(wallet.id, { page: 1, limit: 10 });

    expect(listRes.logs.length).toBeGreaterThan(0);
    expect(listRes.pagination.total).toBeGreaterThanOrEqual(6);
    expect(listRes.logs[0].payload).toBeDefined();
    expect(listRes.logs[0].payload.walletId).toBe(wallet.id);
  });

  it('5. Tamper-Evident Drill: detects database tampering and pinpoints the corrupted sequence', async () => {
    // Read original payload of sequence #2
    const originalLog = await prisma.auditLog.findUnique({
      where: { walletId_sequenceNo: { walletId: wallet.id, sequenceNo: 2 } },
    });
    originalSequence2Payload = originalLog!.canonicalPayload!;

    // Malicious actor alters record content in the database directly
    const maliciousPayload = originalSequence2Payload.replace(
      'Iuran Awal',
      'Iuran Palsu Manipulasi Attacker'
    );
    await AuditService.simulateTamper(wallet.id, 2, maliciousPayload);

    // Verification must immediately FAIL!
    const tamperedVerification = await AuditService.verifyWalletChain(wallet.id);

    expect(tamperedVerification.valid).toBe(false);
    expect(tamperedVerification.failedSequenceNo).toBe(2);
    expect(tamperedVerification.failedIndex).toBe(1);
    expect(tamperedVerification.errorCode).toBe('PAYLOAD_HASH_MISMATCH');
    expect(tamperedVerification.errorMessage).toContain('Tampered payload at index 1');
  });

  it('6. recovers and restores chain validity once tampered data is repaired', async () => {
    // Repair the log back to its legitimate canonical form
    await AuditService.repairLog(wallet.id, 2, originalSequence2Payload);

    // Verify chain is pristine again
    const restoredVerification = await AuditService.verifyWalletChain(wallet.id);

    expect(restoredVerification.valid).toBe(true);
    expect(restoredVerification.errorCode).toBeUndefined();
  });
});
