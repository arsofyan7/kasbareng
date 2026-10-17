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
  status: 'ACTIVE' | 'ARCHIVED';
  myRole: WalletRole;
  memberCount: number;
  transactionCount: number;
  requiredApprovals: number;
  joinedAt?: string;
  version?: number;
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