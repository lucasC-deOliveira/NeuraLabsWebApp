import { Injectable } from '@nestjs/common';
import { TipoNode } from '@prisma/client';
import { PrismaService } from '../../../../prisma/prisma.service';
import type {
  FeynmanAlvoTipo,
  FeynmanContextSource,
  FeynmanTargetContext,
} from '../../domain/ports/feynman-context-source';

interface TargetBase {
  nome: string;
  descricao: string;
}

// Carrega o contexto do alvo (conceito/flashcard) + os conceitos vizinhos no grafo,
// que servem de candidatos para a IA mapear as lacunas. Material fica para depois.
@Injectable()
export class PrismaFeynmanContextSource implements FeynmanContextSource {
  constructor(private readonly prisma: PrismaService) {}

  async load(
    userId: string,
    tipo: FeynmanAlvoTipo,
    id: string,
  ): Promise<FeynmanTargetContext | null> {
    const base =
      tipo === 'CONCEITO' ? await this.conceito(userId, id) : await this.flashcard(userId, id);
    if (!base) return null;
    const candidatos = await this.neighborConcepts(userId, tipo, id);
    return { ...base, material: [], candidatos };
  }

  private async conceito(userId: string, id: string): Promise<TargetBase | null> {
    const c = await this.prisma.conceito.findFirst({
      where: { id, usuarioId: userId },
      select: { nome: true, descricao: true },
    });
    return c ? { nome: c.nome, descricao: c.descricao ?? '' } : null;
  }

  private async flashcard(userId: string, id: string): Promise<TargetBase | null> {
    const f = await this.prisma.flashcard.findFirst({
      where: { id, usuarioId: userId },
      select: { pergunta: true, resposta: true },
    });
    return f ? { nome: f.pergunta, descricao: f.resposta } : null;
  }

  // Conceitos ligados ao alvo no grafo (1 salto) → candidatos para as lacunas.
  private async neighborConcepts(
    userId: string,
    tipo: FeynmanAlvoTipo,
    refId: string,
  ): Promise<{ id: string; nome: string }[]> {
    const node = await this.prisma.nodeConhecimento.findFirst({
      where: { usuarioId: userId, tipoNode: tipo as TipoNode, referenciaId: refId },
      select: { id: true },
    });
    if (!node) return [];
    const edges = await this.prisma.conhecimentoAresta.findMany({
      where: { OR: [{ nodeOrigemId: node.id }, { nodeDestinoId: node.id }] },
      select: { nodeOrigemId: true, nodeDestinoId: true },
    });
    const neighborIds = edges
      .flatMap((e) => [e.nodeOrigemId, e.nodeDestinoId])
      .filter((x): x is string => Boolean(x) && x !== node.id);
    return this.conceptsOfNodes(userId, neighborIds);
  }

  private async conceptsOfNodes(
    userId: string,
    nodeIds: string[],
  ): Promise<{ id: string; nome: string }[]> {
    if (nodeIds.length === 0) return [];
    const nodes = await this.prisma.nodeConhecimento.findMany({
      where: { id: { in: nodeIds }, tipoNode: TipoNode.CONCEITO },
      select: { referenciaId: true },
    });
    const ids = [...new Set(nodes.map((n) => n.referenciaId))];
    if (ids.length === 0) return [];
    return this.prisma.conceito.findMany({
      where: { usuarioId: userId, id: { in: ids } },
      select: { id: true, nome: true },
    });
  }
}
