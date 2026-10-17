export type TransactionDirection = 'CR' | 'DB';

export interface BankStatementMutation {
  id: string;
  externalReference?: string | null;
  amount: bigint | number | string; // integer minor units
  direction: TransactionDirection;
  bookingDate: string; // ISO date YYYY-MM-DD or ISO timestamp
  description?: string | null;
}

export interface InternalTransactionRecord {
  id: string;
  reference: string;
  amount: bigint | number | string; // integer minor units
  direction: TransactionDirection;
  transactionDate: string; // ISO date YYYY-MM-DD or ISO timestamp
  description?: string | null;
}

export type MatchStatus = 'MATCHED' | 'AMBIGUOUS' | 'UNMATCHED' | 'DUPLICATE_POTENTIAL';

export interface MatchPair {
  bankMutationId: string;
  internalTransactionId: string;
  ruleCode: 'EXACT_REFERENCE' | 'NOMINAL_DIRECTION_DATE_WINDOW';
  rulesetVersion: string;
  matchedAt: string;
}

export interface AmbiguousBankItem {
  bankMutationId: string;
  candidateInternalIds: string[];
  reason: string;
}

export interface DuplicateAlert {
  entityType: 'BANK_STATEMENT' | 'INTERNAL_TRANSACTION';
  reference: string;
  conflictingIds: string[];
}

export interface ReconciliationResult {
  rulesetVersion: string;
  matchedPairs: MatchPair[];
  unmatchedBankMutationIds: string[];
  unmatchedInternalTransactionIds: string[];
  ambiguousBankItems: AmbiguousBankItem[];
  duplicateAlerts: DuplicateAlert[];
  totalBankMutations: number;
  totalInternalTransactions: number;
  matchedCount: number;
}

export interface ReconciliationOptions {
  rulesetVersion?: string;
  dateToleranceDays?: number; // default +/- 3 days
}

function toBigIntSafe(val: bigint | number | string): bigint {
  if (typeof val === 'bigint') return val;
  if (typeof val === 'number') {
    if (!Number.isInteger(val)) throw new Error(`Floating point amount not allowed in reconciliation: ${val}`);
    return BigInt(val);
  }
  return BigInt(val);
}

function parseDateDays(dateStr: string): number {
  const d = new Date(dateStr);
  return Math.floor(d.getTime() / (1000 * 60 * 60 * 24));
}

/**
 * Deterministic Reconciliation Matcher.
 * Matches external bank mutations with internal transactions based on explicit verifiable rules.
 */
