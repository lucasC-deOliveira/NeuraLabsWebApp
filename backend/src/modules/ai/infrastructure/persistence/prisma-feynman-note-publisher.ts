import { Injectable } from '@nestjs/common';
import { SubtipoNota, TipoNode, TipoRelacao } from '@prisma/client';
import { PrismaService } from '../../../../prisma/prisma.service';
import type {
  FeynmanNoteInput,
  FeynmanNotePublisher,
} from '../../domain/ports/feynman-note-publisher';
import { feynmanNoteFonte, feynmanNoteTitle } from '../../domain/services/feynman-note';
import { createContainedNode } from '../../../graph/infrastructure/persistence/node-containment';

// Desloca a nota do alvo para elas não nascerem sobrepostas no layout.
const POSITION_OFFSET = 60;

/**
 * Materializa uma explicação Feynman como NOTA no grafo: cria/atualiza a nota (uma por
 * alvo, marcada em `fonte`), a mostra nos MESMOS grafos onde o alvo aparece e liga a
 * aresta NOTA→CONCEITO (EXPLICA) ou FLASHCARD→NOTA (TESTA). Tudo idempotente.
 */
@Injectable()
export class PrismaFeynmanNotePublisher implements FeynmanNotePublisher {
  constructor(private readonly prisma: PrismaService) {}

  async publish(input: FeynmanNoteInput): Promise<void> {
    const targetNodeId = await this.targetNodeId(input);
    if (!targetNodeId) return; // alvo sem nó no grafo: nada onde renderizar.
    const notaId = await this.upsertNota(input);
    const notaNodeId = await this.attachToGraphs(input.userId, notaId, targetNodeId);
    await this.linkEdge(input.alvoTipo, targetNodeId, notaNodeId);
  }

  private async targetNodeId(input: FeynmanNoteInput): Promise<string | null> {
    const node = await this.prisma.nodeConhecimento.findFirst({
      where: {
        usuarioId: input.userId,
        tipoNode: input.alvoTipo as TipoNode,
        referenciaId: input.alvoId,
      },
      select: { id: true },
    });
    return node?.id ?? null;
  }

  private async targetLabel(input: FeynmanNoteInput): Promise<string> {
    if (input.alvoTipo === 'CONCEITO') {
      const c = await this.prisma.conceito.findUnique({
        where: { id: input.alvoId },
        select: { nome: true },
      });
      return c?.nome ?? 'conceito';
    }
    const f = await this.prisma.flashcard.findUnique({
      where: { id: input.alvoId },
      select: { pergunta: true },
    });
    return f?.pergunta ?? 'flashcard';
  }

  private async upsertNota(input: FeynmanNoteInput): Promise<string> {
    const fonte = feynmanNoteFonte(input.alvoTipo, input.alvoId);
    const titulo = feynmanNoteTitle(await this.targetLabel(input));
    const shared = { titulo, conteudo: input.texto, subtipo: SubtipoNota.EXPLICACAO };
    const existing = await this.prisma.nota.findFirst({
      where: { usuarioId: input.userId, fonte },
      select: { id: true },
    });
    if (existing) {
      await this.prisma.nota.update({ where: { id: existing.id }, data: shared });
      return existing.id;
    }
    const nota = await this.prisma.nota.create({
      data: { ...shared, fonte, tipoNota: 'PERMANENTE', usuarioId: input.userId },
    });
    return nota.id;
  }

  // Cria o nó da nota e o faz conter em cada grafo que já mostra o alvo, para a nota
  // aparecer exatamente onde o conceito/flashcard aparece.
  private async attachToGraphs(
    userId: string,
    notaId: string,
    targetNodeId: string,
  ): Promise<string> {
    let notaNodeId = await this.ensureNotaNode(userId, notaId);
    const placements = await this.prisma.grafoNode.findMany({
      where: { nodeId: targetNodeId },
      select: { grafoId: true, posicaoX: true, posicaoY: true },
    });
    for (const p of placements) {
      notaNodeId = await this.containNota(userId, notaId, p);
    }
    return notaNodeId;
  }

  private containNota(
    userId: string,
    notaId: string,
    placement: { grafoId: string; posicaoX: number | null; posicaoY: number | null },
  ): Promise<string> {
    return createContainedNode(this.prisma, {
      usuarioId: userId,
      grafoId: placement.grafoId,
      tipoNode: TipoNode.NOTA,
      referenciaId: notaId,
      posicaoX: (placement.posicaoX ?? 0) + POSITION_OFFSET,
      posicaoY: (placement.posicaoY ?? 0) + POSITION_OFFSET,
    });
  }

  // Garante o nó da nota mesmo quando o alvo não está contido em grafo nenhum: a
  // aresta ainda é um fato, e a nota aparece assim que o alvo entrar numa vista.
  private async ensureNotaNode(userId: string, notaId: string): Promise<string> {
    const node = await this.prisma.nodeConhecimento.upsert({
      where: {
        _node_unique: { usuarioId: userId, tipoNode: TipoNode.NOTA, referenciaId: notaId },
      },
      create: { usuarioId: userId, tipoNode: TipoNode.NOTA, referenciaId: notaId },
      update: {},
      select: { id: true },
    });
    return node.id;
  }

  private async linkEdge(
    alvoTipo: FeynmanNoteInput['alvoTipo'],
    targetNodeId: string,
    notaNodeId: string,
  ): Promise<void> {
    const [nodeOrigemId, nodeDestinoId, tipoRelacao] =
      alvoTipo === 'CONCEITO'
        ? [notaNodeId, targetNodeId, TipoRelacao.EXPLICA]
        : [targetNodeId, notaNodeId, TipoRelacao.TESTA];
    await this.prisma.conhecimentoAresta.upsert({
      where: { _edge_uk: { nodeOrigemId, nodeDestinoId, tipoRelacao } },
      create: { nodeOrigemId, nodeDestinoId, tipoRelacao },
      update: {},
    });
  }
}
