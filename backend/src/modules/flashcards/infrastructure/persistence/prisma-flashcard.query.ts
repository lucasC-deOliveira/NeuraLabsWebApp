import { Injectable } from '@nestjs/common';
import { Prisma, TipoNode } from '@prisma/client';
import { PrismaService } from '../../../../prisma/prisma.service';
import type { FlashcardQuery } from '../../domain/ports/flashcard-query';
import type {
  ConceptTag,
  FlashcardView,
  ListFlashcardsOptions,
  SpacedRepetition,
} from '../../domain/flashcard-views';
import {
  flashcardEdgePairs,
  conceptTagsByFlashcard,
} from '../../domain/services/connected-concepts';

const INCLUDE = {
  conceito: { include: { topico: { include: { assunto: true } } } },
  aprendizado: { take: 1, orderBy: { ultimaRevisao: 'desc' } },
} satisfies Prisma.FlashcardInclude;

type Row = Prisma.FlashcardGetPayload<{ include: typeof INCLUDE }>;

const CONCEPT_INCLUDE = { topico: { include: { assunto: true } } } satisfies Prisma.ConceitoInclude;
type ConceitoRow = Prisma.ConceitoGetPayload<{ include: typeof CONCEPT_INCLUDE }>;

@Injectable()
export class PrismaFlashcardQuery implements FlashcardQuery {
  constructor(private readonly prisma: PrismaService) {}

  async listFlashcards(userId: string, opts: ListFlashcardsOptions): Promise<FlashcardView[]> {
    const rows = await this.prisma.flashcard.findMany({
      where: buildWhere(userId, opts),
      include: INCLUDE,
      orderBy: { dataCriacao: 'desc' },
    });
    const connected = await this.connectedConcepts(
      userId,
      rows.map((r) => r.id),
    );
    return rows.map((r) => ({ ...toView(r), conceitosConectados: connected.get(r.id) ?? [] }));
  }

  // Conceitos ligados a cada flashcard via arestas do grafo (nó FLASHCARD → nó CONCEITO).
  private async connectedConcepts(
    userId: string,
    flashcardIds: string[],
  ): Promise<Map<string, ConceptTag[]>> {
    if (flashcardIds.length === 0) return new Map();
    const nodeToFlashcard = await this.flashcardNodes(userId, flashcardIds);
    if (nodeToFlashcard.size === 0) return new Map();
    const edges = await this.incidentEdges([...nodeToFlashcard.keys()]);
    const pairs = flashcardEdgePairs(edges, new Set(nodeToFlashcard.keys()));
    const conceptNodeToId = await this.conceptNodes(
      userId,
      pairs.map((p) => p.other),
    );
    const tagByConcept = await this.conceptTags(userId, [...new Set(conceptNodeToId.values())]);
    return conceptTagsByFlashcard(pairs, nodeToFlashcard, conceptNodeToId, tagByConcept);
  }

  // Nós FLASHCARD do usuário para os flashcards dados → mapa nodeId → flashcardId.
  private async flashcardNodes(userId: string, ids: string[]): Promise<Map<string, string>> {
    const nodes = await this.prisma.nodeConhecimento.findMany({
      where: { usuarioId: userId, tipoNode: TipoNode.FLASHCARD, referenciaId: { in: ids } },
      select: { id: true, referenciaId: true },
    });
    return new Map(nodes.map((n) => [n.id, n.referenciaId]));
  }

  private async incidentEdges(
    nodeIds: string[],
  ): Promise<{ nodeOrigemId: string | null; nodeDestinoId: string | null }[]> {
    return this.prisma.conhecimentoAresta.findMany({
      where: { OR: [{ nodeOrigemId: { in: nodeIds } }, { nodeDestinoId: { in: nodeIds } }] },
      select: { nodeOrigemId: true, nodeDestinoId: true },
    });
  }

  // Entre os nós do outro lado das arestas, os que são CONCEITO → mapa nodeId → conceitoId.
  private async conceptNodes(userId: string, nodeIds: string[]): Promise<Map<string, string>> {
    if (nodeIds.length === 0) return new Map();
    const nodes = await this.prisma.nodeConhecimento.findMany({
      where: { usuarioId: userId, tipoNode: TipoNode.CONCEITO, id: { in: nodeIds } },
      select: { id: true, referenciaId: true },
    });
    return new Map(nodes.map((n) => [n.id, n.referenciaId]));
  }

  // Resolve cada conceito para sua tag (nome + tópico/assunto pais).
  private async conceptTags(userId: string, ids: string[]): Promise<Map<string, ConceptTag>> {
    if (ids.length === 0) return new Map();
    const conceitos = await this.prisma.conceito.findMany({
      where: { usuarioId: userId, id: { in: ids } },
      include: CONCEPT_INCLUDE,
    });
    return new Map(conceitos.map((c) => [c.id, conceptTagOf(c)]));
  }
}

function conceptTagOf(c: ConceitoRow): ConceptTag {
  const topico = c.topico;
  const assunto = topico?.assunto;
  return {
    conceito: c.nome,
    topico: orEmpty(topico?.nome),
    topicoId: orEmpty(topico?.id),
    assunto: orEmpty(assunto?.nome),
    assuntoId: orEmpty(assunto?.id),
  };
}

function buildWhere(userId: string, opts: ListFlashcardsOptions): Prisma.FlashcardWhereInput {
  const where: Prisma.FlashcardWhereInput = { usuarioId: userId };
  if (opts.conceptId) where.conceitoId = opts.conceptId;
  if (opts.topicId) where.conceito = { topicoId: opts.topicId };
  return where;
}

interface Hierarchy {
  conceito: string;
  topico: string;
  topicoId: string;
  assunto: string;
  assuntoId: string;
}

const orEmpty = (v: string | undefined): string => v ?? '';

function hierarchyOf(fc: Row): Hierarchy {
  const topico = fc.conceito?.topico;
  const assunto = topico?.assunto;
  return {
    conceito: orEmpty(fc.conceito?.nome),
    topico: orEmpty(topico?.nome),
    topicoId: orEmpty(topico?.id),
    assunto: orEmpty(assunto?.nome),
    assuntoId: orEmpty(assunto?.id),
  };
}

function toView(fc: Row): Omit<FlashcardView, 'conceitosConectados'> {
  return {
    id: fc.id,
    tipo: fc.tipo ?? null,
    pergunta: fc.pergunta,
    resposta: fc.resposta,
    ...hierarchyOf(fc),
    dataCriacao: fc.dataCriacao,
    spacedRepetition: toSrs(fc.aprendizado[0]),
  };
}

function toSrs(a: Row['aprendizado'][number] | undefined): SpacedRepetition | null {
  if (!a) return null;
  return {
    dificuldade: a.dificuldade,
    intervalo: a.intervalo,
    proximaRevisao: a.proximaRevisao,
    ultimaRevisao: a.ultimaRevisao,
    estagioAprendizado: a.estagioAprendizado,
  };
}
