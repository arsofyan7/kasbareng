import { Prisma } from '@prisma/client';
import { prisma } from '../../common/prisma';
import { canonicalizeJson } from '../../algorithms/canonicalization/canonical-json';
import {
  computeHashChainEvent,
  verifyHashChain,
  GENESIS_PREVIOUS_HASH,
  HashChainEvent,
  VerificationResult,
} from '../../algorithms/hash-chain/hash-chain';

export interface RecordAuditInput {
  walletId: string;
  actorId?: string;
  eventType: string;
  transactionId?: string;
  transactionVersion?: number;
  fromState?: string | null;
  toState?: string | null;
  metadata?: Record<string, unknown>;
  serverTimestamp?: Date;
}

export class AuditService {
  /**
   * Appends a new tamper-evident SHA-256 audit log event to the wallet's hash chain.
   * Can be executed within an existing Prisma transaction or standalone.
   */
  static async recordAuditEvent(
    txClient: Prisma.TransactionClient | typeof prisma,
    input: RecordAuditInput
  ) {
    const timestamp = input.serverTimestamp || new Date();

    // 1. Fetch latest audit log for this wallet to get sequence_no and previous_hash
    const lastLog = await txClient.auditLog.findFirst({
      where: { walletId: input.walletId },
      orderBy: { sequenceNo: 'desc' },
      select: { sequenceNo: true, currentHash: true },
    });

    const sequenceNo = (lastLog?.sequenceNo || 0) + 1;
    const previousHash = lastLog?.currentHash || GENESIS_PREVIOUS_HASH;
    const eventId = `evt_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

    // 2. Build canonical audit payload (sanitized, structured, sorted)
    const payloadObject = {
      actorId: input.actorId || 'SYSTEM',
      eventId,
      eventType: input.eventType,
      fromState: input.fromState || null,
      metadata: input.metadata || {},
      sequenceNo,
      serverTimestamp: timestamp.toISOString(),
      toState: input.toState || null,
      transactionId: input.transactionId || null,
      transactionVersion: input.transactionVersion ?? 1,
      walletId: input.walletId,
    };

    const canonicalPayload = canonicalizeJson(payloadObject);

    // 3. Compute pure hash chain event (payloadHash & currentHash)
    const chainEvent = computeHashChainEvent({
      walletId: input.walletId,
      sequenceNo,
      canonicalPayload,
      previousHash,
      serverTimestamp: payloadObject.serverTimestamp,
    });

    // 4. Store in database
    const savedLog = await txClient.auditLog.create({
      data: {
        walletId: input.walletId,
        sequenceNo,
        eventId,
        canonicalPayload,
        payloadHash: chainEvent.payloadHash,
        previousHash: chainEvent.previousHash,
        currentHash: chainEvent.currentHash,
        createdAt: timestamp,
      },
    });

    return savedLog;
  }

  /**
   * Verifies the entire cryptographic hash chain for a wallet.
   * Runs the pure verifyHashChain algorithm on all recorded events.
   */
  static async verifyWalletChain(walletId: string): Promise<
    VerificationResult & {
      walletId: string;
      latestSequenceNo: number;
      latestCurrentHash: string;
      verifiedAt: string;
    }
  > {
    const logs = await prisma.auditLog.findMany({
      where: { walletId },
      orderBy: { sequenceNo: 'asc' },
    });

    const chainEvents: HashChainEvent[] = logs.map((log) => ({
      walletId: log.walletId,
      sequenceNo: log.sequenceNo,
      payloadHash: log.payloadHash,
      previousHash: log.previousHash,
      currentHash: log.currentHash,
      serverTimestamp: log.createdAt.toISOString(),
      canonicalPayload: log.canonicalPayload || '',
    }));

    const result = verifyHashChain(chainEvents);

    const latest = logs.length > 0 ? logs[logs.length - 1] : null;

    return {
      ...result,
      walletId,
      latestSequenceNo: latest?.sequenceNo || 0,
      latestCurrentHash: latest?.currentHash || GENESIS_PREVIOUS_HASH,
      verifiedAt: new Date().toISOString(),
    };
  }

  /**
   * Fetches paginated audit logs for a wallet.
   */
  static async getWalletAuditLogs(
    walletId: string,
    filter?: { page?: number; limit?: number }
  ) {
    const page = Math.max(1, filter?.page || 1);
    const limit = Math.min(100, Math.max(1, filter?.limit || 20));
    const skip = (page - 1) * limit;

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where: { walletId },
        skip,
        take: limit,
        orderBy: { sequenceNo: 'desc' },
      }),
      prisma.auditLog.count({ where: { walletId } }),
    ]);

    return {
      logs: logs.map((log) => ({
        id: log.id,
        walletId: log.walletId,
        sequenceNo: log.sequenceNo,
        eventId: log.eventId,
        payloadHash: log.payloadHash,
        previousHash: log.previousHash,
        currentHash: log.currentHash,
        createdAt: log.createdAt,
        payload: log.canonicalPayload ? JSON.parse(log.canonicalPayload) : null,
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
   * Tamper Simulation Drill:
   * Directly alters a historical record in the database without recalculating the hash.
   * This is used to prove to auditors / professors that any unauthorized database modification
   * is instantly detected by verifyHashChain.
   */
  static async simulateTamper(walletId: string, sequenceNo: number, maliciousPayload: string) {
    const target = await prisma.auditLog.findUnique({
      where: {
        walletId_sequenceNo: { walletId, sequenceNo },
      },
    });

    if (!target) {
      throw {
        status: 404,
        code: 'LOG_NOT_FOUND',
        message: `Audit log pada sequence #${sequenceNo} tidak ditemukan.`,
      };
    }

    // Intentionally modify canonicalPayload without updating payloadHash or currentHash
    const tampered = await prisma.auditLog.update({
      where: { id: target.id },
      data: {
        canonicalPayload: maliciousPayload,
      },
    });

    return {
      tampered: true,
      sequenceNo,
      originalPayloadHash: target.payloadHash,
      newContent: maliciousPayload,
    };
  }

  /**
   * Restores a tampered event's canonicalPayload back to match its payloadHash.
   */
  static async repairLog(walletId: string, sequenceNo: number, restoredPayload: string) {
    const target = await prisma.auditLog.findUnique({
      where: {
        walletId_sequenceNo: { walletId, sequenceNo },
      },
    });

    if (!target) {
      throw { status: 404, code: 'NOT_FOUND', message: 'Log tidak ditemukan.' };
    }

    await prisma.auditLog.update({
      where: { id: target.id },
      data: { canonicalPayload: restoredPayload },
    });

    return { repaired: true, sequenceNo };
  }
}
