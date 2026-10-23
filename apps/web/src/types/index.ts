export type WalletRole = 'ADMIN' | 'PENGELOLA' | 'WARGA';

export type TransactionType = 'INCOME' | 'EXPENSE';

export type TransactionState =
  | 'DRAFT'
  | 'SUBMITTED'
  | 'PENDING_APPROVAL'
  | 'NEEDS_CLARIFICATION'
  | 'REJECTED'
  | 'APPROVED'
  | 'PAYMENT_PENDING'
  | 'PAYMENT_VERIFICATION'
  | 'COMPLETED'
  | 'DISPUTED'
  | 'CANCELLED';

export interface User {
  id: string;
  fullName: string;
  email: string;
  status: 'ACTIVE' | 'INACTIVE';
  createdAt?: string;
}

export interface Wallet {
  id: string;
  name: string;
  description?: string | null;
  currency: string;
  inviteCode?: string;
  status: 'ACTIVE' | 'ARCHIVED';
  myRole: WalletRole;
  memberCount: number;
  transactionCount: number;
  requiredApprovals: number;
  joinedAt?: string;
  version?: number;
  duesType?: DuesType;
  duesAmount?: number | null;
  targetInstallmentsCount?: number | null;
}

export interface WalletPreview {
  id: string;
  name: string;
  description?: string | null;
  currency: string;
  memberCount: number;
  inviteCode: string;
  createdAt?: string;
}

export interface WalletMember {
  id: string;
  userId: string;
  fullName: string;
  email: string;
  role: WalletRole;
  status: 'ACTIVE' | 'INACTIVE';
  joinedAt: string;
}

export type ApprovalDecision = 'APPROVE' | 'REJECT';

export interface TransactionApproval {
  id: string;
  transactionId: string;
  approverId: string;
  decision: ApprovalDecision;
  transactionVersion: number;
  policyVersion: number;
  signedAt: string;
  approver?: {
    id: string;
    fullName: string;
    email: string;
  };
}

export interface PaymentRecord {
  id: string;
  transactionId: string;
  paymentStatus: 'PENDING' | 'PAID' | 'VERIFIED' | 'REJECTED';
  paymentReference?: string | null;
  evidenceAttachmentId?: string | null;
  verifiedBy?: string | null;
  verifiedAt?: string | null;
  createdAt: string;
}

export interface ApprovalPolicy {
  id: string;
  walletId: string;
  requiredApprovals: number;
  thresholdAmount?: number | null;
  policyVersion: number;
  status: 'ACTIVE' | 'ARCHIVED';
  createdAt?: string;
}

export interface Transaction {
  id: string;
  walletId: string;
  creatorId: string;
  type: TransactionType;
  amount: number;
  currency: string;
  category: string;
  notes?: string | null;
  receiptAttachmentId?: string | null;
  state: TransactionState;
  version: number;
  createdAt: string;
  creator?: {
    id: string;
    fullName: string;
    email: string;
  };
  approvalsCount?: number;
  eventsCount?: number;
  approvals?: TransactionApproval[];
  paymentRecords?: PaymentRecord[];
  wallet?: {
    id: string;
    name: string;
    currency: string;
    approvalPolicies?: ApprovalPolicy[];
  };
  events?: Array<{
    id: string;
    eventType: string;
    fromState: string | null;
    toState: string;
    transactionVersion: number;
    createdAt: string;
    metadata?: any;
    actor?: {
      id: string;
      fullName: string;
      email: string;
    };
  }>;
}

export interface WalletSummary {
  walletId: string;
  currency: string;
  postedBalance: number;
  availableBalance: number;
  activeReservations: number;
  postedCreditTotal: number;
  postedDebitTotal: number;
  isValid: boolean;
}

export interface AuditLog {
  id: string;
  walletId: string;
  sequenceNo: number;
  eventId: string;
  payloadHash: string;
  previousHash: string;
  currentHash: string;
  createdAt: string;
  payload?: any;
}

export interface AuditVerificationResult {
  valid: boolean;
  totalEvents: number;
  walletId: string;
  latestSequenceNo: number;
  latestCurrentHash: string;
  verifiedAt: string;
  failedIndex?: number;
  failedSequenceNo?: number;
  errorCode?: string;
  errorMessage?: string;
}

export interface ApiResponse<T> {
  data: T | null;
  meta: {
    request_id: string;
    timestamp?: string;
    [key: string]: unknown;
  };
  error: {
    code: string;
    message: string;
    details?: unknown;
  } | null;
}

export type MovementDirection = 'CREDIT' | 'DEBIT';
export type ReconciliationStatus = 'MATCHED' | 'AMBIGUOUS' | 'UNMATCHED' | 'DUPLICATE_POTENTIAL';

export interface BankStatementItem {
  id: string;
  sourceRowNumber: number;
  transactionDate: string;
  amount: number;
  direction: MovementDirection;
  description: string;
  externalReference: string | null;
  matchStatus: ReconciliationStatus;
  ruleCode: string;
  transactionId: string | null;
  transaction?: {
    id: string;
    category: string;
    amount: number;
    type: TransactionType;
    state: TransactionState;
    creatorName?: string;
    reference?: string;
  } | null;
  candidateTransactions?: Array<{
    id: string;
    category: string;
    amount: number;
    type: TransactionType;
    createdAt: string;
    reference?: string;
  }>;
}

export interface UnmatchedInternalTransaction {
  id: string;
  category: string;
  amount: number;
  type: TransactionType;
  state: TransactionState;
  createdAt: string;
  notes?: string | null;
  reference: string;
}

export interface ReconciliationSummary {
  importBatchId?: string;
  totalBankMutations: number;
  matchedCount: number;
  ambiguousCount: number;
  unmatchedBankCount: number;
  unmatchedInternalCount: number;
  duplicateAlertsCount: number;
  precisionAutoMatchPercent: number;
  bankStatements: BankStatementItem[];
  unmatchedInternalTransactions: UnmatchedInternalTransaction[];
}

export type DuesType = 'MONTHLY' | 'TARGET_INSTALLMENTS' | 'FREEFORM';
export type DuesPaymentStatus = 'PENDING' | 'PAID' | 'CANCELLED';

export interface DuesPeriod {
  key: string;
  label: string;
  shortLabel: string;
  monthNumber?: number;
  year?: number;
}

export interface DuesBoardMemberRow {
  userId: string;
  fullName: string;
  email: string;
  role: string;
  records: Record<
    string,
    {
      id: string;
      status: DuesPaymentStatus;
      amount: number;
      transactionId: string | null;
      receiptAttachmentId: string | null;
      updatedAt: string;
    }
  >;
  totalPaidAmount: number;
  paidCount: number;
  pendingCount: number;
  unpaidCount: number;
  isFullyPaid: boolean;
}

export interface DuesBoardSummary {
  walletId: string;
  walletName: string;
  duesType: DuesType;
  duesAmount: number | null;
  targetInstallmentsCount: number | null;
  selectedYear: number;
  totalMembers: number;
  totalCollected: number;
  totalPending: number;
  totalTargetPotential: number;
  complianceRatePercent: number;
  unpaidMembers: {
    userId: string;
    fullName: string;
    unpaidPeriods: string[];
  }[];
  whatsappReminderText: string;
}

export interface DuesBoardResult {
  periods: DuesPeriod[];
  members: DuesBoardMemberRow[];
  summary: DuesBoardSummary;
}


