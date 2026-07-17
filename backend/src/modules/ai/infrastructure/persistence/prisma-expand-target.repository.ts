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
    return (await this.loadNamed(tipo, nodeId)) ?? this.loadText(tipo, nodeId);
  }

  // Structural entities carry a name + description directly (nome/descricao).
  private async loadNamed(tipo: string, nodeId: string): Promise<NameDesc | null> {
    const where = { id: nodeId };
    if (tipo === 'ASSUNTO') return named(await this.prisma.assunto.findFirst({ where }));
    if (tipo === 'TOPICO') return named(await this.prisma.topico.findFirst({ where }));
    if (tipo === 'CONCEITO') return named(await this.prisma.conceito.findFirst({ where }));
    return null;
  }

  // Content entities expose their text under different fields (título/conteúdo,
  // pergunta/resposta), so they map onto name/desc explicitly.
  private async loadText(tipo: string, nodeId: string): Promise<NameDesc> {
    const where = { id: nodeId };
    if (tipo === 'NOTA') {
      const n = await this.prisma.nota.findFirst({ where });
      return textNameDesc(n?.titulo, n?.conteudo);
    }
    if (tipo === 'FLASHCARD') {
      const f = await this.prisma.flashcard.findFirst({ where });
      return textNameDesc(f?.pergunta, f?.resposta);
    }
    return { nome: '', desc: '' };
  }
}

function textNameDesc(nome: string | null | undefined, desc: string | null | undefined): NameDesc {
  return { nome: nome ?? '', desc: (desc ?? '').slice(0, 2000) };
}

function named(entity: { nome: string; descricao: string | null } | null): NameDesc {
  return { nome: entity?.nome ?? '', desc: entity?.descricao ?? '' };
}
