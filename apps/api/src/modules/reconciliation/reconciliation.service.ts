/**
 * ============================================================================
 * MODUL REKONSILIASI: SERVICE REKONSILIASI BANK (reconciliation.service.ts)
 * ============================================================================
 * Service ini menangani siklus hidup rekonsiliasi antara mutasi rekening bank dan
 * pembukuan kas internal komunitas KasBareng:
 * 1. Impor batch mutasi bank CSV dan penyimpanan persisten ke database.
 * 2. Eksekusi algoritma 3-Pass Deterministic Matching:
 *    - Pass 1 (Exact Match): Pencocokan presisi nomor referensi bank, nominal, dan arah mutasi.
 *    - Pass 2 (Date Window & Amount Match): Pencocokan nominal, arah, dan jendela waktu tanggal (toleransi 3 hari).
 *    - Pass 3 (Fuzzy Description & Amount): Pencocokan deskripsi transfer dan nominal.
 * 3. Deteksi anomali: Transaksi ambigu (multiple candidate) dan potensi duplikasi referensi bank.
 * 4. Resolusi pencocokan manual dengan audit logging ke SHA-256 hash chain.
 * 5. Pembuatan instan transaksi kas dari mutasi bank yang belum tercatat (misal: bunga/biaya admin).
 */

import crypto from 'crypto';
import { prisma } from '../../common/prisma';
import { AppError } from '../../common/errors';
import {
  MovementDirection,
  ReconciliationStatus,
  WalletRole,
  TransactionType,
  TransactionState,
  LedgerEntryType,
} from '@prisma/client';
import {
  reconcileStatements,
  BankStatementMutation,
  InternalTransactionRecord,
} from '../../algorithms/reconciliation/matcher';
import { parseBankStatementCsv, CsvParseResult } from './csv-parser';
import { AuditService } from '../audit/audit.service';

/**
 * Interface `ReconciliationSummaryDto`:
 * DTO ringkasan hasil rekonsiliasi bank untuk presentasi di antarmuka web/mobile.
 */
export interface ReconciliationSummaryDto {
  importBatchId?: string;
  totalBankMutations: number;
  matchedCount: number;
  ambiguousCount: number;
  unmatchedBankCount: number;
  unmatchedInternalCount: number;
  duplicateAlertsCount: number;
  precisionAutoMatchPercent: number;
  bankStatements: Array<{
    id: string;
    sourceRowNumber: number;
    transactionDate: string;
    amount: number;
    direction: MovementDirection;
    description: string;
    externalReference: string | null;
    matchStatus: ReconciliationStatus;
    ruleCode: string;
    transactionId: string | null;
    transaction?: {
      id: string;
      category: string;
      amount: number;
      type: TransactionType;
      state: TransactionState;
      creatorName?: string;
      reference?: string;
    } | null;
    candidateTransactions?: Array<{
      id: string;
      category: string;
      amount: number;
      type: TransactionType;
      createdAt: string;
      reference?: string;
    }>;
  }>;
  unmatchedInternalTransactions: Array<{
    id: string;
    category: string;
    amount: number;
    type: TransactionType;
    state: TransactionState;
    createdAt: string;
    notes?: string | null;
    reference: string;
  }>;
}

export class ReconciliationService {
  /**
   * ============================================================================
   * HELPER: assertManagerOrAdmin
   * ============================================================================
   * Fungsi Blok:
   * Memvalidasi bahwa pengguna yang melakukan operasi rekonsiliasi memiliki hak akses
   * tingkat pengurus (ADMIN atau PENGELOLA) pada dompet kas terkait.
   * 
   * Alur Kerja:
   * 1. Query tabel `WalletMember` berdasarkan composite key `walletId_userId`.
   * 2. Jika bukan anggota atau role bukan ADMIN/PENGELOLA, lemparkan AppError 403 FORBIDDEN.
   */
  private static async assertManagerOrAdmin(walletId: string, actorId: string): Promise<void> {
    const membership = await prisma.walletMember.findUnique({
      where: {
        walletId_userId: {
          walletId,
          userId: actorId,
        },
      },
    });

    if (!membership || (membership.role !== WalletRole.ADMIN && membership.role !== WalletRole.PENGELOLA)) {
      throw new AppError(
        'FORBIDDEN',
        'Hanya Admin atau Pengelola yang dapat mengunggah dan mengelola rekonsiliasi bank.',
        403
      );
    }
  }

