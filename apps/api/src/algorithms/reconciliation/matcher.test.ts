import { describe, it, expect } from 'vitest';
import {
  reconcileStatements,
  BankStatementMutation,
  InternalTransactionRecord,
} from './matcher';

describe('Algorithm: Deterministic Reconciliation Matcher', () => {
  it('matches exactly by unique external reference (Rule 1)', () => {
    const bank: BankStatementMutation[] = [
      {
        id: 'b1',
        externalReference: 'TRX-REF-001',
        amount: 250000n,
        direction: 'CR',
        bookingDate: '2026-10-15',
      },
    ];

    const internal: InternalTransactionRecord[] = [
      {
        id: 'tx1',
        reference: 'TRX-REF-001',
        amount: 250000n,
        direction: 'CR',
        transactionDate: '2026-10-15',
      },
    ];

    const res = reconcileStatements(bank, internal);
    expect(res.matchedCount).toBe(1);
    expect(res.matchedPairs[0].bankMutationId).toBe('b1');
    expect(res.matchedPairs[0].internalTransactionId).toBe('tx1');
    expect(res.matchedPairs[0].ruleCode).toBe('EXACT_REFERENCE');
    expect(res.unmatchedBankMutationIds.length).toBe(0);
    expect(res.unmatchedInternalTransactionIds.length).toBe(0);
  });

  it('matches by nominal + direction + within date window when reference is missing (Rule 2)', () => {
    const bank: BankStatementMutation[] = [
      {
        id: 'b2',
        externalReference: null,
        amount: 500000n,
        direction: 'CR',
        bookingDate: '2026-10-16',
      },
    ];

    const internal: InternalTransactionRecord[] = [
      {
        id: 'tx2',
        reference: 'INTERNAL-DEPOSIT-88',
        amount: 500000n,
        direction: 'CR',
        transactionDate: '2026-10-15', // 1 day difference (within default 3 days window)
      },
    ];

    const res = reconcileStatements(bank, internal);
    expect(res.matchedCount).toBe(1);
    expect(res.matchedPairs[0].ruleCode).toBe('NOMINAL_DIRECTION_DATE_WINDOW');
    expect(res.matchedPairs[0].internalTransactionId).toBe('tx2');
  });

  it('does NOT match if direction differs (CR vs DB)', () => {
    const bank: BankStatementMutation[] = [
      {
        id: 'b3',
        amount: 100000n,
        direction: 'CR',
        bookingDate: '2026-10-16',
      },
    ];

    const internal: InternalTransactionRecord[] = [
      {
        id: 'tx3',
        reference: 'TX3',
        amount: 100000n,
        direction: 'DB', // different direction!
        transactionDate: '2026-10-16',
      },
    ];

    const res = reconcileStatements(bank, internal);
    expect(res.matchedCount).toBe(0);
    expect(res.unmatchedBankMutationIds).toContain('b3');
    expect(res.unmatchedInternalTransactionIds).toContain('tx3');
  });

  it('does NOT match if date is outside configured window', () => {
    const bank: BankStatementMutation[] = [
      {
        id: 'b4',
        amount: 100000n,
        direction: 'CR',
        bookingDate: '2026-10-25',
      },
    ];

    const internal: InternalTransactionRecord[] = [
      {
        id: 'tx4',
        reference: 'TX4',
        amount: 100000n,
        direction: 'CR',
        transactionDate: '2026-10-10', // 15 days earlier, outside 3 days window
      },
    ];

    const res = reconcileStatements(bank, internal, { dateToleranceDays: 3 });
    expect(res.matchedCount).toBe(0);
    expect(res.unmatchedBankMutationIds).toContain('b4');
  });

  it('flags AMBIGUOUS when multiple internal candidates match same amount + direction + date window', () => {
    const bank: BankStatementMutation[] = [
      {
        id: 'b5',
        amount: 100000n,
        direction: 'CR',
        bookingDate: '2026-10-16',
      },
    ];

    const internal: InternalTransactionRecord[] = [
      {
        id: 'tx5a',
        reference: 'CANDIDATE-A',
        amount: 100000n,
        direction: 'CR',
        transactionDate: '2026-10-16',
      },
      {
        id: 'tx5b',
        reference: 'CANDIDATE-B',
        amount: 100000n,
        direction: 'CR',
        transactionDate: '2026-10-16',
      },
    ];

    const res = reconcileStatements(bank, internal);
    expect(res.matchedCount).toBe(0);
    expect(res.ambiguousBankItems.length).toBe(1);
    expect(res.ambiguousBankItems[0].bankMutationId).toBe('b5');
    expect(res.ambiguousBankItems[0].candidateInternalIds).toEqual(['tx5a', 'tx5b']);
  });

  it('flags DUPLICATE_POTENTIAL when identical external references appear multiple times', () => {
    const bank: BankStatementMutation[] = [
      {
        id: 'b6a',
        externalReference: 'DUP-REF-99',
        amount: 150000n,
        direction: 'DB',
        bookingDate: '2026-10-16',
      },
      {
        id: 'b6b',
        externalReference: 'DUP-REF-99',
        amount: 150000n,
        direction: 'DB',
        bookingDate: '2026-10-16',
      },
    ];

    const internal: InternalTransactionRecord[] = [
      {
        id: 'tx6',
        reference: 'DUP-REF-99',
        amount: 150000n,
        direction: 'DB',
        transactionDate: '2026-10-16',
      },
    ];

    const res = reconcileStatements(bank, internal);
    expect(res.duplicateAlerts.length).toBeGreaterThan(0);
    expect(res.duplicateAlerts.some((d) => d.reference === 'DUP-REF-99')).toBe(true);
    // Should NOT automatically match because reference was ambiguous / duplicated
    expect(res.matchedCount).toBe(0);
  });

  it('handles missing internal transaction (unmatched bank mutation)', () => {
    const bank: BankStatementMutation[] = [
      { id: 'b7', amount: 50000n, direction: 'CR', bookingDate: '2026-10-16' },
    ];
    const internal: InternalTransactionRecord[] = [];

    const res = reconcileStatements(bank, internal);
    expect(res.matchedCount).toBe(0);
    expect(res.unmatchedBankMutationIds).toEqual(['b7']);
  });

  it('handles missing bank statement (unmatched internal transaction)', () => {
    const bank: BankStatementMutation[] = [];
    const internal: InternalTransactionRecord[] = [
      { id: 'tx8', reference: 'ORPHAN-TX', amount: 75000n, direction: 'DB', transactionDate: '2026-10-16' },
    ];

    const res = reconcileStatements(bank, internal);
    expect(res.matchedCount).toBe(0);
    expect(res.unmatchedInternalTransactionIds).toEqual(['tx8']);
  });
});
