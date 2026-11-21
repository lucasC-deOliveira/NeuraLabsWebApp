import type { AccountStorageUsage } from '../../../../../../contracts/account-storage';

export interface AccountStorageQuery {
  measure(userId: string): Promise<AccountStorageUsage>;
}

export const ACCOUNT_STORAGE_QUERY = Symbol('ACCOUNT_STORAGE_QUERY');