export function reconcileStatements(
  bankMutations: BankStatementMutation[],
  internalTransactions: InternalTransactionRecord[],
  options: ReconciliationOptions = {}
): ReconciliationResult {
  const rulesetVersion = options.rulesetVersion ?? 'RECON_RULESET_V1_DETERMINISTIC';
  const toleranceDays = options.dateToleranceDays ?? 3;
  const matchedAt = new Date().toISOString();

  const matchedPairs: MatchPair[] = [];
  const ambiguousBankItems: AmbiguousBankItem[] = [];
  const duplicateAlerts: DuplicateAlert[] = [];

  const matchedBankIds = new Set<string>();
  const matchedInternalIds = new Set<string>();

  // 1. Detect duplicates in external references
  const bankRefMap = new Map<string, string[]>();
  for (const b of bankMutations) {
    if (b.externalReference && b.externalReference.trim().length > 0) {
      const ref = b.externalReference.trim().toUpperCase();
      const existing = bankRefMap.get(ref) || [];
      existing.push(b.id);
      bankRefMap.set(ref, existing);
    }
  }

  for (const [ref, ids] of bankRefMap.entries()) {
    if (ids.length > 1) {
      duplicateAlerts.push({
        entityType: 'BANK_STATEMENT',
        reference: ref,
        conflictingIds: ids,
      });
    }
  }

  // Detect duplicates in internal transaction references
  const internalRefMap = new Map<string, string[]>();
  for (const t of internalTransactions) {
    if (t.reference && t.reference.trim().length > 0) {
      const ref = t.reference.trim().toUpperCase();
      const existing = internalRefMap.get(ref) || [];
      existing.push(t.id);
      internalRefMap.set(ref, existing);
    }
  }

  for (const [ref, ids] of internalRefMap.entries()) {
    if (ids.length > 1) {
      duplicateAlerts.push({
        entityType: 'INTERNAL_TRANSACTION',
        reference: ref,
        conflictingIds: ids,
      });
    }
  }

  // Duplicate reference set to skip auto-matching entirely (requires manual review)
  const conflictedBankRefs = new Set(
    duplicateAlerts
      .filter((d) => d.entityType === 'BANK_STATEMENT')
      .map((d) => d.reference)
  );
  const conflictedInternalRefs = new Set(
    duplicateAlerts
      .filter((d) => d.entityType === 'INTERNAL_TRANSACTION')
      .map((d) => d.reference)
  );

  const bankIdsWithConflictedRef = new Set<string>();
  for (const b of bankMutations) {
    if (b.externalReference && conflictedBankRefs.has(b.externalReference.trim().toUpperCase())) {
      bankIdsWithConflictedRef.add(b.id);
    }
  }

  const internalIdsWithConflictedRef = new Set<string>();
  for (const t of internalTransactions) {
    if (t.reference && conflictedInternalRefs.has(t.reference.trim().toUpperCase())) {
      internalIdsWithConflictedRef.add(t.id);
    }
  }

  // 2. Rule 1: Exact Unique Reference Matching
  for (const b of bankMutations) {
    if (!b.externalReference) continue;
    const ref = b.externalReference.trim().toUpperCase();
    if (conflictedBankRefs.has(ref) || conflictedInternalRefs.has(ref)) {
      continue; // Skip ambiguous duplicates
    }

    const internalMatches = internalTransactions.filter(
      (t) =>
        !matchedInternalIds.has(t.id) &&
        !internalIdsWithConflictedRef.has(t.id) &&
        t.reference.trim().toUpperCase() === ref &&
        toBigIntSafe(t.amount) === toBigIntSafe(b.amount) &&
        t.direction === b.direction
    );

    if (internalMatches.length === 1) {
      const matchedInternal = internalMatches[0];
      matchedPairs.push({
        bankMutationId: b.id,
        internalTransactionId: matchedInternal.id,
        ruleCode: 'EXACT_REFERENCE',
        rulesetVersion,
        matchedAt,
      });
      matchedBankIds.add(b.id);
      matchedInternalIds.add(matchedInternal.id);
    }
  }

  // 3. Rule 2: Amount + Direction + Date Window Matching
  for (const b of bankMutations) {
    if (matchedBankIds.has(b.id)) continue;
    // Do not auto-match bank mutations that have duplicate references
    if (bankIdsWithConflictedRef.has(b.id)) continue;

    const bAmt = toBigIntSafe(b.amount);
    const bDays = parseDateDays(b.bookingDate);

    // Find candidates in internal transactions
    const candidates = internalTransactions.filter((t) => {
      if (matchedInternalIds.has(t.id)) return false;
      if (internalIdsWithConflictedRef.has(t.id)) return false;
      if (t.direction !== b.direction) return false;
      if (toBigIntSafe(t.amount) !== bAmt) return false;

      const tDays = parseDateDays(t.transactionDate);
      const diff = Math.abs(bDays - tDays);
      return diff <= toleranceDays;
    });

    if (candidates.length === 1) {
      const matchedInternal = candidates[0];
      matchedPairs.push({
        bankMutationId: b.id,
        internalTransactionId: matchedInternal.id,
        ruleCode: 'NOMINAL_DIRECTION_DATE_WINDOW',
        rulesetVersion,
        matchedAt,
      });
      matchedBankIds.add(b.id);
      matchedInternalIds.add(matchedInternal.id);
    } else if (candidates.length > 1) {
      ambiguousBankItems.push({
        bankMutationId: b.id,
        candidateInternalIds: candidates.map((c) => c.id),
        reason: `Found ${candidates.length} candidate transactions matching amount ${bAmt.toString()} and direction ${b.direction} within +/-${toleranceDays} days.`,
      });
    }
  }

  // 4. Collect Unmatched IDs
  const unmatchedBankMutationIds = bankMutations
    .filter((b) => !matchedBankIds.has(b.id))
    .map((b) => b.id);

  const unmatchedInternalTransactionIds = internalTransactions
    .filter((t) => !matchedInternalIds.has(t.id))
    .map((t) => t.id);

  return {
    rulesetVersion,
    matchedPairs,
    unmatchedBankMutationIds,
    unmatchedInternalTransactionIds,
    ambiguousBankItems,
    duplicateAlerts,
    totalBankMutations: bankMutations.length,
    totalInternalTransactions: internalTransactions.length,
    matchedCount: matchedPairs.length,
  };
}