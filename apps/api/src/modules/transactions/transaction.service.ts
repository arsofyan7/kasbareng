/**
 * ============================================================================
 * MODUL TRANSAKSI: SERVICE LOGIKA BISNIS TRANSAKSI KAS (transaction.service.ts)
 * ============================================================================
 * Service ini merupakan inti operasional keuangan KasBareng. Bertanggung jawab atas:
 * 1. Kalkulasi saldo buku besar (Ledger) dan saldo dicadangkan (Reservations) secara real-time.
 * 2. Pembuatan, pembaruan, dan pembatalan draf transaksi keuangan.
 * 3. Mesin State FSM (Finite State Machine) untuk memvalidasi alur transisi status transaksi.
 * 4. Multi-Approval M-of-N Quorum untuk persetujuan pengeluaran kas (EXPENSE) dengan Anti-Self Approval.
 * 5. Single-Manager Verification untuk verifikasi setoran mandiri warga (INCOME/Iuran).
 * 6. Eksekusi pencairan kas dan pembukuan resmi ke buku besar (Ledger DEBIT / CREDIT).
 * 7. Pencatatan audit trail SHA-256 tamper-evident pada setiap mutasi status keuangan.
 */

import {
  Prisma,
  TransactionType,
  TransactionState,
  LedgerEntryType,
  WalletRole,
  ApprovalDecision,
  PaymentStatus,
  UserStatus,
  DuesPaymentStatus,
} from '@prisma/client';
import { z } from 'zod';
import { prisma } from '../../common/prisma';
import { validateTransition } from '../../algorithms/fsm/transition-validator';
import { calculateBalance, LedgerEntry as AlgoLedgerEntry } from '../../algorithms/ledger/balance-calculator';
import { evaluateQuorum } from '../../algorithms/quorum/quorum-evaluator';
import { AuditService } from '../audit/audit.service';

/**
 * Skema Validasi Zod: Pembuatan Transaksi Baru (CreateTransactionSchema)
 */
export const CreateTransactionSchema = z.object({
  type: z.nativeEnum(TransactionType),
  amount: z.number().positive('Nominal transaksi harus lebih besar dari 0'),
  currency: z.string().optional().default('IDR'),
  category: z.string().min(2, 'Kategori minimal 2 karakter').max(50),
  notes: z.string().max(500).optional(),
  receiptAttachmentId: z.string().optional(),
  periodKeys: z.array(z.string()).optional(),
  targetUserId: z.string().optional(),
});

/**
 * Skema Validasi Zod: Pembaruan Draf Transaksi (UpdateTransactionSchema)
 */
export const UpdateTransactionSchema = z.object({
  expectedVersion: z.number().int().positive(),
  amount: z.number().positive().optional(),
  category: z.string().min(2).max(50).optional(),
  notes: z.string().max(500).optional(),
  receiptAttachmentId: z.string().optional(),
});

/**
 * Skema Validasi Zod: Pemberian Suara Persetujuan M-of-N (ProcessApprovalSchema)
 */
export const ProcessApprovalSchema = z.object({
  decision: z.nativeEnum(ApprovalDecision),
  expectedVersion: z.number().int().positive().optional(),
  comment: z.string().max(500).optional(),
});

/**
 * Skema Validasi Zod: Eksekusi Pencairan Pembayaran (ExecutePaymentSchema)
 */
export const ExecutePaymentSchema = z.object({
  paymentReference: z.string().max(100).optional(),
  evidenceAttachmentId: z.string().optional(),
  notes: z.string().max(500).optional(),
  expectedVersion: z.number().int().positive().optional(),
});

/**
 * Skema Validasi Zod: Verifikasi Setoran Pemasukan/Iuran (VerifyIncomeSchema)
 */
export const VerifyIncomeSchema = z.object({
  decision: z.enum(['APPROVE', 'REJECT']),
  notes: z.string().max(500).optional(),
});

export type CreateTransactionInput = z.input<typeof CreateTransactionSchema>;
export type UpdateTransactionInput = z.infer<typeof UpdateTransactionSchema>;
export type ProcessApprovalInput = z.infer<typeof ProcessApprovalSchema>;
export type VerifyIncomeInput = z.infer<typeof VerifyIncomeSchema>;
export type ExecutePaymentInput = z.infer<typeof ExecutePaymentSchema>;

