import { BaralhoNotFoundError, GraphNotFoundError } from '../../domain/errors';
import { findOrCreateNodeSafe, tryCreateEdge } from '../graph-write-helpers';
import { nodeNameKey } from '../../domain/services/node-name-key';
import type {
  ClassificationConcept,
  ClassificationPlan,
} from '../../domain/services/classification-plan';
import type { PlanAssunto, PlanTopico } from '../../domain/services/population-plan';
import type { DeckClassificationRepository } from '../../domain/ports/deck-classification-repository';
import type { GraphNameIndexRepository } from '../../domain/ports/graph-name-index-repository';
import type { GraphNodeWriter } from '../../domain/ports/graph-node-writer';
import type { GraphNodeAttacher } from '../../domain/ports/graph-node-attacher';
import type { GraphEdgeWriter } from '../../domain/ports/graph-edge-writer';

export interface ApplyClassificationResult {
  assuntos: number;
  topicos: number;
  conceitos: number;
  linkedCards: number;
}

interface Ctx {
  userId: string;
  grafoId: string;
  nameIndex: Map<string, string>;
  validCardIds: Set<string>;
  linkedCardIds: Set<string>;
}

/**
 * Persists ONE reviewed classification chunk: creates/reuses the structural
 * hierarchy and wires card→concept DEFINE edges, attaching each card's node to
 * the graph when it does not exist yet (the gap that kept 97% of the acervo
 * unclassified). Card ids outside the deck are ignored (untrusted plan input).
 * @example apply.execute('u1', 'g1', 'deck1', plan)
 */
export class ApplyDeckClassificationChunkUseCase {
  constructor(
    private readonly repo: DeckClassificationRepository,
    private readonly names: GraphNameIndexRepository,
    private readonly nodeWriter: GraphNodeWriter,
    private readonly attacher: GraphNodeAttacher,
    private readonly edgeWriter: GraphEdgeWriter,
  ) {}

  async execute(
    userId: string,
    grafoId: string,
    baralhoId: string,
    plan: ClassificationPlan,
  ): Promise<ApplyClassificationResult> {
    const ctx = await this.buildCtx(userId, grafoId, baralhoId);
    const counts = { assuntos: 0, topicos: 0, conceitos: 0 };
    for (const a of plan.assuntos) if (await this.addAssunto(ctx, a)) counts.assuntos++;
    for (const t of plan.topicos) if (await this.addTopico(ctx, t)) counts.topicos++;
    for (const c of plan.conceitos) if (await this.addConceito(ctx, c)) counts.conceitos++;
    return { ...counts, linkedCards: ctx.linkedCardIds.size };
  }

  private async buildCtx(userId: string, grafoId: string, baralhoId: string): Promise<Ctx> {
    if (!(await this.repo.graphExists(userId, grafoId))) throw new GraphNotFoundError();
    const deck = await this.repo.loadDeck(userId, baralhoId);
    if (!deck) throw new BaralhoNotFoundError();
    const { nameIndex } = await this.names.loadNameIndex(userId, grafoId);
    const validCardIds = new Set(deck.cards.map((c) => c.id));
    return { userId, grafoId, nameIndex, validCardIds, linkedCardIds: new Set() };
  }

  private async addAssunto(ctx: Ctx, a: PlanAssunto): Promise<boolean> {
    if (!a.nome) return false;
    const res = await this.findOrCreate(ctx, 'ASSUNTO', a.nome, a.descricao);
    return res?.created ?? false;
  }

  private async addTopico(ctx: Ctx, t: PlanTopico): Promise<boolean> {
    if (!t.nome) return false;
    const res = await this.findOrCreate(ctx, 'TOPICO', t.nome, t.descricao);
    if (!res) return false;
    await this.linkByName(ctx, res.nodeId, nodeNameKey('ASSUNTO', t.assunto), 'PERTENCE_A');
    return res.created;
  }

  private async addConceito(ctx: Ctx, c: ClassificationConcept): Promise<boolean> {
    if (!c.nome) return false;
    const res = await this.findOrCreate(ctx, 'CONCEITO', c.nome, c.descricao);
    if (!res) return false;
    await this.linkByName(ctx, res.nodeId, nodeNameKey('TOPICO', c.topico), 'PERTENCE_A');
    for (const cardId of c.flashcardIds) await this.linkCard(ctx, res.nodeId, cardId);
    return res.created;
  }

  private async linkCard(ctx: Ctx, conceitoId: string, cardId: string): Promise<void> {
    if (!ctx.validCardIds.has(cardId)) return;
    await this.attacher.attachExisting(ctx.userId, ctx.grafoId, 'FLASHCARD', cardId);
    await tryCreateEdge(this.edgeWriter, ctx.userId, ctx.grafoId, {
      sourceNodeId: cardId,
      targetNodeId: conceitoId,
      tipoRelacao: 'DEFINE',
    });
    ctx.linkedCardIds.add(cardId);
  }

  private findOrCreate(
    ctx: Ctx,
    tipoNode: string,
    nome: string,
    descricao: string,
  ): Promise<{ nodeId: string; created: boolean } | null> {
    const { nameIndex, userId, grafoId } = ctx;
    return findOrCreateNodeSafe(
      this.nodeWriter,
      nameIndex,
      userId,
      grafoId,
      tipoNode,
      nome,
      descricao,
    );
  }

  private async linkByName(
    ctx: Ctx,
    sourceNodeId: string,
    key: string,
    tipoRelacao: string,
  ): Promise<void> {
    const targetNodeId = ctx.nameIndex.get(key);
    if (!targetNodeId) return;
    await tryCreateEdge(this.edgeWriter, ctx.userId, ctx.grafoId, {
      sourceNodeId,
      targetNodeId,
      tipoRelacao,
    });
  }
}
