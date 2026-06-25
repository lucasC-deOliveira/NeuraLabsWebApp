import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../prisma/prisma.service';
import type { RelationCandidatesRepository } from '../../domain/ports/relation-candidates-repository';
import type { RelationCandidate } from '../../domain/services/nota-relation-suggestions';
import { loadStructuralNodes } from './structural-nodes';

@Injectable()
export class PrismaRelationCandidatesRepository implements RelationCandidatesRepository {
  constructor(private readonly prisma: PrismaService) {}

  // A StructuralNode ({ id, tipo, nome, descricao }) is already a RelationCandidate.
  loadCandidates(userId: string, grafoId: string): Promise<RelationCandidate[]> {
    return loadStructuralNodes(this.prisma, userId, grafoId);
  }
}
