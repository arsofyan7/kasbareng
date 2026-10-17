import { describe, it, expect } from 'vitest';
import {
  computeHashChainEvent,
  verifyHashChain,
  GENESIS_PREVIOUS_HASH,
  HashChainEvent,
} from './hash-chain';

describe('Algorithm: SHA-256 Tamper-Evident Hash Chain', () => {
  const walletId = 'w_test_101';

  it('computes genesis event and valid hash chain of 3 sequential events', () => {
    // 1. Genesis event
    const event1 = computeHashChainEvent({
      walletId,
      sequenceNo: 1,
      canonicalPayload: { action: 'INIT_WALLET', initialBalance: 0 },
      previousHash: GENESIS_PREVIOUS_HASH,
      serverTimestamp: '2026-10-17T00:00:00.000Z',
    });

    expect(event1.sequenceNo).toBe(1);
    expect(event1.previousHash).toBe(GENESIS_PREVIOUS_HASH);
    expect(event1.payloadHash).toMatch(/^[a-f0-9]{64}$/);
    expect(event1.currentHash).toMatch(/^[a-f0-9]{64}$/);

    // 2. Second event
    const event2 = computeHashChainEvent({
      walletId,
      sequenceNo: 2,
      canonicalPayload: { action: 'DEPOSIT', amount: 500000 },
      previousHash: event1.currentHash,
      serverTimestamp: '2026-10-17T01:00:00.000Z',
    });

    // 3. Third event
    const event3 = computeHashChainEvent({
      walletId,
      sequenceNo: 3,
      canonicalPayload: { action: 'PAYMENT', amount: 150000, txId: 'tx_99' },
      previousHash: event2.currentHash,
      serverTimestamp: '2026-10-17T02:00:00.000Z',
    });

    const chain: HashChainEvent[] = [event1, event2, event3];
    const verification = verifyHashChain(chain);

    expect(verification.valid).toBe(true);
    expect(verification.totalEvents).toBe(3);
    expect(verification.failedIndex).toBeUndefined();
  });

  it('detects tampering with event payload', () => {
    const event1 = computeHashChainEvent({
      walletId,
      sequenceNo: 1,
      canonicalPayload: { action: 'INIT_WALLET' },
      previousHash: GENESIS_PREVIOUS_HASH,
      serverTimestamp: '2026-10-17T00:00:00.000Z',
    });

    const event2 = computeHashChainEvent({
      walletId,
      sequenceNo: 2,
      canonicalPayload: { action: 'DEPOSIT', amount: 1000000 },
      previousHash: event1.currentHash,
      serverTimestamp: '2026-10-17T01:00:00.000Z',
    });

    // An attacker modifies payload from 1,000,000 to 9,000,000 without recomputing hash
    const tamperedEvent2 = {
      ...event2,
      canonicalPayload: '{"action":"DEPOSIT","amount":9000000}',
    };

    const verification = verifyHashChain([event1, tamperedEvent2]);
    expect(verification.valid).toBe(false);
    expect(verification.failedIndex).toBe(1);
    expect(verification.errorCode).toBe('PAYLOAD_HASH_MISMATCH');
  });

  it('detects invalid sequence numbers (gap in chain)', () => {
    const event1 = computeHashChainEvent({
      walletId,
      sequenceNo: 1,
      canonicalPayload: 'event 1',
      previousHash: GENESIS_PREVIOUS_HASH,
      serverTimestamp: '2026-10-17T00:00:00.000Z',
    });

    // Skipped seq 2, went straight to 3
    const event3 = computeHashChainEvent({
      walletId,
      sequenceNo: 3,
      canonicalPayload: 'event 3',
      previousHash: event1.currentHash,
      serverTimestamp: '2026-10-17T01:00:00.000Z',
    });

    const verification = verifyHashChain([event1, event3]);
    expect(verification.valid).toBe(false);
    expect(verification.errorCode).toBe('INVALID_SEQUENCE');
    expect(verification.failedIndex).toBe(1);
  });

  it('detects broken previousHash link when an event in the middle is replaced', () => {
    const event1 = computeHashChainEvent({
      walletId,
      sequenceNo: 1,
      canonicalPayload: 'event 1',
      previousHash: GENESIS_PREVIOUS_HASH,
      serverTimestamp: '2026-10-17T00:00:00.000Z',
    });

    const event2 = computeHashChainEvent({
      walletId,
      sequenceNo: 2,
      canonicalPayload: 'event 2',
      previousHash: event1.currentHash,
      serverTimestamp: '2026-10-17T01:00:00.000Z',
    });

    const event3 = computeHashChainEvent({
      walletId,
      sequenceNo: 3,
      canonicalPayload: 'event 3',
      previousHash: event2.currentHash,
      serverTimestamp: '2026-10-17T02:00:00.000Z',
    });

    // If event 2 is forged with a fresh hash
    const fakeEvent2 = computeHashChainEvent({
      walletId,
      sequenceNo: 2,
      canonicalPayload: 'fake event 2',
      previousHash: event1.currentHash,
      serverTimestamp: '2026-10-17T01:00:00.000Z',
    });

    // Verification of [event1, fakeEvent2, event3]: fakeEvent2 is internally valid, but event3.previousHash points to real event2!
    const verification = verifyHashChain([event1, fakeEvent2, event3]);
    expect(verification.valid).toBe(false);
    expect(verification.failedIndex).toBe(2);
    expect(verification.errorCode).toBe('INVALID_PREVIOUS_HASH');
  });

  it('verifies empty chain as trivially valid', () => {
    expect(verifyHashChain([]).valid).toBe(true);
  });
});
