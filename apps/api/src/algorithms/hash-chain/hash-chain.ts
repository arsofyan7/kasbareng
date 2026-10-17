import { createHash } from 'node:crypto';
import { canonicalizeJson } from '../canonicalization/canonical-json';

export const GENESIS_PREVIOUS_HASH = '0000000000000000000000000000000000000000000000000000000000000000';

export interface HashChainEventInput {
  walletId: string;
  sequenceNo: number;
  canonicalPayload: string | Record<string, unknown>;
  previousHash: string;
  serverTimestamp: string;
}

export interface HashChainEvent {
  walletId: string;
  sequenceNo: number;
  payloadHash: string;
  previousHash: string;
  currentHash: string;
  serverTimestamp: string;
  canonicalPayload: string;
}

export interface VerificationResult {
  valid: boolean;
  totalEvents: number;
  failedIndex?: number;
  failedSequenceNo?: number;
  errorCode?: 'INVALID_SEQUENCE' | 'INVALID_PREVIOUS_HASH' | 'PAYLOAD_HASH_MISMATCH' | 'CURRENT_HASH_MISMATCH' | 'GENESIS_HASH_MISMATCH';
  errorMessage?: string;
}

/**
 * Calculates SHA-256 of any UTF-8 string.
 */
export function sha256Hex(data: string): string {
  return createHash('sha256').update(data, 'utf8').digest('hex');
}

/**
 * Computes payloadHash and currentHash for an event in the tamper-evident chain.
 */
export function computeHashChainEvent(input: HashChainEventInput): HashChainEvent {
  const normalizedPayload = typeof input.canonicalPayload === 'string'
    ? input.canonicalPayload
    : canonicalizeJson(input.canonicalPayload);

  const payloadHash = sha256Hex(normalizedPayload);

  // Envelope metadata canonical representation
  const envelopeData = {
    canonicalPayloadHash: payloadHash,
    previousHash: input.previousHash,
    sequenceNo: input.sequenceNo,
    serverTimestamp: input.serverTimestamp,
    walletId: input.walletId,
  };

  const canonicalEnvelope = canonicalizeJson(envelopeData);
  const currentHash = sha256Hex(canonicalEnvelope);

  return {
    walletId: input.walletId,
    sequenceNo: input.sequenceNo,
    payloadHash,
    previousHash: input.previousHash,
    currentHash,
    serverTimestamp: input.serverTimestamp,
    canonicalPayload: normalizedPayload,
  };
}

/**
 * Verifies the integrity of a sequence of HashChain events.
 * Returns valid: true if intact, or detailed error location if tampered.
 */
export function verifyHashChain(events: HashChainEvent[]): VerificationResult {
  if (events.length === 0) {
    return { valid: true, totalEvents: 0 };
  }

  for (let i = 0; i < events.length; i++) {
    const current = events[i];

    // 1. Verify sequence numbers (must start at 1 and increment monotonically)
    const expectedSeq = i + 1;
    if (current.sequenceNo !== expectedSeq) {
      return {
        valid: false,
        totalEvents: events.length,
        failedIndex: i,
        failedSequenceNo: current.sequenceNo,
        errorCode: 'INVALID_SEQUENCE',
        errorMessage: `Sequence mismatch at index ${i}: expected ${expectedSeq}, got ${current.sequenceNo}`,
      };
    }

    // 2. Verify previousHash linking
    if (i === 0) {
      if (current.previousHash !== GENESIS_PREVIOUS_HASH) {
        return {
          valid: false,
          totalEvents: events.length,
          failedIndex: 0,
          failedSequenceNo: current.sequenceNo,
          errorCode: 'GENESIS_HASH_MISMATCH',
          errorMessage: `Genesis event must link to ${GENESIS_PREVIOUS_HASH}, got ${current.previousHash}`,
        };
      }
    } else {
      const prev = events[i - 1];
      if (current.previousHash !== prev.currentHash) {
        return {
          valid: false,
          totalEvents: events.length,
          failedIndex: i,
          failedSequenceNo: current.sequenceNo,
          errorCode: 'INVALID_PREVIOUS_HASH',
          errorMessage: `Broken hash link at index ${i}: previousHash does not match event[${i - 1}].currentHash`,
        };
      }
    }

    // 3. Verify payload hash recalculation
    const expectedPayloadHash = sha256Hex(current.canonicalPayload);
    if (current.payloadHash !== expectedPayloadHash) {
      return {
        valid: false,
        totalEvents: events.length,
        failedIndex: i,
        failedSequenceNo: current.sequenceNo,
        errorCode: 'PAYLOAD_HASH_MISMATCH',
        errorMessage: `Tampered payload at index ${i}: expected ${expectedPayloadHash}, got ${current.payloadHash}`,
      };
    }

    // 4. Verify currentHash recalculation
    const envelopeData = {
      canonicalPayloadHash: current.payloadHash,
      previousHash: current.previousHash,
      sequenceNo: current.sequenceNo,
      serverTimestamp: current.serverTimestamp,
      walletId: current.walletId,
    };
    const expectedCurrentHash = sha256Hex(canonicalizeJson(envelopeData));
    if (current.currentHash !== expectedCurrentHash) {
      return {
        valid: false,
        totalEvents: events.length,
        failedIndex: i,
        failedSequenceNo: current.sequenceNo,
        errorCode: 'CURRENT_HASH_MISMATCH',
        errorMessage: `Tampered envelope hash at index ${i}: expected ${expectedCurrentHash}, got ${current.currentHash}`,
      };
    }
  }

  return {
    valid: true,
    totalEvents: events.length,
  };
}
