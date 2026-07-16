import { Injectable } from '@nestjs/common';
import { type TipoRelacao } from '@prisma/client';
import { PrismaService } from '../../../../prisma/prisma.service';
import type { CompletenessRepository } from '../../domain/ports/completeness-repository';
import type { AssessmentContextData, NamedEntity } from '../../domain/services/assessment-context';
import { loadStructuralNodes, type StructuralNode, type StructuralTipo } from './structural-nodes';
import { edgesOfGraph } from '../../../graph/infrastructure/persistence/node-containment';

const byTipo = (nodes: StructuralNode[], tipo: StructuralTipo): NamedEntity[] =>
  nodes.filter((n) => n.tipo === tipo).map((n) => ({ id: n.id, nome: n.nome }));

@Injectable()
export class PrismaCompletenessRepository implements CompletenessRepository {
  constructor(private readonly prisma: PrismaService) {}

  async loadAssessmentData(userId: string, grafoId: string): Promise<AssessmentContextData> {
    const [structural, ncNodes, pertenceEdges] = await Promise.all([
      loadStructuralNodes(this.prisma, userId, grafoId),
      this.prisma.nodeConhecimento.findMany({
        where: { usuarioId: userId, contidoEm: { some: { grafoId } } },
        select: { id: true, tipoNode: true, referenciaId: true },
      }),
      this.prisma.conhecimentoAresta.findMany({
        where: { tipoRelacao: 'PERTENCE_A' as TipoRelacao, ...edgesOfGraph(grafoId) },
        select: { nodeOrigemId: true, nodeDestinoId: true },
      }),
    ]);
    return {
      assuntos: byTipo(structural, 'ASSUNTO'),
      topicos: byTipo(structural, 'TOPICO'),
      conceitos: byTipo(structural, 'CONCEITO'),
      ncNodes,
      pertenceEdges,
    };
  }
}
