import { describe, it, expect } from 'vitest';
import {
  validateTransition,
  TransactionState,
  TransactionEvent,
} from './transition-validator';

describe('Algorithm: FSM Transition Validator', () => {
  it('validates standard happy path lifecycle (DRAFT -> SUBMITTED -> PENDING_APPROVAL -> APPROVED -> PAYMENT_PENDING -> COMPLETED)', () => {
    // 1. DRAFT -> SUBMITTED
    const r1 = validateTransition({
      currentState: 'DRAFT',
      event: 'SUBMIT',
    });
    expect(r1.allowed).toBe(true);
    expect(r1.nextState).toBe('SUBMITTED');

    // 2. SUBMITTED -> PENDING_APPROVAL
    const r2 = validateTransition({
      currentState: 'SUBMITTED',
      event: 'REQUEST_APPROVAL',
    });
    expect(r2.allowed).toBe(true);
    expect(r2.nextState).toBe('PENDING_APPROVAL');

    // 3. PENDING_APPROVAL -> APPROVED (with quorum satisfied)
    const r3 = validateTransition({
      currentState: 'PENDING_APPROVAL',
      event: 'APPROVE_WITH_QUORUM',
      context: { quorumSatisfied: true },
    });
    expect(r3.allowed).toBe(true);
    expect(r3.nextState).toBe('APPROVED');

    // 4. APPROVED -> PAYMENT_PENDING
    const r4 = validateTransition({
      currentState: 'APPROVED',
      event: 'INITIATE_PAYMENT',
    });
    expect(r4.allowed).toBe(true);
    expect(r4.nextState).toBe('PAYMENT_PENDING');

    // 5. PAYMENT_PENDING -> COMPLETED (requires both paymentVerified and ledgerPosted)
    const r5 = validateTransition({
      currentState: 'PAYMENT_PENDING',
      event: 'CONFIRM_PAYMENT',
      context: { paymentVerified: true, ledgerPosted: true },
    });
    expect(r5.allowed).toBe(true);
    expect(r5.nextState).toBe('COMPLETED');
  });

  it('rejects transition when quorum guard is not satisfied', () => {
    const res = validateTransition({
      currentState: 'PENDING_APPROVAL',
      event: 'APPROVE_WITH_QUORUM',
      context: { quorumSatisfied: false },
    });
    expect(res.allowed).toBe(false);
    expect(res.errorCode).toBe('QUORUM_NOT_MET');
  });

  it('rejects CONFIRM_PAYMENT if payment is not verified or ledger is not posted', () => {
    const unverified = validateTransition({
      currentState: 'PAYMENT_PENDING',
      event: 'CONFIRM_PAYMENT',
      context: { paymentVerified: false, ledgerPosted: true },
    });
    expect(unverified.allowed).toBe(false);
    expect(unverified.errorCode).toBe('PAYMENT_NOT_VERIFIED');

    const unposted = validateTransition({
      currentState: 'PAYMENT_PENDING',
      event: 'CONFIRM_PAYMENT',
      context: { paymentVerified: true, ledgerPosted: false },
    });
    expect(unposted.allowed).toBe(false);
    expect(unposted.errorCode).toBe('LEDGER_NOT_POSTED');
  });

  it('rejects invalid state transition (PENDING_APPROVAL -> COMPLETED directly)', () => {
    const res = validateTransition({
      currentState: 'PENDING_APPROVAL',
      event: 'CONFIRM_PAYMENT',
    });
    expect(res.allowed).toBe(false);
    expect(res.errorCode).toBe('INVALID_STATE_TRANSITION');
  });

  it('rejects any transition from terminal states (COMPLETED, CANCELLED, REJECTED)', () => {
    const terminalStates: TransactionState[] = ['COMPLETED', 'CANCELLED', 'REJECTED'];
    for (const state of terminalStates) {
      const res = validateTransition({
        currentState: state,
        event: 'SUBMIT',
      });
      expect(res.allowed).toBe(false);
      expect(res.errorCode).toBe('TERMINAL_STATE');
    }
  });

  it('rejects transition on version mismatch (optimistic locking)', () => {
    const res = validateTransition({
      currentState: 'SUBMITTED',
      event: 'REQUEST_APPROVAL',
      context: {
        expectedVersion: 1,
        currentVersion: 2,
      },
    });
    expect(res.allowed).toBe(false);
    expect(res.errorCode).toBe('VERSION_MISMATCH');
  });

  it('allows cancellation from DRAFT, SUBMITTED, and PENDING_APPROVAL', () => {
    expect(validateTransition({ currentState: 'DRAFT', event: 'CANCEL' }).allowed).toBe(true);
    expect(validateTransition({ currentState: 'SUBMITTED', event: 'CANCEL' }).allowed).toBe(true);
    expect(validateTransition({ currentState: 'PENDING_APPROVAL', event: 'CANCEL' }).allowed).toBe(true);
  });
});
