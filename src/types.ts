export type TransactionType = 'JAMA' | 'UDHAR';
export type PaymentMethod = 'CASH' | 'UPI' | 'KHATA';

export interface UserProfile {
  uid: string;
  email: string;
  displayName?: string;
  photoURL?: string;
  activeLedgerId?: string;
  createdAt: string;
}

export interface LedgerWorkspace {
  id: string;
  name: string;
  createdById: string;
  createdByEmail?: string;
  createdAt: string;
}

export interface LedgerMember {
  uid: string;
  email: string;
  displayName?: string;
  role: 'owner' | 'staff';
  joinedAt: string;
}

export interface LedgerTransaction {
  id: string;
  type: TransactionType;
  amount: number;
  paymentMethod: PaymentMethod;
  remarks: string;
  category?: string;
  notes?: string;
  createdById: string;
  createdByEmail?: string;
  createdByDisplayName?: string;
  createdAt: string;
}

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}
