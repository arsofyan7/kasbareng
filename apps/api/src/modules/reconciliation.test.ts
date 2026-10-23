import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { prisma } from '../common/prisma';
import { AuthService } from './auth/auth.service';
import { WalletService } from './wallets/wallet.service';
import { ReconciliationService } from './reconciliation/reconciliation.service';
import { AuditService } from './audit/audit.service';
import { parseBankStatementCsv } from './reconciliation/csv-parser';
import { ReconciliationStatus } from '@prisma/client';

describe('Fase 6: Rekonsiliasi Bank CSV & Deterministic Matching', () => {
  const timestamp = Date.now();
  let admin: any;
  let wallet: any;

  let tx1Id: string;
  let tx2Id: string;
  let txAmbiguousAId: string;
  let txAmbiguousBId: string;

  beforeAll(async () => {
    // 1. Create Admin
    const u1 = await AuthService.register({
      fullName: 'Bendahara Kas Recon',
      email: `recon_admin_${timestamp}@kasbareng.test`,
      password: 'PasswordSuper123!',
    });
    admin = u1.user;

    // 2. Create Wallet
    wallet = await WalletService.createWallet(admin.id, {
      name: 'Kas RT 08 Rekonsiliasi Bank',
      requiredApprovals: 1,
    });
  });

  afterAll(async () => {
    // Clean up test data
    if (wallet?.id) {
      await prisma.wallet.delete({ where: { id: wallet.id } }).catch(() => {});
    }
  });

  it('1. CSV Parser: parses BCA format correctly', () => {
    const bcaCsv = `Tanggal,Keterangan,Cabang,Jumlah,Tipe,Saldo
15/10/2026,TRX-BCA-001 TRANSFER IURAN WARGA,0123,"250.000,00",CR,"1.250.000,00"
16/10/2026,TARIK TUNAI PEMBELIAN LAMPU JALAN,0123,"75.000,00",DB,"1.175.000,00"`;

    const res = parseBankStatementCsv(bcaCsv);
    expect(res.totalRowsParsed).toBe(2);
    expect(res.detectedBankFormat).toBe('BCA');
    expect(res.rows[0].transactionDate).toBe('2026-10-15');
    expect(res.rows[0].amount).toBe(250000);
    expect(res.rows[0].direction).toBe('CREDIT');
    expect(res.rows[0].externalReference).toBe('TRX-BCA-001');

    expect(res.rows[1].amount).toBe(75000);
    expect(res.rows[1].direction).toBe('DEBIT');
  });

  it('2. CSV Parser: parses Mandiri format with separate Debit/Credit columns', () => {
    const mandiriCsv = `Tanggal Transaksi,No Referensi,Keterangan,Debet,Kredit,Saldo
2026-10-18,REF-MDR-9988,IURAN BULANAN KAS RT 05,,500000.00,500000.00
2026-10-19,REF-MDR-9989,BIAYA FOTOCOPY DOKUMEN,35000.00,,465000.00`;

    const res = parseBankStatementCsv(mandiriCsv);
    expect(res.totalRowsParsed).toBe(2);
    expect(res.rows[0].amount).toBe(500000);
    expect(res.rows[0].direction).toBe('CREDIT');
    expect(res.rows[0].externalReference).toBe('REF-MDR-9988');

    expect(res.rows[1].amount).toBe(35000);
    expect(res.rows[1].direction).toBe('DEBIT');
  });

  it('3. Setup internal transactions for reconciliation matching', async () => {
    // Transaction 1: Income with explicit payment reference TRX-EXACT-01
    const t1 = await prisma.transaction.create({
      data: {
        walletId: wallet.id,
        creatorId: admin.id,
        type: 'INCOME',
        amount: 250000,
        category: 'Iuran Warga Blok A',
        notes: 'REF:TRX-EXACT-01',
        state: 'COMPLETED',
        version: 1,
      },
    });
    tx1Id = t1.id;
    await prisma.paymentRecord.create({
      data: {
        transactionId: tx1Id,
        paymentStatus: 'PAID',
        paymentReference: 'TRX-EXACT-01',
      },
    });
    await prisma.ledgerEntry.create({
      data: {
        walletId: wallet.id,
        transactionId: tx1Id,
        entryType: 'CREDIT',
        amount: 250000,
      },
    });

    // Transaction 2: Expense with no explicit reference (150.000)
    const t2 = await prisma.transaction.create({
      data: {
        walletId: wallet.id,
        creatorId: admin.id,
        type: 'EXPENSE',
        amount: 150000,
        category: 'Konsumsi Kerja Bakti',
        notes: 'Beli nasi kotak untuk warga',
        state: 'COMPLETED',
        version: 1,
      },
    });
    tx2Id = t2.id;
    await prisma.ledgerEntry.create({
      data: {
        walletId: wallet.id,
        transactionId: tx2Id,
        entryType: 'DEBIT',
        amount: 150000,
      },
    });

    // Candidates for Ambiguous Test: 2 transactions with exact same amount 100.000
    const tAmbA = await prisma.transaction.create({
      data: {
        walletId: wallet.id,
        creatorId: admin.id,
        type: 'INCOME',
        amount: 100000,
        category: 'Donasi Kebersihan Warga 1',
        state: 'COMPLETED',
        version: 1,
      },
    });
    txAmbiguousAId = tAmbA.id;

    const tAmbB = await prisma.transaction.create({
      data: {
        walletId: wallet.id,
        creatorId: admin.id,
        type: 'INCOME',
        amount: 100000,
        category: 'Donasi Kebersihan Warga 2',
        state: 'COMPLETED',
        version: 1,
      },
    });
    txAmbiguousBId = tAmbB.id;
  });

  it('4. Imports CSV and runs 3-pass deterministic matching', async () => {
    const today = new Date().toISOString().split('T')[0];

    // CSV containing:
    // Row 1: Exact match with tx1 (250000, CR, TRX-EXACT-01)
    // Row 2: Nominal+date window match with tx2 (150000, DB, no ref)
    // Row 3: Ambiguous match with txAmbiguousA and txAmbiguousB (100000, CR)
    // Row 4: Unmatched bank mutation (50000, CR, transfer misterius)
    const sampleCsv = `Tanggal,Referensi,Keterangan,Nominal,Tipe
${today},TRX-EXACT-01,Transfer Iuran Kas Warga,250000,CR
${today},,Belanja Konsumsi Kerja Bakti,150000,DB
${today},,Donasi Taman Warga,100000,CR
${today},REF-UNKNOWN-99,Transfer Kas Dari Hamba Allah,50000,CR`;

    const result = await ReconciliationService.importBankStatementCsv(
      wallet.id,
      admin.id,
      sampleCsv,
      'rekening_koran_oktober.csv'
    );

    expect(result.importBatchId).toBeDefined();
    expect(result.summary.totalBankMutations).toBe(4);
    // At least 2 auto-matched (Rule 1 & Rule 2)
    expect(result.summary.matchedCount).toBe(2);
    // 1 ambiguous item (100000 matches candidate A & B)
    expect(result.summary.ambiguousCount).toBe(1);
    // 1 unmatched bank mutation (50000)
    expect(result.summary.unmatchedBankCount).toBe(1);

    // Verify row 1 exact match (Rule 1)
    const matchRow1 = result.summary.bankStatements.find((b) => b.externalReference === 'TRX-EXACT-01');
    expect(matchRow1).toBeDefined();
    expect(matchRow1!.matchStatus).toBe(ReconciliationStatus.MATCHED);
    expect(matchRow1!.ruleCode).toBe('EXACT_REFERENCE');
    expect(matchRow1!.transactionId).toBe(tx1Id);

    // Verify row 2 date window match (Rule 2)
    const matchRow2 = result.summary.bankStatements.find((b) => b.amount === 150000 && b.direction === 'DEBIT');
    expect(matchRow2).toBeDefined();
    expect(matchRow2!.matchStatus).toBe(ReconciliationStatus.MATCHED);
    expect(matchRow2!.ruleCode).toBe('NOMINAL_DIRECTION_DATE_WINDOW');
    expect(matchRow2!.transactionId).toBe(tx2Id);

    // Verify row 3 ambiguous
    const matchRow3 = result.summary.bankStatements.find((b) => b.amount === 100000);
    expect(matchRow3).toBeDefined();
    expect(matchRow3!.matchStatus).toBe(ReconciliationStatus.AMBIGUOUS);
    expect(matchRow3!.candidateTransactions?.length).toBeGreaterThanOrEqual(2);
  });

  it('5. Retrieves current reconciliation summary and categorized lists', async () => {
    const summary = await ReconciliationService.getReconciliationSummary(wallet.id);

    expect(summary.totalBankMutations).toBe(4);
    expect(summary.bankStatements.length).toBe(4);
    expect(summary.precisionAutoMatchPercent).toBe(50); // 2 of 4 matched = 50%
  });

  it('6. Manual Match: resolves ambiguous bank mutation with explicit audit reason', async () => {
    const summary = await ReconciliationService.getReconciliationSummary(wallet.id);
    const ambiguousStmt = summary.bankStatements.find((b) => b.matchStatus === ReconciliationStatus.AMBIGUOUS);
    expect(ambiguousStmt).toBeDefined();

    // Match manually to txAmbiguousAId
    const res = await ReconciliationService.resolveManualMatch(
      wallet.id,
      admin.id,
      ambiguousStmt!.id,
      txAmbiguousAId,
      'Dikonfirmasi melalui struk mutasi WhatsApp milik Bpk. Joko Warga 1.'
    );

    expect(res.matchId).toBeDefined();

    // Verify status changed to MATCHED with MANUAL_MATCH
    const updatedSummary = await ReconciliationService.getReconciliationSummary(wallet.id);
    const resolvedStmt = updatedSummary.bankStatements.find((b) => b.id === ambiguousStmt!.id);
    expect(resolvedStmt!.matchStatus).toBe(ReconciliationStatus.MATCHED);
    expect(resolvedStmt!.ruleCode).toBe('MANUAL_MATCH');
    expect(resolvedStmt!.transactionId).toBe(txAmbiguousAId);
  });

  it('7. Creates KasBareng transaction from unmatched bank mutation', async () => {
    const summary = await ReconciliationService.getReconciliationSummary(wallet.id);
    const unmatchedStmt = summary.bankStatements.find((b) => b.matchStatus === ReconciliationStatus.UNMATCHED);
    expect(unmatchedStmt).toBeDefined();

    const created = await ReconciliationService.createTransactionFromBankMutation(
      wallet.id,
      admin.id,
      unmatchedStmt!.id,
      'Infaq & Donasi Spontan',
      'Pencatatan kas otomatis dari transfer bank tanpa keterangan'
    );

    expect(created.transactionId).toBeDefined();

    // Verify bank statement is now MATCHED
    const finalSummary = await ReconciliationService.getReconciliationSummary(wallet.id);
    const updatedStmt = finalSummary.bankStatements.find((b) => b.id === unmatchedStmt!.id);
    expect(updatedStmt!.matchStatus).toBe(ReconciliationStatus.MATCHED);
    expect(updatedStmt!.ruleCode).toBe('CREATED_FROM_BANK_MUTATION');
  });

  it('8. Verifies SHA-256 audit hash chain remains strictly valid after reconciliation events', async () => {
    const auditRes = await AuditService.verifyWalletChain(wallet.id);

    expect(auditRes.valid).toBe(true);
    expect(auditRes.totalEvents).toBeGreaterThanOrEqual(4);
  });
});
