export type LedgerEntryType = 'CREDIT' | 'DEBIT';

export type LedgerEntryStatus = 'POSTED' | 'PENDING' | 'VOIDED';

export type ReservationStatus = 'ACTIVE' | 'RELEASED' | 'CONSUMED';

export interface LedgerEntry {
  id: string;
  walletId: string;
  type: LedgerEntryType;
  amount: bigint | string | number; // minor units (e.g. cents/rupiah)
  currency: string;
  status: LedgerEntryStatus;
  isReversal?: boolean;
  reversalOfId?: string;
  createdAt: string | Date;
}

export interface ReservationEntry {
  id: string;
  walletId: string;
  amount: bigint | string | number;
  currency: string;
  status: ReservationStatus;
  expiresAt?: string | Date;
  createdAt: string | Date;
}

export interface BalanceCalculatorInput {
  walletId: string;
  currency: string;
  entries: LedgerEntry[];
  reservations?: ReservationEntry[];
  options?: {
    allowNegativeBalance?: boolean;
    now?: Date;
  };
}

export interface ValidationError {
  code:
    | 'CURRENCY_MISMATCH'
    | 'INVALID_AMOUNT'
    | 'NEGATIVE_BALANCE_NOT_ALLOWED'
    | 'WALLET_ID_MISMATCH';
  message: string;
  entityId?: string;
}

export interface BalanceCalculationResult {
  walletId: string;
  currency: string;
  postedBalance: bigint;
  activeReservations: bigint;
  availableBalance: bigint;
  postedCreditTotal: bigint;
  postedDebitTotal: bigint;
  totalEntriesCount: number;
  postedEntriesCount: number;
  activeReservationsCount: number;
  validationErrors: ValidationError[];
  isValid: boolean;
}

function toBigIntSafe(val: bigint | string | number): bigint {
  if (typeof val === 'bigint') return val;
  if (typeof val === 'number') {
    if (!Number.isInteger(val)) {
      throw new Error(`Floating point values are forbidden in ledger calculation: ${val}`);
    }
    return BigInt(val);
  }
  return BigInt(val);
}

/**
 * Computes posted balance, active reservations, and available balance with zero floating point inaccuracy.
 * Pure function: deterministic, zero side-effects.
 */
export function calculateBalance(input: BalanceCalculatorInput): BalanceCalculationResult {
  const { walletId, currency, entries, reservations = [], options = {} } = input;
  const allowNegative = options.allowNegativeBalance ?? false;
  const now = options.now ? options.now.getTime() : Date.now();

  const validationErrors: ValidationError[] = [];

  let postedCreditTotal = 0n;
  let postedDebitTotal = 0n;
  let postedEntriesCount = 0;

  // 1. Process Ledger Entries
  for (const entry of entries) {
    if (entry.walletId !== walletId) {
      validationErrors.push({
        code: 'WALLET_ID_MISMATCH',
        message: `Entry ${entry.id} walletId ${entry.walletId} does not match target ${walletId}`,
        entityId: entry.id,
      });
      continue;
    }

    if (entry.currency.toUpperCase() !== currency.toUpperCase()) {
      validationErrors.push({
        code: 'CURRENCY_MISMATCH',
        message: `Entry ${entry.id} currency ${entry.currency} does not match target ${currency}`,
        entityId: entry.id,
      });
      continue;
    }

    let amt: bigint;
    try {
      amt = toBigIntSafe(entry.amount);
      if (amt <= 0n) {
        validationErrors.push({
          code: 'INVALID_AMOUNT',
          message: `Entry ${entry.id} has invalid non-positive amount: ${entry.amount}`,
          entityId: entry.id,
        });
        continue;
      }
    } catch (err: unknown) {
      validationErrors.push({
        code: 'INVALID_AMOUNT',
        message: `Entry ${entry.id} amount cannot be parsed to integer minor units: ${(err as Error).message}`,
        entityId: entry.id,
      });
      continue;
    }

    // Only POSTED entries affect posted balance
    if (entry.status === 'POSTED') {
      postedEntriesCount++;
      if (entry.type === 'CREDIT') {
        postedCreditTotal += amt;
      } else if (entry.type === 'DEBIT') {
        postedDebitTotal += amt;
      }
    }
  }

  const postedBalance = postedCreditTotal - postedDebitTotal;

  // 2. Process Reservations
  let activeReservationsTotal = 0n;
  let activeReservationsCount = 0;

  for (const res of reservations) {
    if (res.walletId !== walletId) {
      validationErrors.push({
        code: 'WALLET_ID_MISMATCH',
        message: `Reservation ${res.id} walletId ${res.walletId} does not match target ${walletId}`,
        entityId: res.id,
      });
      continue;
    }

    if (res.currency.toUpperCase() !== currency.toUpperCase()) {
      validationErrors.push({
        code: 'CURRENCY_MISMATCH',
        message: `Reservation ${res.id} currency ${res.currency} does not match target ${currency}`,
        entityId: res.id,
      });
      continue;
    }

    let amt: bigint;
    try {
      amt = toBigIntSafe(res.amount);
      if (amt <= 0n) {
        validationErrors.push({
          code: 'INVALID_AMOUNT',
          message: `Reservation ${res.id} has invalid non-positive amount: ${res.amount}`,
          entityId: res.id,
        });
        continue;
      }
    } catch (err: unknown) {
      validationErrors.push({
        code: 'INVALID_AMOUNT',
        message: `Reservation ${res.id} amount cannot be parsed: ${(err as Error).message}`,
        entityId: res.id,
      });
      continue;
    }

    // Check if reservation is active and not expired
    if (res.status === 'ACTIVE') {
      const isExpired = res.expiresAt ? new Date(res.expiresAt).getTime() <= now : false;
      if (!isExpired) {
        activeReservationsTotal += amt;
        activeReservationsCount++;
      }
    }
  }

  const availableBalance = postedBalance - activeReservationsTotal;

  // 3. Negative balance check
  if (!allowNegative && availableBalance < 0n) {
    validationErrors.push({
      code: 'NEGATIVE_BALANCE_NOT_ALLOWED',
      message: `Available balance (${availableBalance.toString()}) cannot be negative for wallet ${walletId}`,
    });
  }

  return {
    walletId,
    currency,
    postedBalance,
    activeReservations: activeReservationsTotal,
    availableBalance,
    postedCreditTotal,
    postedDebitTotal,
    totalEntriesCount: entries.length,
    postedEntriesCount,
    activeReservationsCount,
    validationErrors,
    isValid: validationErrors.length === 0,
  };
}