export class TransactionService {
  /**
   * ============================================================================
   * METHOD: getWalletBalanceSummary
   * ============================================================================
   * Fungsi Blok:
   * Mengkalkulasi posisi saldo kas dompet secara matematis menggunakan algoritma murni
   * `calculateBalance` (Balance Calculator).
   * 
   * Alur Kerja:
   * 1. Query mata uang dompet dari tabel `Wallet`.
   * 2. Query seluruh entri buku besar resmi (`LedgerEntry`) terurut berdasarkan `effectiveAt: 'asc'`.
   * 3. Konversi entri buku besar menjadi format input algoritma murni (BigInt Rupiah).
   * 4. Query transaksi pengeluaran (EXPENSE) yang sedang aktif dicadangkan
   *    (berstatus PENDING_APPROVAL, APPROVED, atau PAYMENT_PENDING).
   * 5. Eksekusi fungsi murni `calculateBalance` untuk mendapatkan:
   *    - `postedBalance`: Saldo kas buku besar aktual (total credit - total debit).
   *    - `activeReservations`: Total dana pengeluaran yang sedang tertahan dalam proses persetujuan.
   *    - `availableBalance`: Saldo efektif yang masih bebas dibelanjakan (postedBalance - activeReservations).
   * 6. Kembalikan ringkasan angka ke format numerik standar.
   */
  static async getWalletBalanceSummary(walletId: string) {
    const wallet = await prisma.wallet.findUnique({
      where: { id: walletId },
      select: { currency: true },
    });

    if (!wallet) {
      throw { status: 404, code: 'WALLET_NOT_FOUND', message: 'Dompet tidak ditemukan.' };
    }

    const ledgerEntries = await prisma.ledgerEntry.findMany({
      where: { walletId },
      orderBy: { effectiveAt: 'asc' },
    });

    // Petakan rekaman LedgerEntry Prisma ke input algoritma murni
    const algoEntries: AlgoLedgerEntry[] = ledgerEntries
      .filter((e) => e.entryType === LedgerEntryType.CREDIT || e.entryType === LedgerEntryType.DEBIT)
      .map((e) => ({
        id: e.id,
        walletId: e.walletId,
        type: e.entryType === LedgerEntryType.CREDIT ? 'CREDIT' : 'DEBIT',
        amount: BigInt(Math.round(Number(e.amount))),
        currency: e.currency,
        status: 'POSTED',
        createdAt: e.createdAt,
      }));

    // Ambil cadangan dana (Reservations): transaksi EXPENSE yang sedang menggantung di PENDING_APPROVAL / PAYMENT_PENDING
    const activeExpenseReservations = await prisma.transaction.findMany({
      where: {
        walletId,
        type: TransactionType.EXPENSE,
        state: {
          in: [TransactionState.PENDING_APPROVAL, TransactionState.APPROVED, TransactionState.PAYMENT_PENDING],
        },
      },
      select: { id: true, amount: true, currency: true, createdAt: true },
    });

    const algoReservations = activeExpenseReservations.map((r) => ({
      id: r.id,
      walletId,
      amount: BigInt(Math.round(Number(r.amount))),
      currency: r.currency,
      status: 'ACTIVE' as const,
      createdAt: r.createdAt,
    }));

    const result = calculateBalance({
      walletId,
      currency: wallet.currency,
      entries: algoEntries,
      reservations: algoReservations,
    });

    return {
      walletId,
      currency: wallet.currency,
      postedBalance: Number(result.postedBalance),
      availableBalance: Number(result.availableBalance),
      activeReservations: Number(result.activeReservations),
      postedCreditTotal: Number(result.postedCreditTotal),
      postedDebitTotal: Number(result.postedDebitTotal),
      isValid: result.isValid,
    };
  }

  /**
   * ============================================================================
   * METHOD: createDraft
   * ============================================================================
   * Fungsi Blok:
   * Membuat draf transaksi baru di database secara atomic.
   * 
   * Alur Kerja:
   * 1. Validasi input menggunakan `CreateTransactionSchema.parse(input)`.
   * 2. Buka transaksi database Prisma (`prisma.$transaction`):
   *    a. Buat rekaman `Transaction` baru dengan `state: DRAFT` dan `version: 1`.
   *    b. Buat entri kronologis `TransactionEvent` bertipe `DRAFT_CREATED`.
   *    c. Jika transaksi bertipe `INCOME` dan mencantumkan periode iuran (`periodKeys`),
   *       buat/perbarui rekaman `DuesRecord` dengan status `PENDING`.
   *    d. Catat event ke tamper-evident audit hash chain via `AuditService.recordAuditEvent`.
   * 3. Kembalikan data transaksi yang baru dibuat.
   */
  static async createDraft(walletId: string, actorId: string, input: CreateTransactionInput) {
    const validated = CreateTransactionSchema.parse(input);

    return await prisma.$transaction(async (tx) => {
      const transaction = await tx.transaction.create({
        data: {
          walletId,
          creatorId: actorId,
          type: validated.type,
          amount: new Prisma.Decimal(validated.amount),
          currency: validated.currency,
          category: validated.category,
          notes: validated.notes,
          receiptAttachmentId: validated.receiptAttachmentId,
          state: TransactionState.DRAFT,
          version: 1,
        },
        include: {
          creator: {
            select: { id: true, fullName: true, email: true },
          },
        },
      });

      await tx.transactionEvent.create({
        data: {
          transactionId: transaction.id,
          actorId,
          eventType: 'DRAFT_CREATED',
          fromState: null,
          toState: TransactionState.DRAFT,
          transactionVersion: 1,
          metadata: {
            type: validated.type,
            amount: validated.amount,
            category: validated.category,
          },
        },
      });

      // Tautkan pencatatan periode iuran jika transaksi pemasukan mencakup iuran warga
      if (validated.type === TransactionType.INCOME && validated.periodKeys && validated.periodKeys.length > 0) {
        const duesUserId = validated.targetUserId || actorId;
        const amountPerPeriod = validated.amount / validated.periodKeys.length;
        for (const pKey of validated.periodKeys) {
          await tx.duesRecord.upsert({
            where: {
              walletId_userId_periodKey: {
                walletId,
                userId: duesUserId,
                periodKey: pKey,
              },
            },
            create: {
              walletId,
              userId: duesUserId,
              transactionId: transaction.id,
              periodKey: pKey,
              amount: new Prisma.Decimal(amountPerPeriod),
              status: DuesPaymentStatus.PENDING,
            },
            update: {
              transactionId: transaction.id,
              amount: new Prisma.Decimal(amountPerPeriod),
              status: DuesPaymentStatus.PENDING,
            },
          });
        }
      }

      await AuditService.recordAuditEvent(tx, {
        walletId,
        actorId,
        eventType: 'DRAFT_CREATED',
        transactionId: transaction.id,
        transactionVersion: 1,
        fromState: null,
        toState: TransactionState.DRAFT,
        metadata: {
          type: validated.type,
          amount: validated.amount,
          category: validated.category,
        },
      });

      return transaction;
    });
  }

