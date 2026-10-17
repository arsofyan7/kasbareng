import { Prisma, TransactionType, TransactionState, LedgerEntryType, WalletRole } from '@prisma/client';
import { z } from 'zod';
import { prisma } from '../../common/prisma';
import { validateTransition } from '../../algorithms/fsm/transition-validator';
import { calculateBalance, LedgerEntry as AlgoLedgerEntry } from '../../algorithms/ledger/balance-calculator';

export const CreateTransactionSchema = z.object({
  type: z.nativeEnum(TransactionType),
  amount: z.number().positive('Nominal transaksi harus lebih besar dari 0'),
  currency: z.string().optional().default('IDR'),
  category: z.string().min(2, 'Kategori minimal 2 karakter').max(50),
  notes: z.string().max(500).optional(),
  receiptAttachmentId: z.string().optional(),
});

export const UpdateTransactionSchema = z.object({
  expectedVersion: z.number().int().positive(),
  amount: z.number().positive().optional(),
  category: z.string().min(2).max(50).optional(),
  notes: z.string().max(500).optional(),
  receiptAttachmentId: z.string().optional(),
});

export type CreateTransactionInput = z.input<typeof CreateTransactionSchema>;
export type UpdateTransactionInput = z.infer<typeof UpdateTransactionSchema>;

export class TransactionService {
  /**
   * Calculates current wallet balance using the isolated Ledger Balance Calculator algorithm.
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

    // Map Prisma LedgerEntry to pure algorithm input
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

    // Reservations (EXPENSE transactions in PENDING_APPROVAL / PAYMENT_PENDING)
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
   * Creates a transaction draft.
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

      return transaction;
    });
  }

  /**
   * Fetches paginated list of transactions for a wallet.
   */
  static async getWalletTransactions(
    walletId: string,
    filter?: { type?: TransactionType; state?: TransactionState; page?: number; limit?: number }
  ) {
    const page = Math.max(1, filter?.page || 1);
    const limit = Math.min(100, Math.max(1, filter?.limit || 20));
    const skip = (page - 1) * limit;

    const where: Prisma.TransactionWhereInput = {
      walletId,
      ...(filter?.type && { type: filter.type }),
      ...(filter?.state && { state: filter.state }),
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
   * Gets single transaction details with full chronology and approvals.
   */
  static async getTransactionById(transactionId: string) {
    const transaction = await prisma.transaction.findUnique({
      where: { id: transactionId },
      include: {
        creator: {
          select: { id: true, fullName: true, email: true },
        },
        wallet: {
          select: { id: true, name: true, currency: true },
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
   * Updates an existing draft with optimistic locking check.
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

      return {
        ...updated,
        amount: Number(updated.amount),
      };
    });
  }

  /**
   * Submits a transaction draft into the approval / posting workflow.
   * Integrates the pure FSM Transition Validator algorithm.
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

      // Step 1: Run FSM validator: DRAFT -> SUBMITTED
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

      // Handle EXPENSE workflow: needs approval quorum
      if (transaction.type === TransactionType.EXPENSE) {
        // Step 2: FSM: SUBMITTED -> PENDING_APPROVAL
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

        // Check wallet available balance
        const balance = await this.getWalletBalanceSummary(transaction.walletId);
        if (balance.availableBalance < Number(transaction.amount)) {
          throw {
            status: 400,
            code: 'INSUFFICIENT_AVAILABLE_BALANCE',
            message: `Saldo kas tidak mencukupi untuk mengajukan pengeluaran ini. (Saldo tersedia: Rp ${balance.availableBalance.toLocaleString('id-ID')}, Dibutuhkan: Rp ${Number(transaction.amount).toLocaleString('id-ID')}).`,
          };
        }
      } else {
        // INCOME workflow (Pemasukan Kas, e.g. Iuran Warga):
        // Automatically completes and posts credit to ledger upon submission!
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
      }

      const updated = await tx.transaction.update({
        where: { id: transactionId },
        data: {
          state: finalState,
          version: { increment: 1 },
        },
      });

      await tx.transactionEvent.create({
        data: {
          transactionId,
          actorId,
          eventType: transaction.type === TransactionType.EXPENSE ? 'APPROVAL_REQUESTED' : 'INCOME_POSTED',
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

      return {
        ...updated,
        amount: Number(updated.amount),
      };
    });
  }

  /**
   * Cancels a transaction.
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

      return {
        ...updated,
        amount: Number(updated.amount),
      };
    });
  }
}