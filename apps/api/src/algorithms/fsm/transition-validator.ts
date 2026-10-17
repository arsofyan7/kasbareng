export type TransactionState =
  | 'DRAFT'
  | 'SUBMITTED'
  | 'PENDING_APPROVAL'
  | 'APPROVED'
  | 'REJECTED'
  | 'PAYMENT_PENDING'
  | 'COMPLETED'
  | 'CANCELLED';

export type TransactionEvent =
  | 'SUBMIT'
  | 'REQUEST_APPROVAL'
  | 'APPROVE_WITH_QUORUM'
  | 'REJECT'
  | 'CANCEL'
  | 'INITIATE_PAYMENT'
  | 'PAYMENT_FAILED'
  | 'CONFIRM_PAYMENT';

export interface TransitionContext {
  expectedVersion?: number;
  currentVersion?: number;
  quorumSatisfied?: boolean;
  paymentVerified?: boolean;
  ledgerPosted?: boolean;
  rejectionReason?: string;
  cancellationReason?: string;
  metadata?: Record<string, unknown>;
}

export interface TransitionInput {
  currentState: TransactionState;
  event: TransactionEvent;
  context?: TransitionContext;
}

export type TransitionErrorCode =
  | 'INVALID_STATE_TRANSITION'
  | 'VERSION_MISMATCH'
  | 'QUORUM_NOT_MET'
  | 'PAYMENT_NOT_VERIFIED'
  | 'LEDGER_NOT_POSTED'
  | 'TERMINAL_STATE';

export interface TransitionResult {
  allowed: boolean;
  currentState: TransactionState;
  nextState?: TransactionState;
  errorCode?: TransitionErrorCode;
  errorMessage?: string;
}

interface TransitionRule {
  from: TransactionState;
  event: TransactionEvent;
  to: TransactionState;
  guard?: (context?: TransitionContext) => { ok: boolean; errorCode?: TransitionErrorCode; errorMsg?: string };
}

// Transition Table Definition
const TRANSITION_RULES: TransitionRule[] = [
  // DRAFT transitions
  {
    from: 'DRAFT',
    event: 'SUBMIT',
    to: 'SUBMITTED',
  },
  {
    from: 'DRAFT',
    event: 'CANCEL',
    to: 'CANCELLED',
  },

  // SUBMITTED transitions
  {
    from: 'SUBMITTED',
    event: 'REQUEST_APPROVAL',
    to: 'PENDING_APPROVAL',
  },
  {
    from: 'SUBMITTED',
    event: 'CANCEL',
    to: 'CANCELLED',
  },
  {
    from: 'SUBMITTED',
    event: 'REJECT',
    to: 'REJECTED',
  },

  // PENDING_APPROVAL transitions
  {
    from: 'PENDING_APPROVAL',
    event: 'APPROVE_WITH_QUORUM',
    to: 'APPROVED',
    guard: (ctx) => {
      if (ctx && ctx.quorumSatisfied === false) {
        return {
          ok: false,
          errorCode: 'QUORUM_NOT_MET',
          errorMsg: 'Quorum M-of-N requirements have not been satisfied.',
        };
      }
      return { ok: true };
    },
  },
  {
    from: 'PENDING_APPROVAL',
    event: 'REJECT',
    to: 'REJECTED',
  },
  {
    from: 'PENDING_APPROVAL',
    event: 'CANCEL',
    to: 'CANCELLED',
  },

  // APPROVED transitions
  {
    from: 'APPROVED',
    event: 'INITIATE_PAYMENT',
    to: 'PAYMENT_PENDING',
  },
  {
    from: 'APPROVED',
    event: 'CANCEL',
    to: 'CANCELLED',
  },

  // PAYMENT_PENDING transitions
  {
    from: 'PAYMENT_PENDING',
    event: 'CONFIRM_PAYMENT',
    to: 'COMPLETED',
    guard: (ctx) => {
      if (!ctx?.paymentVerified) {
        return {
          ok: false,
          errorCode: 'PAYMENT_NOT_VERIFIED',
          errorMsg: 'Payment proof must be verified before marking completed.',
        };
      }
      if (!ctx?.ledgerPosted) {
        return {
          ok: false,
          errorCode: 'LEDGER_NOT_POSTED',
          errorMsg: 'Ledger entry must be posted before completing transaction.',
        };
      }
      return { ok: true };
    },
  },
  {
    from: 'PAYMENT_PENDING',
    event: 'PAYMENT_FAILED',
    to: 'APPROVED', // returns to approved state for retry
  },
];

const TERMINAL_STATES: ReadonlySet<TransactionState> = new Set([
  'COMPLETED',
  'CANCELLED',
  'REJECTED',
]);

/**
 * Validates state transition according to KASBARENG FSM rules and invariants.
 * Pure function: deterministic, zero side-effects.
 */
export function validateTransition(input: TransitionInput): TransitionResult {
  const { currentState, event, context } = input;

  // 1. Terminal state check
  if (TERMINAL_STATES.has(currentState)) {
    return {
      allowed: false,
      currentState,
      errorCode: 'TERMINAL_STATE',
      errorMessage: `Cannot transition from terminal state ${currentState}.`,
    };
  }

  // 2. Concurrency / Version check
  if (
    context?.expectedVersion !== undefined &&
    context?.currentVersion !== undefined &&
    context.expectedVersion !== context.currentVersion
  ) {
    return {
      allowed: false,
      currentState,
      errorCode: 'VERSION_MISMATCH',
      errorMessage: `Version mismatch: current is ${context.currentVersion}, expected ${context.expectedVersion}.`,
    };
  }

  // 3. Find matching transition
  const rule = TRANSITION_RULES.find(
    (r) => r.from === currentState && r.event === event
  );

  if (!rule) {
    return {
      allowed: false,
      currentState,
      errorCode: 'INVALID_STATE_TRANSITION',
      errorMessage: `Invalid state transition: from ${currentState} via event ${event}.`,
    };
  }

  // 4. Evaluate guard
  if (rule.guard) {
    const guardResult = rule.guard(context);
    if (!guardResult.ok) {
      return {
        allowed: false,
        currentState,
        errorCode: guardResult.errorCode,
        errorMessage: guardResult.errorMsg,
      };
    }
  }

  // 5. Success
  return {
    allowed: true,
    currentState,
    nextState: rule.to,
  };
}
