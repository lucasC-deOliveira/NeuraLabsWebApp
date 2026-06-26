import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../prisma/prisma.service';
import { runImportGraph, type ImportGraphPayload } from '../../../../graph/graph-import';
import type {
  GraphImportRepository,
  ImportResult,
} from '../../domain/ports/graph-import-repository';

// ACL over the legacy runImportGraph (name-reuse import lives in src/graph).
@Injectable()
export class PrismaGraphImportRepository implements GraphImportRepository {
  constructor(private readonly prisma: PrismaService) {}

  importFromJson(userId: string, grafoId: string, payload: unknown): Promise<ImportResult> {
    return runImportGraph(this.prisma, userId, grafoId, payload as ImportGraphPayload);
  }
}
