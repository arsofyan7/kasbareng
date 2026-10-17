export type WalletRole = 'ADMIN' | 'PENGELOLA' | 'WARGA';

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