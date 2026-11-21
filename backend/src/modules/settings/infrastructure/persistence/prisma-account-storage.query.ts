import { Injectable } from '@nestjs/common';
import type {
  AccountStorageCategory,
  AccountStorageUsage,
} from '../../../../../../contracts/account-storage';
import { PrismaService } from '../../../../prisma/prisma.service';
import type { AccountStorageQuery } from '../../domain/ports/account-storage-query';
import { accountStorageSql } from './account-storage.sql';

interface CategoryBytes {
  category: AccountStorageCategory;
  bytes: bigint;
}

@Injectable()
export class PrismaAccountStorageQuery implements AccountStorageQuery {
  constructor(private readonly prisma: PrismaService) {}

  /** Aggregates the account's logical data size without returning any stored content.
   * @example await query.measure(signedInUserId)
   */
  async measure(userId: string): Promise<AccountStorageUsage> {
    const rows = await this.prisma.$queryRaw<CategoryBytes[]>(accountStorageSql(userId));
    const categories = rows.map(({ category, bytes }) => ({ category, bytes: Number(bytes) }));
    const totalBytes = categories.reduce((sum, entry) => sum + entry.bytes, 0);
    return { totalBytes, categories };
  }
}