  /**
   * ============================================================================
   * METHOD: importBankStatementCsv
   * ============================================================================
   * Fungsi Blok:
   * Mengimpor file CSV rekening koran bank, menyimpan mutasi secara persisten,
   * mencatat event audit impor, dan menjalankan algoritma pencocokan rekonsiliasi otomatis.
   * 
   * Alur Kerja:
   * 1. Verifikasi hak akses pengguna (ADMIN / PENGELOLA) via `assertManagerOrAdmin`.
   * 2. Validasi teks CSV tidak kosong.
   * 3. Urai string CSV menjadi baris terstruktur via `parseBankStatementCsv`.
   * 4. Hasilkan batch UUID unik (`importBatchId`).
   * 5. Simpan seluruh baris mutasi bank ke tabel `BankStatement` dalam transaksi database Prisma.
   * 6. Rekam event `BANK_STATEMENT_IMPORTED` ke rantai audit SHA-256 via `AuditService.recordAuditEvent`.
   * 7. Eksekusi algoritma rekonsiliasi deterministik via `executeReconciliation`.
   * 8. Ambil ringkasan statistik rekonsiliasi dan kembalikan ke pemanggil.
   */
  static async importBankStatementCsv(
    walletId: string,
    actorId: string,
    csvContent: string,
    filename: string = 'mutasi_rekening.csv'
  ): Promise<{
    parseResult: CsvParseResult;
    importBatchId: string;
    summary: ReconciliationSummaryDto;
  }> {
    await this.assertManagerOrAdmin(walletId, actorId);

    if (!csvContent || csvContent.trim().length === 0) {
      throw new AppError('VALIDATION_ERROR', 'Isi berkas CSV tidak boleh kosong.', 400);
    }

    // 1. Parsing isi CSV secara deterministik
    const parseResult = parseBankStatementCsv(csvContent);
    if (parseResult.totalRowsParsed === 0) {
      throw new AppError('VALIDATION_ERROR', 'Tidak ada baris mutasi valid yang dapat diproses dari CSV.', 400);
    }

    const importBatchId = crypto.randomUUID();

    // 2. Simpan rekaman mutasi rekening bank ke database dalam transaksi atomic
    const createdStatements = await prisma.$transaction(async (tx) => {
      const records = [];
      for (const row of parseResult.rows) {
        const stmt = await tx.bankStatement.create({
          data: {
            walletId,
            importBatchId,
            externalReference: row.externalReference,
            transactionDate: new Date(row.transactionDate),
            amount: row.amount,
            direction: row.direction === 'CREDIT' ? MovementDirection.CREDIT : MovementDirection.DEBIT,
            description: row.description,
            sourceRowNumber: row.sourceRowNumber,
          },
        });
        records.push(stmt);
      }
      return records;
    });

    // 3. Catat audit log event atas pengunggahan berkas CSV mutasi bank
    await AuditService.recordAuditEvent(prisma, {
      walletId,
      actorId,
      eventType: 'BANK_STATEMENT_IMPORTED',
      metadata: {
        importBatchId,
        filename,
        checksum: parseResult.checksum,
        detectedFormat: parseResult.detectedBankFormat,
        totalRowsParsed: parseResult.totalRowsParsed,
      },
    });

    // 4. Jalankan algoritma rekonsiliasi deterministik terhadap transaksi internal saat ini
    await this.executeReconciliation(walletId, importBatchId);

    // 5. Muat dan kembalikan ringkasan rekonsiliasi
    const summary = await this.getReconciliationSummary(walletId, importBatchId);

    return {
      parseResult,
      importBatchId,
      summary,
    };
  }

