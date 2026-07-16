import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../prisma/prisma.service';
import type {
  ExpandTarget,
  ExpandTargetRepository,
} from '../../domain/ports/expand-target-repository';

type NameDesc = { nome: string; desc: string };

@Injectable()
export class PrismaExpandTargetRepository implements ExpandTargetRepository {
  constructor(private readonly prisma: PrismaService) {}

  async loadExpandTarget(
    userId: string,
    grafoId: string,
    nodeId: string,
  ): Promise<ExpandTarget | null> {
    const inGraph = await this.prisma.nodeConhecimento.findFirst({
      where: { usuarioId: userId, referenciaId: nodeId, contidoEm: { some: { grafoId } } },
      select: { tipoNode: true },
    });
    if (!inGraph) return null;
    const { nome, desc } = await this.loadEntity(inGraph.tipoNode, nodeId);
    return { tipo: inGraph.tipoNode, nome, desc };
  }

  private async loadEntity(tipo: string, nodeId: string): Promise<NameDesc> {
    if (tipo === 'ASSUNTO')
      return named(await this.prisma.assunto.findFirst({ where: { id: nodeId } }));
    if (tipo === 'TOPICO')
      return named(await this.prisma.topico.findFirst({ where: { id: nodeId } }));
    if (tipo === 'CONCEITO')
      return named(await this.prisma.conceito.findFirst({ where: { id: nodeId } }));
    if (tipo === 'NOTA') {
      const n = await this.prisma.nota.findFirst({ where: { id: nodeId } });
      return { nome: n?.titulo ?? '', desc: (n?.conteudo ?? '').slice(0, 2000) };
    }
    return { nome: '', desc: '' };
  }
}

function named(entity: { nome: string; descricao: string | null } | null): NameDesc {
  return { nome: entity?.nome ?? '', desc: entity?.descricao ?? '' };
}
