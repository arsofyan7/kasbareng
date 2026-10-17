import { describe, it, expect } from 'vitest';
import { calculateBalance, BalanceCalculatorInput } from './balance-calculator';

describe('Algorithm: Ledger Balance Calculator', () => {
  const walletId = 'w_acct_42';
  const currency = 'IDR';

  it('calculates posted balance correctly from CREDIT and DEBIT entries', () => {
    const input: BalanceCalculatorInput = {
      walletId,
      currency,
      entries: [
        {
          id: 'e1',
          walletId,
          type: 'CREDIT',
          amount: 1000000n, // Rp 1.000.000
          currency: 'IDR',
          status: 'POSTED',
          createdAt: new Date(),
        },
        {
          id: 'e2',
          walletId,
          type: 'DEBIT',
          amount: 250000n, // Rp 250.000
          currency: 'IDR',
          status: 'POSTED',
          createdAt: new Date(),
        },
        {
          id: 'e3',
          walletId,
          type: 'CREDIT',
          amount: 500000n, // PENDING, should not affect posted balance
          currency: 'IDR',
          status: 'PENDING',
          createdAt: new Date(),
        },
      ],
    };

    const res = calculateBalance(input);
    expect(res.isValid).toBe(true);
    expect(res.postedBalance).toBe(750000n);
    expect(res.availableBalance).toBe(750000n);
    expect(res.postedCreditTotal).toBe(1000000n);
    expect(res.postedDebitTotal).toBe(250000n);
    expect(res.postedEntriesCount).toBe(2);
  });

  it('deducts active reservations from available balance without altering posted balance', () => {
    const input: BalanceCalculatorInput = {
      walletId,
      currency,
      entries: [
        {
          id: 'e1',
          walletId,
          type: 'CREDIT',
          amount: 500000n,
          currency: 'IDR',
          status: 'POSTED',
          createdAt: new Date(),
        },
      ],
      reservations: [
        {
          id: 'r1',
          walletId,
          amount: 100000n, // active reservation
          currency: 'IDR',
          status: 'ACTIVE',
          createdAt: new Date(),
        },
        {
          id: 'r2',
          walletId,
          amount: 50000n, // already consumed/released
          currency: 'IDR',
          status: 'RELEASED',
          createdAt: new Date(),
        },
      ],
    };

    const res = calculateBalance(input);
    expect(res.postedBalance).toBe(500000n);
    expect(res.activeReservations).toBe(100000n);
    expect(res.availableBalance).toBe(400000n);
  });

  it('rejects floating point amounts to prevent precision loss', () => {
    const input: BalanceCalculatorInput = {
      walletId,
      currency,
      entries: [
        {
          id: 'e1',
          walletId,
          type: 'CREDIT',
          amount: 1000.5, // float!
          currency: 'IDR',
          status: 'POSTED',
          createdAt: new Date(),
        },
      ],
    };

    const res = calculateBalance(input);
    expect(res.isValid).toBe(false);
    expect(res.validationErrors.some((e) => e.code === 'INVALID_AMOUNT')).toBe(true);
  });

  it('flags negative balance violation when not allowed', () => {
    const input: BalanceCalculatorInput = {
      walletId,
      currency,
      entries: [
        {
          id: 'e1',
          walletId,
          type: 'DEBIT',
          amount: 50000n,
          currency: 'IDR',
          status: 'POSTED',
          createdAt: new Date(),
        },
      ],
      options: { allowNegativeBalance: false },
    };

    const res = calculateBalance(input);
    expect(res.isValid).toBe(false);
    expect(res.validationErrors.some((e) => e.code === 'NEGATIVE_BALANCE_NOT_ALLOWED')).toBe(true);
    expect(res.postedBalance).toBe(-50000n);
    expect(res.availableBalance).toBe(-50000n);
  });

  it('detects currency mismatch', () => {
    const input: BalanceCalculatorInput = {
      walletId,
      currency: 'IDR',
      entries: [
        {
          id: 'e1',
          walletId,
          type: 'CREDIT',
          amount: 100000n,
          currency: 'USD', // mismatch!
          status: 'POSTED',
          createdAt: new Date(),
        },
      ],
    };

    const res = calculateBalance(input);
    expect(res.isValid).toBe(false);
    expect(res.validationErrors.some((e) => e.code === 'CURRENCY_MISMATCH')).toBe(true);
  });
});