  /**
   * ============================================================================
   * METHOD: executeReconciliation
   * ============================================================================
   * Fungsi Blok:
   * Menjalankan algoritma murni pencocokan deterministik 3-pass antara mutasi bank
   * yang ada di database dengan transaksi kas internal yang sudah diajukan/disetujui.
   * 
   * Alur Kerja:
   * 1. Ambil mutasi bank untuk dompet dan batch impor tertentu.
   * 2. Ambil transaksi kas internal berstatus non-draft (SUBMITTED, PENDING_APPROVAL, APPROVED, COMPLETED).
   * 3. Transformasi entitas database ke bentuk data input algoritma murni (`matcherBankMutations` & `matcherInternalRecords`).
   * 4. Panggil fungsi murni `reconcileStatements` dengan aturan toleransi tanggal 3 hari.
   * 5. Ekstrak pasangan yang cocok (MATCHED), item ambigu (AMBIGUOUS), dan peringatan duplikasi (DUPLICATE_POTENTIAL).
   * 6. Buka transaksi database Prisma: Hapus rekaman match sebelumnya lalu simpan status rekonsiliasi terbaru ke tabel `ReconciliationMatch`.
   */
  static async executeReconciliation(walletId: string, importBatchId?: string): Promise<void> {
    // 1. Ambil rekaman mutasi rekening koran bank
    const bankStatements = await prisma.bankStatement.findMany({
      where: {
        walletId,
        ...(importBatchId ? { importBatchId } : {}),
      },
      orderBy: { transactionDate: 'asc' },
    });

    if (bankStatements.length === 0) return;

    // 2. Ambil transaksi kas internal non-draft
    const internalTransactions = await prisma.transaction.findMany({
      where: {
        walletId,
        state: { in: [TransactionState.SUBMITTED, TransactionState.PENDING_APPROVAL, TransactionState.APPROVED, TransactionState.COMPLETED] },
      },
      include: {
        paymentRecords: true,
      },
      orderBy: { createdAt: 'asc' },
    });

    // 3. Konversi ke struktur input algoritma rekonsiliasi murni
    const matcherBankMutations: BankStatementMutation[] = bankStatements.map((b) => ({
      id: b.id,
      externalReference: b.externalReference,
      amount: BigInt(Math.round(Number(b.amount))),
      direction: b.direction === MovementDirection.CREDIT ? 'CR' : 'DB',
      bookingDate: b.transactionDate.toISOString().split('T')[0],
      description: b.description,
    }));

    const matcherInternalRecords: InternalTransactionRecord[] = internalTransactions.map((t) => {
      // Ekstrak referensi dari pembayaran, catatan, atau ID ringkas
      const payRef = t.paymentRecords?.[0]?.paymentReference;
      const notesRefMatch = t.notes?.match(/\b(TRX-[A-Z0-9_\-]+|REF[:\s#]*[A-Z0-9_\-]+)\b/i);
      const reference = payRef || (notesRefMatch ? notesRefMatch[0] : `TX-${t.id.slice(0, 8)}`);

      return {
        id: t.id,
        reference,
        amount: BigInt(Math.round(Number(t.amount))),
        direction: t.type === TransactionType.INCOME ? 'CR' : 'DB',
        transactionDate: t.createdAt.toISOString().split('T')[0],
        description: t.notes || t.category,
      };
    });

    // 4. Eksekusi algoritma rekonsiliasi deterministik 3-pass murni
    const reconResult = reconcileStatements(matcherBankMutations, matcherInternalRecords, {
      rulesetVersion: 'RECON_RULESET_V1_DETERMINISTIC',
      dateToleranceDays: 3,
    });

    // 5. Susun peta indeks kecocokan
    const matchedBankMap = new Map<string, { txId: string; rule: string }>();
    for (const pair of reconResult.matchedPairs) {
      matchedBankMap.set(pair.bankMutationId, { txId: pair.internalTransactionId, rule: pair.ruleCode });
    }

    const ambiguousBankMap = new Map<string, string>();
    for (const amb of reconResult.ambiguousBankItems) {
      ambiguousBankMap.set(amb.bankMutationId, amb.reason);
    }

    const duplicateBankIds = new Set<string>();
    for (const dup of reconResult.duplicateAlerts) {
      if (dup.entityType === 'BANK_STATEMENT') {
        for (const cid of dup.conflictingIds) duplicateBankIds.add(cid);
      }
    }

    // 6. Simpan hasil rekonsiliasi ke tabel ReconciliationMatch via Prisma transaction
    await prisma.$transaction(async (tx) => {
      for (const stmt of bankStatements) {
        let matchStatus: ReconciliationStatus = ReconciliationStatus.UNMATCHED;
        let ruleCode = 'NO_CANDIDATE';
        let txId: string | null = null;
        let reviewReason: string | null = null;

        if (matchedBankMap.has(stmt.id)) {
          const matchInfo = matchedBankMap.get(stmt.id)!;
          matchStatus = ReconciliationStatus.MATCHED;
          ruleCode = matchInfo.rule;
          txId = matchInfo.txId;
        } else if (duplicateBankIds.has(stmt.id)) {
          matchStatus = ReconciliationStatus.DUPLICATE_POTENTIAL;
          ruleCode = 'DUPLICATE_REFERENCE';
          reviewReason = 'Ditemukan nomor referensi bank yang terduplikasi pada berkas mutasi.';
        } else if (ambiguousBankMap.has(stmt.id)) {
          matchStatus = ReconciliationStatus.AMBIGUOUS;
          ruleCode = 'AMBIGUOUS_CANDIDATES';
          reviewReason = ambiguousBankMap.get(stmt.id)!;
        }

        // Hapus rekaman pencocokan lama jika dilakukan re-run rekonsiliasi
        await tx.reconciliationMatch.deleteMany({
          where: { bankStatementId: stmt.id },
        });

        await tx.reconciliationMatch.create({
          data: {
            bankStatementId: stmt.id,
            transactionId: txId,
            matchStatus,
            ruleCode,
            reviewReason,
          },
        });
      }
    });
  }

  /**
   * ============================================================================
   * METHOD: getReconciliationSummary
   * ============================================================================
   * Fungsi Blok:
   * Mengumpulkan ringkasan data rekonsiliasi, daftar mutasi bank dengan kandidat transaksi,
   * dan daftar transaksi internal yang belum memiliki padanan di rekening koran.
   * 
   * Alur Kerja:
   * 1. Query mutasi bank beserta relasi `matches.transaction`.
   * 2. Query transaksi kas internal non-draft.
   * 3. Untuk mutasi bank yang belum klop / ambigu, cari transaksi kandidat (nominal dan tipe sama dalam toleransi 5 hari).
   * 4. Identifikasi transaksi kas internal yang belum dicocokkan dengan mutasi mana pun.
   * 5. Hitung metrik auto-match precision percentage.
   * 6. Kembalikan DTO `ReconciliationSummaryDto`.
   */
  static async getReconciliationSummary(
    walletId: string,
    importBatchId?: string
  ): Promise<ReconciliationSummaryDto> {
    // 1. Ambil rekaman mutasi bank beserta relasi pencocokannya
    const statements = await prisma.bankStatement.findMany({
      where: {
        walletId,
        ...(importBatchId ? { importBatchId } : {}),
      },
      include: {
        matches: {
          include: {
            transaction: {
              include: {
                creator: { select: { fullName: true } },
                paymentRecords: true,
              },
            },
          },
        },
      },
      orderBy: { transactionDate: 'desc' },
    });

    // 2. Ambil transaksi internal non-draft untuk pencarian kandidat dan daftar unmatched
    const internalTransactions = await prisma.transaction.findMany({
      where: {
        walletId,
        state: { in: [TransactionState.SUBMITTED, TransactionState.PENDING_APPROVAL, TransactionState.APPROVED, TransactionState.COMPLETED] },
      },
      include: {
        paymentRecords: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    const matchedTxIds = new Set<string>();
    let matchedCount = 0;
    let ambiguousCount = 0;
    let unmatchedBankCount = 0;
    let duplicateAlertsCount = 0;

    const formattedStatements = statements.map((b) => {
      const match = b.matches[0];
      const matchStatus = match?.matchStatus || ReconciliationStatus.UNMATCHED;
      const ruleCode = match?.ruleCode || 'NO_CANDIDATE';
      const tx = match?.transaction || null;

      if (matchStatus === ReconciliationStatus.MATCHED && tx) {
        matchedCount++;
        matchedTxIds.add(tx.id);
      } else if (matchStatus === ReconciliationStatus.AMBIGUOUS) {
        ambiguousCount++;
      } else if (matchStatus === ReconciliationStatus.DUPLICATE_POTENTIAL) {
        duplicateAlertsCount++;
      } else {
        unmatchedBankCount++;
      }

      // Jika ambigu atau belum cocok, cari daftar transaksi kandidat potensial
      let candidateTransactions: any[] | undefined;
      if (matchStatus === ReconciliationStatus.AMBIGUOUS || matchStatus === ReconciliationStatus.UNMATCHED) {
        const bAmt = Number(b.amount);
        const bDir = b.direction === MovementDirection.CREDIT ? TransactionType.INCOME : TransactionType.EXPENSE;
        const bTime = b.transactionDate.getTime();

        candidateTransactions = internalTransactions
          .filter((t) => {
            if (t.type !== bDir) return false;
            if (Math.abs(Number(t.amount) - bAmt) > 0.01) return false;
            const diffDays = Math.abs(t.createdAt.getTime() - bTime) / (1000 * 60 * 60 * 24);
            return diffDays <= 5;
          })
          .map((t) => ({
            id: t.id,
            category: t.category,
            amount: Number(t.amount),
            type: t.type,
            createdAt: t.createdAt.toISOString(),
            reference: t.paymentRecords?.[0]?.paymentReference || `TX-${t.id.slice(0, 8)}`,
          }));
      }

      return {
        id: b.id,
        sourceRowNumber: b.sourceRowNumber,
        transactionDate: b.transactionDate.toISOString().split('T')[0],
        amount: Number(b.amount),
        direction: b.direction,
        description: b.description,
        externalReference: b.externalReference,
        matchStatus,
        ruleCode,
        transactionId: match?.transactionId || null,
        transaction: tx
          ? {
              id: tx.id,
              category: tx.category,
              amount: Number(tx.amount),
              type: tx.type,
              state: tx.state,
              creatorName: tx.creator?.fullName,
              reference: tx.paymentRecords?.[0]?.paymentReference || `TX-${tx.id.slice(0, 8)}`,
            }
          : null,
        candidateTransactions,
      };
    });

    // Transaksi internal kas yang belum memiliki padanan di mutasi bank
    const unmatchedInternalTransactions = internalTransactions
      .filter((t) => !matchedTxIds.has(t.id))
      .map((t) => ({
        id: t.id,
        category: t.category,
        amount: Number(t.amount),
        type: t.type,
        state: t.state,
        createdAt: t.createdAt.toISOString(),
        notes: t.notes,
        reference: t.paymentRecords?.[0]?.paymentReference || `TX-${t.id.slice(0, 8)}`,
      }));

    const totalBankMutations = statements.length;
    const precisionAutoMatchPercent =
      totalBankMutations > 0 ? Math.round((matchedCount / totalBankMutations) * 100) : 0;

    return {
      importBatchId,
      totalBankMutations,
      matchedCount,
      ambiguousCount,
      unmatchedBankCount,
      unmatchedInternalCount: unmatchedInternalTransactions.length,
      duplicateAlertsCount,
      precisionAutoMatchPercent,
      bankStatements: formattedStatements,
      unmatchedInternalTransactions,
    };
  }

  /**
   * ============================================================================
   * METHOD: resolveManualMatch
   * ============================================================================
   * Fungsi Blok:
   * Menautkan secara manual satu mutasi bank dengan satu transaksi internal kas.
   * 
   * Persyaratan Regulasi & Audit Kas:
   * Sesuai spesifikasi, pencocokan manual wajib mencatat identitas aktor (`reviewedBy`),
   * timestamp review (`reviewedAt`), penjelasan rinci alasan (`reviewReason`),
   * serta mencatat peristiwa `RECONCILIATION_MANUAL_MATCHED` ke dalam hash chain audit log.
   * 
   * Alur Kerja:
   * 1. Validasi hak akses Admin/Pengelola.
   * 2. Validasi panjang teks alasan (minimal 5 karakter).
   * 3. Periksa keberadaan mutasi bank dan transaksi internal pada dompet kas ini.
   * 4. Buka transaksi database: Hapus match lama dan simpan entri baru berstatus `MATCHED` (rule: `MANUAL_MATCH`).
   * 5. Rekam event ke tamper-evident audit hash chain via `AuditService.recordAuditEvent`.
   * 6. Kembalikan konfirmasi keberhasilan.
   */
  static async resolveManualMatch(
    walletId: string,
    actorId: string,
    bankStatementId: string,
    transactionId: string,
    reason: string
  ): Promise<{ message: string; matchId: string }> {
    await this.assertManagerOrAdmin(walletId, actorId);

    if (!reason || reason.trim().length < 5) {
      throw new AppError(
        'VALIDATION_ERROR',
        'Alasan pencocokan manual wajib diisi secara rinci (minimal 5 karakter).',
        400
      );
    }

    // Pastikan rekaman mutasi bank ada dan milik dompet ini
    const stmt = await prisma.bankStatement.findFirst({
      where: { id: bankStatementId, walletId },
    });
    if (!stmt) {
      throw new AppError('NOT_FOUND', 'Mutasi rekening bank tidak ditemukan.', 404);
    }

    // Pastikan transaksi kas internal ada dan milik dompet ini
    const tx = await prisma.transaction.findFirst({
      where: { id: transactionId, walletId },
    });
    if (!tx) {
      throw new AppError('NOT_FOUND', 'Transaksi kas internal tidak ditemukan.', 404);
    }

    // Simpan entri pencocokan manual ke database
    const matchRecord = await prisma.$transaction(async (prismaTx) => {
      await prismaTx.reconciliationMatch.deleteMany({
        where: { bankStatementId },
      });

      return prismaTx.reconciliationMatch.create({
        data: {
          bankStatementId,
          transactionId,
          matchStatus: ReconciliationStatus.MATCHED,
          ruleCode: 'MANUAL_MATCH',
          reviewedBy: actorId,
          reviewReason: reason.trim(),
          reviewedAt: new Date(),
        },
      });
    });

    // Catat ke rantai audit SHA-256 tamper-evident
    await AuditService.recordAuditEvent(prisma, {
      walletId,
      actorId,
      eventType: 'RECONCILIATION_MANUAL_MATCHED',
      metadata: {
        matchId: matchRecord.id,
        bankStatementId,
        transactionId,
        reason: reason.trim(),
        bankAmount: Number(stmt.amount),
        txAmount: Number(tx.amount),
        matchedAt: new Date().toISOString(),
      },
    });

    return {
      message: 'Pencocokan manual berhasil disimpan dan tercatat di rantai audit.',
      matchId: matchRecord.id,
    };
  }

  /**
   * ============================================================================
   * METHOD: createTransactionFromBankMutation
   * ============================================================================
   * Fungsi Blok:
   * Mengonversi mutasi bank yang belum tercatat di sistem menjadi transaksi resmi kas internal KasBareng.
   * Transaksi langsung berstatus `COMPLETED` karena dana sudah nyata berpindah di bank.
   * 
   * Alur Kerja:
   * 1. Validasi hak akses Admin/Pengelola.
   * 2. Temukan mutasi bank target.
   * 3. Tentukan arah transaksi: CREDIT bank = INCOME kas; DEBIT bank = EXPENSE kas.
   * 4. Buka transaksi database atomic:
   *    a. Buat rekaman `Transaction` berstatus `COMPLETED`.
   *    b. Buat entri buku besar `LedgerEntry` (CREDIT atau DEBIT) untuk memutakhirkan saldo dompet kas.
   *    c. Buat rekaman `PaymentRecord` dengan status PAID dan referensi mutasi bank.
   *    d. Buat tautan `ReconciliationMatch` berstatus `MATCHED` (rule: `CREATED_FROM_BANK_MUTATION`).
   * 5. Rekam event `TRANSACTION_CREATED_FROM_BANK_MUTATION` ke audit hash chain.
   * 6. Kembalikan ID transaksi yang baru dibuat beserta pesan sukses.
   */
  static async createTransactionFromBankMutation(
    walletId: string,
    actorId: string,
    bankStatementId: string,
    category: string,
    notes?: string
  ): Promise<{ transactionId: string; message: string }> {
    await this.assertManagerOrAdmin(walletId, actorId);

    const stmt = await prisma.bankStatement.findFirst({
      where: { id: bankStatementId, walletId },
    });
    if (!stmt) {
      throw new AppError('NOT_FOUND', 'Mutasi rekening bank tidak ditemukan.', 404);
    }

    const type = stmt.direction === MovementDirection.CREDIT ? TransactionType.INCOME : TransactionType.EXPENSE;
    const amount = Number(stmt.amount);

    const newTx = await prisma.$transaction(async (tx) => {
      // 1. Buat transaksi berstatus COMPLETED (karena uang sudah nyata bergerak di rekening bank)
      const transaction = await tx.transaction.create({
        data: {
          walletId,
          creatorId: actorId,
          type,
          amount,
          category: category.trim(),
          notes: notes?.trim() || `Otomatis dari mutasi bank: ${stmt.description}`,
          state: TransactionState.COMPLETED,
          version: 1,
        },
      });

      // 2. Catat entri resmi ke buku besar (ledger)
      await tx.ledgerEntry.create({
        data: {
          walletId,
          transactionId: transaction.id,
          entryType: type === TransactionType.INCOME ? LedgerEntryType.CREDIT : LedgerEntryType.DEBIT,
          amount,
          currency: 'IDR',
        },
      });

      // 3. Catat rekaman pembayaran (PaymentRecord)
      await tx.paymentRecord.create({
        data: {
          transactionId: transaction.id,
          paymentStatus: 'PAID',
          paymentReference: stmt.externalReference || `BANK-${stmt.id.slice(0, 8)}`,
          verifiedBy: actorId,
          verifiedAt: new Date(),
        },
      });

      // 4. Tautkan rekonsiliasi mutasi bank sebagai MATCHED
      await tx.reconciliationMatch.deleteMany({
        where: { bankStatementId },
      });

      await tx.reconciliationMatch.create({
        data: {
          bankStatementId,
          transactionId: transaction.id,
          matchStatus: ReconciliationStatus.MATCHED,
          ruleCode: 'CREATED_FROM_BANK_MUTATION',
          reviewedBy: actorId,
          reviewReason: 'Dibuat otomatis dari mutasi rekening bank.',
          reviewedAt: new Date(),
        },
      });

      return transaction;
    });

    // 5. Rekam ke rantai audit SHA-256
    await AuditService.recordAuditEvent(prisma, {
      walletId,
      actorId,
      eventType: 'TRANSACTION_CREATED_FROM_BANK_MUTATION',
      metadata: {
        transactionId: newTx.id,
        bankStatementId,
        type,
        amount,
        category,
      },
    });

    return {
      transactionId: newTx.id,
      message: 'Transaksi kas berhasil dibuat dan langsung dicocokkan dengan mutasi bank.',
    };
  }
}

