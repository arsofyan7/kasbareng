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

export const UpdateTransactionSchema = z.object({
  expectedVersion: z.number().int().positive(),
  amount: z.number().positive().optional(),
  category: z.string().min(2).max(50).optional(),
  notes: z.string().max(500).optional(),
  receiptAttachmentId: z.string().optional(),
});

export const ProcessApprovalSchema = z.object({
  decision: z.nativeEnum(ApprovalDecision),
  expectedVersion: z.number().int().positive().optional(),
  comment: z.string().max(500).optional(),
});

export const ExecutePaymentSchema = z.object({
  paymentReference: z.string().max(100).optional(),
  evidenceAttachmentId: z.string().optional(),
  notes: z.string().max(500).optional(),
  expectedVersion: z.number().int().positive().optional(),
});

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
   * Fetches paginated list of transactions for a wallet.
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
        // INCOME workflow:
        // Check if transaction creator is a WARGA (Member Self-Report)
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
          // Member Self-Report: Stays in SUBMITTED state (Awaiting verification by Pengurus/Admin)
          // Financial Security: Saldo kas TIDAK bertambah sebelum diverifikasi pengurus!
          finalState = TransactionState.SUBMITTED;
        } else {
          // Recorded by ADMIN / PENGELOLA:
          // Directly completes and posts credit to ledger upon submission!
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

          // If transaction has associated dues records, mark them PAID
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

      // Remove any pending dues records associated with this cancelled transaction
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
   * Processes an approval decision (APPROVE or REJECT) on a transaction.
   * Integrates pure M-of-N Quorum Evaluator with strict anti-self approval and concurrency locking.
   */
  static async processApproval(
    transactionId: string,
    actorId: string,
    input: ProcessApprovalInput
  ) {
    const validated = ProcessApprovalSchema.parse(input);

    return await prisma.$transaction(async (tx) => {
      // 1. Fetch transaction with wallet
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

      // 2. Validate current state: must be PENDING_APPROVAL
      if (transaction.state !== TransactionState.PENDING_APPROVAL) {
        throw {
          status: 400,
          code: 'INVALID_STATE_TRANSITION',
          message: `Transaksi tidak dalam status menunggu persetujuan (Status saat ini: ${transaction.state}).`,
        };
      }

      // 3. Optimistic locking / Version check
      if (validated.expectedVersion !== undefined && transaction.version !== validated.expectedVersion) {
        throw {
          status: 409,
          code: 'TRANSACTION_VERSION_CONFLICT',
          message: `Data transaksi telah berubah (Versi server: ${transaction.version}, Versi klien: ${validated.expectedVersion}). Muat ulang rincian transaksi.`,
        };
      }

      // 4. Verify Actor membership & role
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

      // 5. Anti-Self Approval Guard
      if (transaction.creatorId === actorId) {
        throw {
          status: 403,
          code: 'SELF_APPROVAL_NOT_ALLOWED',
          message: 'Pembuat pengeluaran tidak diperbolehkan menyetujui pengeluarannya sendiri (Aturan Anti-Self Approval). Diperlukan persetujuan dari pengelola/admin lain.',
        };
      }

      // 6. Deduplication check on (transactionId, approverId, transactionVersion)
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

      // 7. Get active ApprovalPolicy
      const activePolicy = await tx.approvalPolicy.findFirst({
        where: { walletId: transaction.walletId, status: 'ACTIVE' },
        orderBy: { policyVersion: 'desc' },
      });

      const policyVersion = activePolicy?.policyVersion || 1;
      const requiredApprovals = activePolicy?.requiredApprovals || 2;

      // 8. Record the approval decision
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

      // 9. Process Decision
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

      // Decision is APPROVE:
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
   * Executes disbursement payment for an APPROVED expense.
   * Posts official DEBIT to ledger, creates PaymentRecord, and moves state to COMPLETED.
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
   * Verifies an income report submitted by a citizen / WARGA.
   * Single-approver: 1 eligible manager (ADMIN / PENGELOLA) can verify or reject.
   * If APPROVE: transitions to COMPLETED, creates CREDIT ledger entry, and increases cash balance.
   * If REJECT: transitions to REJECTED, records rejection reason, cash balance unaffected.
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

      // Check actor eligibility: must be ADMIN or PENGELOLA
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
        // 1. Post credit to ledger
        const ledgerEntry = await tx.ledgerEntry.create({
          data: {
            walletId: transaction.walletId,
            transactionId: transaction.id,
            entryType: LedgerEntryType.CREDIT,
            amount: transaction.amount,
            currency: transaction.currency,
          },
        });

        // 2. Transition state to COMPLETED
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

        // 3. Record event
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

        // 4. Mark associated dues records as PAID
        await tx.duesRecord.updateMany({
          where: { transactionId },
          data: { status: DuesPaymentStatus.PAID },
        });

        // 5. Record Audit Log
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
        // REJECT
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

        // Delete associated dues records so the periods become available again
        await tx.duesRecord.deleteMany({
          where: { transactionId },
        });

        // Record rejection event
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

        // Record Audit Log
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