  /**
   * ============================================================================
   * METHOD: getWalletTransactions
   * ============================================================================
   * Fungsi Blok:
   * Mengambil daftar transaksi terpaginasi untuk dompet tertentu dengan filter tipe dan status.
   * Mendukung pembatasan `creatorId` untuk mematuhi aturan visibilitas RBAC anggota WARGA.
   */
  static async getWalletTransactions(
    walletId: string,
    filter?: { type?: TransactionType; state?: TransactionState; page?: number; limit?: number; creatorId?: string }
  ) {
    const page = Math.max(1, filter?.page || 1);
    const limit = Math.min(100, Math.max(1, filter?.limit || 20));
    const skip = (page - 1) * limit;

    const where: Prisma.TransactionWhereInput = {
      walletId,
      ...(filter?.type && { type: filter.type }),
      ...(filter?.state && { state: filter.state }),
      ...(filter?.creatorId && { creatorId: filter.creatorId }),
    };

    const [transactions, total] = await Promise.all([
      prisma.transaction.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          creator: {
            select: { id: true, fullName: true, email: true },
          },
          _count: {
            select: { approvals: true, events: true },
          },
        },
      }),
      prisma.transaction.count({ where }),
    ]);

    return {
      transactions: transactions.map((t) => ({
        ...t,
        amount: Number(t.amount),
        approvalsCount: t._count.approvals,
        eventsCount: t._count.events,
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * ============================================================================
   * METHOD: getTransactionById
   * ============================================================================
   * Fungsi Blok:
   * Mengambil satu data transaksi lengkap beserta relasi pembuat, kebijakan persetujuan,
   * daftar suara approver, event log kronologis, dan bukti pembayaran.
   */
  static async getTransactionById(transactionId: string) {
    const transaction = await prisma.transaction.findUnique({
      where: { id: transactionId },
      include: {
        creator: {
          select: { id: true, fullName: true, email: true },
        },
        wallet: {
          select: {
            id: true,
            name: true,
            currency: true,
            approvalPolicies: {
              where: { status: 'ACTIVE' },
              take: 1,
              orderBy: { policyVersion: 'desc' },
            },
          },
        },
        approvals: {
          include: {
            approver: {
              select: { id: true, fullName: true, email: true },
            },
          },
          orderBy: { signedAt: 'asc' },
        },
        events: {
          include: {
            actor: {
              select: { id: true, fullName: true, email: true },
            },
          },
          orderBy: { createdAt: 'asc' },
        },
        paymentRecords: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!transaction) {
      throw { status: 404, code: 'TRANSACTION_NOT_FOUND', message: 'Transaksi tidak ditemukan.' };
    }

    return {
      ...transaction,
      amount: Number(transaction.amount),
    };
  }

  /**
   * ============================================================================
   * METHOD: updateDraft
   * ============================================================================
   * Fungsi Blok:
   * Mengubah konten draf transaksi dengan proteksi Optimistic Locking (versi transaksi).
   * 
   * Alur Kerja:
   * 1. Validasi skema input.
   * 2. Periksa apakah transaksi berstatus `DRAFT`. Jika bukan, tolak perubahan.
   * 3. Periksa versi: `transaction.version !== validated.expectedVersion` -> lempar 409 TRANSACTION_VERSION_CONFLICT.
   * 4. Perbarui data dan tingkatkan kolom `version` (+1).
   * 5. Catat `TransactionEvent` dan entri audit log SHA-256.
   */
  static async updateDraft(
    transactionId: string,
    actorId: string,
    input: UpdateTransactionInput
  ) {
    const validated = UpdateTransactionSchema.parse(input);

    return await prisma.$transaction(async (tx) => {
      const transaction = await tx.transaction.findUnique({
        where: { id: transactionId },
      });

      if (!transaction) {
        throw { status: 404, code: 'NOT_FOUND', message: 'Transaksi tidak ditemukan.' };
      }

      if (transaction.state !== TransactionState.DRAFT) {
        throw {
          status: 400,
          code: 'INVALID_STATE_TRANSITION',
          message: `Transaksi tidak dapat diedit karena berstatus ${transaction.state}. Hanya DRAF yang dapat diubah.`,
        };
      }

      if (transaction.version !== validated.expectedVersion) {
        throw {
          status: 409,
          code: 'TRANSACTION_VERSION_CONFLICT',
          message: `Data transaksi telah berubah (Versi server: ${transaction.version}, Versi klien: ${validated.expectedVersion}). Muat ulang halaman.`,
        };
      }

      const updated = await tx.transaction.update({
        where: { id: transactionId },
        data: {
          ...(validated.amount !== undefined && { amount: new Prisma.Decimal(validated.amount) }),
          ...(validated.category !== undefined && { category: validated.category }),
          ...(validated.notes !== undefined && { notes: validated.notes }),
          ...(validated.receiptAttachmentId !== undefined && { receiptAttachmentId: validated.receiptAttachmentId }),
          version: { increment: 1 },
        },
      });

      await tx.transactionEvent.create({
        data: {
          transactionId,
          actorId,
          eventType: 'DRAFT_UPDATED',
          fromState: TransactionState.DRAFT,
          toState: TransactionState.DRAFT,
          transactionVersion: updated.version,
          metadata: {
            updatedFields: {
              amount: validated.amount,
              category: validated.category,
              notes: validated.notes,
            },
          },
        },
      });

      await AuditService.recordAuditEvent(tx, {
        walletId: transaction.walletId,
        actorId,
        eventType: 'DRAFT_UPDATED',
        transactionId,
        transactionVersion: updated.version,
        fromState: TransactionState.DRAFT,
        toState: TransactionState.DRAFT,
        metadata: {
          updatedFields: {
            amount: validated.amount,
            category: validated.category,
            notes: validated.notes,
          },
        },
      });

      return {
        ...updated,
        amount: Number(updated.amount),
      };
    });
  }

  /**
   * ============================================================================
   * METHOD: submitTransaction
   * ============================================================================
   * Fungsi Blok:
   * Mengajukan transaksi draf ke alur persetujuan FSM.
   * 
   * Logika Khusus:
   * 1. Transaksi EXPENSE:
   *    - Berpindah dari DRAFT -> SUBMITTED -> PENDING_APPROVAL.
   *    - Memvalidasi kecukupan saldo efektif tersedia (Available Balance).
   *    - Mencadangkan saldo secara otomatis agar tidak overspend.
   * 2. Transaksi INCOME:
   *    - Jika pembuatnya WARGA (Member Self-Report): tetap berstatus `SUBMITTED`
   *      menunggu verifikasi oleh pengurus/admin kas. Saldo kas TIDAK bertambah sebelum verifikasi.
   *    - Jika pembuatnya ADMIN/PENGELOLA: langsung `COMPLETED` dan memposting entri Ledger CREDIT.
   */
  static async submitTransaction(
    transactionId: string,
    actorId: string,
    expectedVersion?: number
  ) {
    return await prisma.$transaction(async (tx) => {
      const transaction = await tx.transaction.findUnique({
        where: { id: transactionId },
        include: { wallet: true },
      });

      if (!transaction) {
        throw { status: 404, code: 'NOT_FOUND', message: 'Transaksi tidak ditemukan.' };
      }

      if (expectedVersion !== undefined && transaction.version !== expectedVersion) {
        throw {
          status: 409,
          code: 'TRANSACTION_VERSION_CONFLICT',
          message: 'Data transaksi telah berubah. Muat ulang rincian transaksi.',
        };
      }

      // Validasi FSM: DRAFT -> SUBMITTED
      const fsmResult = validateTransition({
        currentState: transaction.state as any,
        event: 'SUBMIT',
        context: {
          currentVersion: transaction.version,
          expectedVersion: transaction.version,
        },
      });

      if (!fsmResult.allowed) {
        throw {
          status: 400,
          code: fsmResult.errorCode || 'INVALID_STATE_TRANSITION',
          message: fsmResult.errorMessage || 'Transisi status tidak diizinkan oleh aturan sistem.',
        };
      }

      let finalState: TransactionState = TransactionState.SUBMITTED;

      // Alur untuk pengeluaran kas (EXPENSE)
      if (transaction.type === TransactionType.EXPENSE) {
        const approvalFsm = validateTransition({
          currentState: 'SUBMITTED',
          event: 'REQUEST_APPROVAL',
        });

        if (!approvalFsm.allowed) {
          throw {
            status: 400,
            code: approvalFsm.errorCode || 'INVALID_STATE_TRANSITION',
            message: approvalFsm.errorMessage,
          };
        }

        finalState = TransactionState.PENDING_APPROVAL;

        // Validasi kecukupan saldo kas tersedia (Available Balance)
        const balance = await this.getWalletBalanceSummary(transaction.walletId);
        if (balance.availableBalance < Number(transaction.amount)) {
          throw {
            status: 400,
            code: 'INSUFFICIENT_AVAILABLE_BALANCE',
            message: `Saldo kas tidak mencukupi untuk mengajukan pengeluaran ini. (Saldo tersedia: Rp ${balance.availableBalance.toLocaleString('id-ID')}, Dibutuhkan: Rp ${Number(transaction.amount).toLocaleString('id-ID')}).`,
          };
        }
      } else {
        // Alur untuk pemasukan kas (INCOME)
        const creatorMember = await tx.walletMember.findUnique({
          where: {
            walletId_userId: {
              walletId: transaction.walletId,
              userId: transaction.creatorId,
            },
          },
        });

        const isWargaCreator = creatorMember?.role === WalletRole.WARGA;

        if (isWargaCreator) {
          // Laporan mandiri warga: Tetap di status SUBMITTED (menunggu verifikasi)
          // Keamanan Finansial: Saldo kas TIDAK bertambah sebelum diverifikasi pengurus!
          finalState = TransactionState.SUBMITTED;
        } else {
          // Dicatat langsung oleh ADMIN atau PENGELOLA:
          // Langsung selesai (COMPLETED) dan posting ke buku besar kredit
          finalState = TransactionState.COMPLETED;

          await tx.ledgerEntry.create({
            data: {
              walletId: transaction.walletId,
              transactionId: transaction.id,
              entryType: LedgerEntryType.CREDIT,
              amount: transaction.amount,
              currency: transaction.currency,
            },
          });

          // Tandai rekaman iuran sebagai PAID
          await tx.duesRecord.updateMany({
            where: { transactionId: transaction.id },
            data: { status: DuesPaymentStatus.PAID },
          });
        }
      }

      const updated = await tx.transaction.update({
        where: { id: transactionId },
        data: {
          state: finalState,
          version: { increment: 1 },
        },
      });

      const eventType =
        transaction.type === TransactionType.EXPENSE
          ? 'APPROVAL_REQUESTED'
          : finalState === TransactionState.SUBMITTED
          ? 'INCOME_REPORTED'
          : 'INCOME_POSTED';

      await tx.transactionEvent.create({
        data: {
          transactionId,
          actorId,
          eventType,
          fromState: transaction.state,
          toState: finalState,
          transactionVersion: updated.version,
          metadata: {
            submittedAt: new Date().toISOString(),
            type: transaction.type,
            amount: Number(transaction.amount),
          },
        },
      });

      await AuditService.recordAuditEvent(tx, {
        walletId: transaction.walletId,
        actorId,
        eventType,
        transactionId,
        transactionVersion: updated.version,
        fromState: transaction.state,
        toState: finalState,
        metadata: {
          submittedAt: new Date().toISOString(),
          type: transaction.type,
          amount: Number(transaction.amount),
        },
      });

      return {
        ...updated,
        amount: Number(updated.amount),
      };
    });
  }

  /**
   * ============================================================================
   * METHOD: cancelTransaction
   * ============================================================================
   * Fungsi Blok:
   * Membatalkan transaksi dengan validasi transisi FSM (CANCEL), menghapus rekaman iuran gantung,
   * dan mencatat event audit pembatalan.
   */
  static async cancelTransaction(transactionId: string, actorId: string, reason?: string) {
    return await prisma.$transaction(async (tx) => {
      const transaction = await tx.transaction.findUnique({
        where: { id: transactionId },
      });

      if (!transaction) {
        throw { status: 404, code: 'NOT_FOUND', message: 'Transaksi tidak ditemukan.' };
      }

      const fsmResult = validateTransition({
        currentState: transaction.state as any,
        event: 'CANCEL',
      });

      if (!fsmResult.allowed) {
        throw {
          status: 400,
          code: fsmResult.errorCode || 'INVALID_STATE_TRANSITION',
          message: fsmResult.errorMessage || 'Transaksi dalam status ini tidak dapat dibatalkan.',
        };
      }

      const updated = await tx.transaction.update({
        where: { id: transactionId },
        data: {
          state: TransactionState.CANCELLED,
          version: { increment: 1 },
        },
      });

      // Hapus rekaman tagihan iuran yang terafiliasi dengan transaksi batal ini
      await tx.duesRecord.deleteMany({
        where: { transactionId },
      });

      await tx.transactionEvent.create({
        data: {
          transactionId,
          actorId,
          eventType: 'TRANSACTION_CANCELLED',
          fromState: transaction.state,
          toState: TransactionState.CANCELLED,
          transactionVersion: updated.version,
          metadata: { reason: reason || 'Dibatalkan oleh pengguna.' },
        },
      });

      await AuditService.recordAuditEvent(tx, {
        walletId: transaction.walletId,
        actorId,
        eventType: 'TRANSACTION_CANCELLED',
        transactionId,
        transactionVersion: updated.version,
        fromState: transaction.state,
        toState: TransactionState.CANCELLED,
        metadata: { reason: reason || 'Dibatalkan oleh pengguna.' },
      });

      return {
        ...updated,
        amount: Number(updated.amount),
      };
    });
  }

  /**
   * ============================================================================
   * METHOD: processApproval
   * ============================================================================
   * Fungsi Blok:
   * Memproses pemberian suara (APPROVE / REJECT) dari pengurus dompet untuk pengeluaran kas (EXPENSE).
   * Menerapkan aturan integritas ketat:
   * 1. State harus `PENDING_APPROVAL`.
   * 2. Versi optimis locking harus cocok.
   * 3. Pengurus berhak suara: status ACTIVE, role ADMIN / PENGELOLA.
   * 4. Anti-Self Approval Guard: Pembuat pengeluaran dilarang menyetujui pengeluarannya sendiri.
   * 5. Anti-Deduplication: Satu pengurus hanya boleh bersuara satu kali untuk versi transaksi yang sama.
   * 6. Algoritma Quorum Evaluator mengevaluasi ambang batas M dari N pengurus.
   *    - Jika ada REJECT: status transaksi langsung `REJECTED`.
   *    - Jika APPROVE mencapai kuorum: status transaksi berubah menjadi `APPROVED`.
   */
  static async processApproval(
    transactionId: string,
    actorId: string,
    input: ProcessApprovalInput
  ) {
    const validated = ProcessApprovalSchema.parse(input);

    return await prisma.$transaction(async (tx) => {
      // 1. Ambil transaksi beserta data dompet
      const transaction = await tx.transaction.findUnique({
        where: { id: transactionId },
        include: {
          wallet: true,
          approvals: {
            include: {
              approver: {
                select: { id: true, fullName: true, email: true },
              },
            },
            orderBy: { signedAt: 'asc' },
          },
        },
      });

      if (!transaction) {
        throw { status: 404, code: 'NOT_FOUND', message: 'Transaksi tidak ditemukan.' };
      }

      // 2. Validasi status transaksi: wajib PENDING_APPROVAL
      if (transaction.state !== TransactionState.PENDING_APPROVAL) {
        throw {
          status: 400,
          code: 'INVALID_STATE_TRANSITION',
          message: `Transaksi tidak dalam status menunggu persetujuan (Status saat ini: ${transaction.state}).`,
        };
      }

      // 3. Pengecekan Optimistic Locking
      if (validated.expectedVersion !== undefined && transaction.version !== validated.expectedVersion) {
        throw {
          status: 409,
          code: 'TRANSACTION_VERSION_CONFLICT',
          message: `Data transaksi telah berubah (Versi server: ${transaction.version}, Versi klien: ${validated.expectedVersion}). Muat ulang rincian transaksi.`,
        };
      }

      // 4. Verifikasi keanggotaan dan peran pemberi persetujuan
      const member = await tx.walletMember.findUnique({
        where: {
          walletId_userId: {
            walletId: transaction.walletId,
            userId: actorId,
          },
        },
      });

      if (!member || member.status !== UserStatus.ACTIVE) {
        throw {
          status: 403,
          code: 'FORBIDDEN',
          message: 'Anda bukan anggota aktif dari dompet kas ini.',
        };
      }

      if (member.role !== WalletRole.ADMIN && member.role !== WalletRole.PENGELOLA) {
        throw {
          status: 403,
          code: 'NOT_AN_ELIGIBLE_APPROVER',
          message: 'Hanya Pengelola dan Admin yang berhak memberikan persetujuan pengeluaran.',
        };
      }

      // 5. Anti-Self Approval Guard: Pembuat dilarang menyetujui pengeluarannya sendiri
      if (transaction.creatorId === actorId) {
        throw {
          status: 403,
          code: 'SELF_APPROVAL_NOT_ALLOWED',
          message: 'Pembuat pengeluaran tidak diperbolehkan menyetujui pengeluarannya sendiri (Aturan Anti-Self Approval). Diperlukan persetujuan dari pengelola/admin lain.',
        };
      }

      // 6. Cek duplikasi suara pada versi transaksi yang sama
      const existingApproval = await tx.transactionApproval.findUnique({
        where: {
          transactionId_approverId_transactionVersion: {
            transactionId,
            approverId: actorId,
            transactionVersion: transaction.version,
          },
        },
      });

      if (existingApproval) {
        throw {
          status: 409,
          code: 'DUPLICATE_APPROVAL',
          message: 'Anda sudah memberikan keputusan persetujuan untuk versi transaksi ini.',
        };
      }

      // 7. Ambil kebijakan persetujuan (ApprovalPolicy) aktif
      const activePolicy = await tx.approvalPolicy.findFirst({
        where: { walletId: transaction.walletId, status: 'ACTIVE' },
        orderBy: { policyVersion: 'desc' },
      });

      const policyVersion = activePolicy?.policyVersion || 1;
      const requiredApprovals = activePolicy?.requiredApprovals || 2;

      // 8. Simpan keputusan persetujuan ke tabel TransactionApproval
      const approvalRecord = await tx.transactionApproval.create({
        data: {
          transactionId,
          approverId: actorId,
          decision: validated.decision,
          transactionVersion: transaction.version,
          policyVersion,
        },
        include: {
          approver: {
            select: { id: true, fullName: true, email: true },
          },
        },
      });

      // 9. Penanganan Keputusan REJECT
      if (validated.decision === ApprovalDecision.REJECT) {
        const fsmResult = validateTransition({
          currentState: transaction.state as any,
          event: 'REJECT',
        });

        if (!fsmResult.allowed) {
          throw {
            status: 400,
            code: fsmResult.errorCode || 'INVALID_STATE_TRANSITION',
            message: fsmResult.errorMessage,
          };
        }

        const updatedTx = await tx.transaction.update({
          where: { id: transactionId },
          data: {
            state: TransactionState.REJECTED,
            version: { increment: 1 },
          },
        });

        await tx.transactionEvent.create({
          data: {
            transactionId,
            actorId,
            eventType: 'TRANSACTION_REJECTED',
            fromState: transaction.state,
            toState: TransactionState.REJECTED,
            transactionVersion: updatedTx.version,
            metadata: {
              rejectionComment: validated.comment || 'Pengeluaran ditolak oleh pengelola/admin.',
              rejectedBy: actorId,
            },
          },
        });

        await AuditService.recordAuditEvent(tx, {
          walletId: transaction.walletId,
          actorId,
          eventType: 'TRANSACTION_REJECTED',
          transactionId,
          transactionVersion: updatedTx.version,
          fromState: transaction.state,
          toState: TransactionState.REJECTED,
          metadata: {
            rejectionComment: validated.comment || 'Pengeluaran ditolak oleh pengelola/admin.',
            rejectedBy: actorId,
          },
        });

        return {
          transaction: {
            ...updatedTx,
            amount: Number(updatedTx.amount),
          },
          approval: approvalRecord,
          quorumResult: {
            approved: false,
            requiredApprovals,
            validApprovalCount: 0,
            hasRejectionDecision: true,
          },
        };
      }

      // 10. Penanganan Keputusan APPROVE: Evaluasi Kuorum M-of-N
      const allApprovals = await tx.transactionApproval.findMany({
        where: {
          transactionId,
          transactionVersion: transaction.version,
        },
        orderBy: { signedAt: 'asc' },
      });

      const eligibleMembers = await tx.walletMember.findMany({
        where: {
          walletId: transaction.walletId,
          status: UserStatus.ACTIVE,
          role: { in: [WalletRole.ADMIN, WalletRole.PENGELOLA] },
        },
        select: { userId: true },
      });

      const quorumResult = evaluateQuorum({
        creatorId: transaction.creatorId,
        transactionVersion: transaction.version,
        policyVersion,
        requiredApprovals,
        eligibleApproverIds: eligibleMembers.map((m) => m.userId),
        approvals: allApprovals.map((a) => ({
          approverId: a.approverId,
          decision: a.decision as 'APPROVE' | 'REJECT',
          transactionVersion: a.transactionVersion,
          policyVersion: a.policyVersion,
          createdAt: a.signedAt,
          comment: validated.comment,
        })),
        options: { allowSelfApproval: false },
      });

      let updatedTx = transaction;

      if (quorumResult.approved) {
        const fsmResult = validateTransition({
          currentState: transaction.state as any,
          event: 'APPROVE_WITH_QUORUM',
          context: {
            quorumSatisfied: true,
            currentVersion: transaction.version,
            expectedVersion: transaction.version,
          },
        });

        if (!fsmResult.allowed) {
          throw {
            status: 400,
            code: fsmResult.errorCode || 'INVALID_STATE_TRANSITION',
            message: fsmResult.errorMessage,
          };
        }

        const nextTx = await tx.transaction.update({
          where: { id: transactionId },
          data: {
            state: TransactionState.APPROVED,
            version: { increment: 1 },
          },
        });

        await tx.transactionEvent.create({
          data: {
            transactionId,
            actorId,
            eventType: 'QUORUM_APPROVED',
            fromState: transaction.state,
            toState: TransactionState.APPROVED,
            transactionVersion: nextTx.version,
            metadata: {
              validApprovalCount: quorumResult.validApprovalCount,
              requiredApprovals: quorumResult.requiredApprovals,
              validApproverIds: quorumResult.validApproverIds,
              comment: validated.comment,
            },
          },
        });

        await AuditService.recordAuditEvent(tx, {
          walletId: transaction.walletId,
          actorId,
          eventType: 'QUORUM_APPROVED',
          transactionId,
          transactionVersion: nextTx.version,
          fromState: transaction.state,
          toState: TransactionState.APPROVED,
          metadata: {
            validApprovalCount: quorumResult.validApprovalCount,
            requiredApprovals: quorumResult.requiredApprovals,
            validApproverIds: quorumResult.validApproverIds,
            comment: validated.comment,
          },
        });

        updatedTx = nextTx as any;
      } else {
        await tx.transactionEvent.create({
          data: {
            transactionId,
            actorId,
            eventType: 'APPROVAL_RECORDED',
            fromState: transaction.state,
            toState: transaction.state,
            transactionVersion: transaction.version,
            metadata: {
              validApprovalCount: quorumResult.validApprovalCount,
              requiredApprovals: quorumResult.requiredApprovals,
              validApproverIds: quorumResult.validApproverIds,
              comment: validated.comment,
            },
          },
        });

        await AuditService.recordAuditEvent(tx, {
          walletId: transaction.walletId,
          actorId,
          eventType: 'APPROVAL_RECORDED',
          transactionId,
          transactionVersion: transaction.version,
          fromState: transaction.state,
          toState: transaction.state,
          metadata: {
            validApprovalCount: quorumResult.validApprovalCount,
            requiredApprovals: quorumResult.requiredApprovals,
            validApproverIds: quorumResult.validApproverIds,
            comment: validated.comment,
          },
        });
      }

      return {
        transaction: {
          ...updatedTx,
          amount: Number(updatedTx.amount),
        },
        approval: approvalRecord,
        quorumResult,
      };
    });
  }

  /**
   * ============================================================================
   * METHOD: executePayment
   * ============================================================================
   * Fungsi Blok:
   * Mengeksekusi pembayaran pencairan kas untuk pengeluaran yang telah disetujui kuorum (`APPROVED`).
   * 
   * Alur Kerja:
   * 1. Validasi state transaksi (harus `APPROVED` atau `PAYMENT_PENDING`).
   * 2. Validasi peran pemohon (harus ADMIN atau PENGELOLA).
   * 3. Validasi transisi FSM: INITIATE_PAYMENT dan CONFIRM_PAYMENT.
   * 4. Buat entri resmi `LedgerEntry` bertipe `DEBIT` di buku besar dompet kas.
   * 5. Buat rekaman bukti transfer `PaymentRecord`.
   * 6. Pindahkan status transaksi ke `COMPLETED`.
   * 7. Catat audit event `PAYMENT_COMPLETED` ke rantai hash SHA-256.
   */
  static async executePayment(
    transactionId: string,
    actorId: string,
    input: ExecutePaymentInput = {}
  ) {
    const validated = ExecutePaymentSchema.parse(input);

    return await prisma.$transaction(async (tx) => {
      const transaction = await tx.transaction.findUnique({
        where: { id: transactionId },
        include: { wallet: true },
      });

      if (!transaction) {
        throw { status: 404, code: 'NOT_FOUND', message: 'Transaksi tidak ditemukan.' };
      }

      if (
        transaction.state !== TransactionState.APPROVED &&
        transaction.state !== TransactionState.PAYMENT_PENDING
      ) {
        throw {
          status: 400,
          code: 'INVALID_STATE_TRANSITION',
          message: `Transaksi belum disetujui atau tidak dapat dibayar (Status saat ini: ${transaction.state}).`,
        };
      }

      if (validated.expectedVersion !== undefined && transaction.version !== validated.expectedVersion) {
        throw {
          status: 409,
          code: 'TRANSACTION_VERSION_CONFLICT',
          message: 'Data transaksi telah berubah. Muat ulang rincian transaksi.',
        };
      }

      const member = await tx.walletMember.findUnique({
        where: {
          walletId_userId: {
            walletId: transaction.walletId,
            userId: actorId,
          },
        },
      });

      if (!member || member.status !== UserStatus.ACTIVE) {
        throw {
          status: 403,
          code: 'FORBIDDEN',
          message: 'Anda bukan anggota aktif dari dompet kas ini.',
        };
      }

      if (member.role !== WalletRole.ADMIN && member.role !== WalletRole.PENGELOLA) {
        throw {
          status: 403,
          code: 'FORBIDDEN',
          message: 'Hanya Pengelola dan Admin yang berhak mengeksekusi pembayaran kas.',
        };
      }

      if (transaction.state === TransactionState.APPROVED) {
        const initFsm = validateTransition({
          currentState: 'APPROVED',
          event: 'INITIATE_PAYMENT',
        });

        if (!initFsm.allowed) {
          throw {
            status: 400,
            code: initFsm.errorCode || 'INVALID_STATE_TRANSITION',
            message: initFsm.errorMessage,
          };
        }
      }

      const completeFsm = validateTransition({
        currentState: 'PAYMENT_PENDING',
        event: 'CONFIRM_PAYMENT',
        context: {
          paymentVerified: true,
          ledgerPosted: true,
        },
      });

      if (!completeFsm.allowed) {
        throw {
          status: 400,
          code: completeFsm.errorCode || 'INVALID_STATE_TRANSITION',
          message: completeFsm.errorMessage,
        };
      }

      const ledgerEntry = await tx.ledgerEntry.create({
        data: {
          walletId: transaction.walletId,
          transactionId: transaction.id,
          entryType: LedgerEntryType.DEBIT,
          amount: transaction.amount,
          currency: transaction.currency,
        },
      });

      const paymentRecord = await tx.paymentRecord.create({
        data: {
          transactionId: transaction.id,
          paymentStatus: PaymentStatus.VERIFIED,
          paymentReference: validated.paymentReference || `PAY-${Date.now().toString(36).toUpperCase()}`,
          evidenceAttachmentId: validated.evidenceAttachmentId,
          verifiedBy: actorId,
          verifiedAt: new Date(),
        },
      });

      const updatedTx = await tx.transaction.update({
        where: { id: transactionId },
        data: {
          state: TransactionState.COMPLETED,
          version: { increment: 1 },
        },
      });

      await tx.transactionEvent.create({
        data: {
          transactionId,
          actorId,
          eventType: 'PAYMENT_COMPLETED',
          fromState: transaction.state,
          toState: TransactionState.COMPLETED,
          transactionVersion: updatedTx.version,
          metadata: {
            paymentReference: paymentRecord.paymentReference,
            ledgerEntryId: ledgerEntry.id,
            amount: Number(transaction.amount),
            notes: validated.notes,
          },
        },
      });

      await AuditService.recordAuditEvent(tx, {
        walletId: transaction.walletId,
        actorId,
        eventType: 'PAYMENT_COMPLETED',
        transactionId,
        transactionVersion: updatedTx.version,
        fromState: transaction.state,
        toState: TransactionState.COMPLETED,
        metadata: {
          paymentReference: paymentRecord.paymentReference,
          ledgerEntryId: ledgerEntry.id,
          amount: Number(transaction.amount),
          notes: validated.notes,
        },
      });

      return {
        transaction: {
          ...updatedTx,
          amount: Number(updatedTx.amount),
        },
        paymentRecord,
        ledgerEntry,
      };
    });
  }

  /**
   * ============================================================================
   * METHOD: verifyIncomeReport
   * ============================================================================
   * Fungsi Blok:
   * Memproses verifikasi laporan setoran pemasukan/iuran mandiri dari warga.
   * Menggunakan pola Single-Manager Verification (cukup satu orang ADMIN atau PENGELOLA).
   * 
   * Alur Kerja:
   * 1. Validasi tipe transaksi (wajib `INCOME`) dan status transaksi (wajib `SUBMITTED`).
   * 2. Validasi peran pemverifikasi (harus ADMIN atau PENGELOLA).
   * 3. Jika disetujui (`APPROVE`):
   *    a. Buat entri buku besar resmi `LedgerEntry` bertipe `CREDIT`.
   *    b. Perbarui status transaksi menjadi `COMPLETED`.
   *    c. Tandai rekaman tagihan iuran (`DuesRecord`) menjadi `PAID`.
   *    d. Rekam event `INCOME_VERIFIED` ke rantai audit SHA-256.
   * 4. Jika ditolak (`REJECT`):
   *    a. Perbarui status transaksi menjadi `REJECTED`.
   *    b. Hapus rekaman tagihan iuran terkait agar periode iuran terbuka kembali untuk dibayar warga.
   *    c. Rekam event `INCOME_REJECTED` ke rantai audit SHA-256.
   */
  static async verifyIncomeReport(
    transactionId: string,
    actorId: string,
    input: VerifyIncomeInput
  ) {
    const validated = VerifyIncomeSchema.parse(input);

    return await prisma.$transaction(async (tx) => {
      const transaction = await tx.transaction.findUnique({
        where: { id: transactionId },
        include: {
          wallet: true,
          creator: { select: { id: true, fullName: true, email: true } },
        },
      });

      if (!transaction) {
        throw { status: 404, code: 'NOT_FOUND', message: 'Transaksi tidak ditemukan.' };
      }

      if (transaction.type !== TransactionType.INCOME) {
        throw {
          status: 400,
          code: 'INVALID_TRANSACTION_TYPE',
          message: 'Hanya laporan pemasukan/iuran kas yang dapat diverifikasi melalui alur ini.',
        };
      }

      if (transaction.state !== TransactionState.SUBMITTED) {
        throw {
          status: 400,
          code: 'INVALID_STATE',
          message: `Transaksi berstatus ${transaction.state}. Hanya laporan yang menunggu verifikasi (SUBMITTED) yang dapat diproses.`,
        };
      }

      // Pastikan aktor adalah ADMIN atau PENGELOLA
      const actorMember = await tx.walletMember.findUnique({
        where: {
          walletId_userId: {
            walletId: transaction.walletId,
            userId: actorId,
          },
        },
      });

      if (
        !actorMember ||
        (actorMember.role !== WalletRole.ADMIN && actorMember.role !== WalletRole.PENGELOLA)
      ) {
        throw {
          status: 403,
          code: 'FORBIDDEN',
          message: 'Hanya Admin atau Pengelola yang berhak memverifikasi laporan pemasukan kas warga.',
        };
      }

      if (validated.decision === 'APPROVE') {
        // 1. Post entri kredit ke buku besar (saldo kas bertambah seketika)
        const ledgerEntry = await tx.ledgerEntry.create({
          data: {
            walletId: transaction.walletId,
            transactionId: transaction.id,
            entryType: LedgerEntryType.CREDIT,
            amount: transaction.amount,
            currency: transaction.currency,
          },
        });

        // 2. Transisi status menjadi COMPLETED
        const updated = await tx.transaction.update({
          where: { id: transactionId },
          data: {
            state: TransactionState.COMPLETED,
            version: { increment: 1 },
          },
          include: {
            creator: { select: { id: true, fullName: true, email: true } },
          },
        });

        // 3. Catat riwayat event
        await tx.transactionEvent.create({
          data: {
            transactionId,
            actorId,
            eventType: 'INCOME_VERIFIED',
            fromState: TransactionState.SUBMITTED,
            toState: TransactionState.COMPLETED,
            transactionVersion: updated.version,
            metadata: {
              verifiedAt: new Date().toISOString(),
              verifiedBy: actorId,
              notes: validated.notes,
              ledgerEntryId: ledgerEntry.id,
              amount: Number(transaction.amount),
            },
          },
        });

        // 4. Perbarui status iuran warga menjadi PAID
        await tx.duesRecord.updateMany({
          where: { transactionId },
          data: { status: DuesPaymentStatus.PAID },
        });

        // 5. Catat ke rantai audit SHA-256
        await AuditService.recordAuditEvent(tx, {
          walletId: transaction.walletId,
          actorId,
          eventType: 'INCOME_VERIFIED',
          transactionId,
          transactionVersion: updated.version,
          fromState: TransactionState.SUBMITTED,
          toState: TransactionState.COMPLETED,
          metadata: {
            verifiedAt: new Date().toISOString(),
            verifiedBy: actorId,
            notes: validated.notes,
            amount: Number(transaction.amount),
            creatorId: transaction.creatorId,
          },
        });

        return {
          ...updated,
          amount: Number(updated.amount),
          ledgerEntry,
        };
      } else {
        // Keputusan REJECT: Tolak laporan pemasukan
        const updated = await tx.transaction.update({
          where: { id: transactionId },
          data: {
            state: TransactionState.REJECTED,
            version: { increment: 1 },
          },
          include: {
            creator: { select: { id: true, fullName: true, email: true } },
          },
        });

        // Hapus rekaman iuran agar periode kembali menjadi belum bayar
        await tx.duesRecord.deleteMany({
          where: { transactionId },
        });

        // Catat riwayat penolakan
        await tx.transactionEvent.create({
          data: {
            transactionId,
            actorId,
            eventType: 'INCOME_REJECTED',
            fromState: TransactionState.SUBMITTED,
            toState: TransactionState.REJECTED,
            transactionVersion: updated.version,
            metadata: {
              rejectedAt: new Date().toISOString(),
              rejectedBy: actorId,
              reason: validated.notes || 'Laporan iuran ditolak oleh pengurus kas.',
            },
          },
        });

        // Catat ke rantai audit SHA-256
        await AuditService.recordAuditEvent(tx, {
          walletId: transaction.walletId,
          actorId,
          eventType: 'INCOME_REJECTED',
          transactionId,
          transactionVersion: updated.version,
          fromState: TransactionState.SUBMITTED,
          toState: TransactionState.REJECTED,
          metadata: {
            rejectedAt: new Date().toISOString(),
            rejectedBy: actorId,
            reason: validated.notes || 'Laporan iuran ditolak oleh pengurus kas.',
            amount: Number(transaction.amount),
            creatorId: transaction.creatorId,
          },
        });

        return {
          ...updated,
          amount: Number(updated.amount),
        };
      }
    });
  }
}
