import {
  normalizeEditalPlan,
  type EditalAssunto,
  type EditalTopico,
} from '../../domain/services/edital-plan';
import { findOrCreateNode, tryCreateEdge } from '../graph-write-helpers';
import type { GraphNameIndexRepository } from '../../domain/ports/graph-name-index-repository';
import type { GraphNodeWriter } from '../../domain/ports/graph-node-writer';
import type { GraphEdgeWriter } from '../../domain/ports/graph-edge-writer';

export interface BuildEditalResult {
  assuntos: number;
  topicos: number;
  conceitos: number;
  // Node ids of every concept touched (created + reused), so the caller can link
  // the EDITAL node to them (COBRE edges).
  conceitoNodeIds: string[];
}

interface Ctx {
  userId: string;
  grafoId: string;
  nameIndex: Map<string, string>;
}

/**
 * Persists an edital plan into the graph, mirroring its hierarchy (disciplina→
 * ASSUNTO, tópico→TÓPICO, subitem→CONCEITO with PERTENCE_A edges). Reuses existing
 * nodes by name, so only the missing ones are created — the counts are the new
 * nodes added. Structure only (no notas/flashcards).
 * @example buildGraphFromEdital.execute('u1', 'g1', plan)
 */
export class BuildGraphFromEditalUseCase {
  constructor(
    private readonly names: GraphNameIndexRepository,
    private readonly nodeWriter: GraphNodeWriter,
    private readonly edgeWriter: GraphEdgeWriter,
  ) {}

  async execute(userId: string, grafoId: string, rawPlan: unknown): Promise<BuildEditalResult> {
    const plan = normalizeEditalPlan(rawPlan);
    const { nameIndex } = await this.names.loadNameIndex(userId, grafoId);
    const ctx: Ctx = { userId, grafoId, nameIndex };
    const acc: BuildEditalResult = { assuntos: 0, topicos: 0, conceitos: 0, conceitoNodeIds: [] };
    for (const assunto of plan.assuntos) await this.addAssunto(ctx, assunto, acc);
    return acc;
  }

  private async addAssunto(
    ctx: Ctx,
    assunto: EditalAssunto,
    acc: BuildEditalResult,
  ): Promise<void> {
    const node = await this.findOrCreate(ctx, 'ASSUNTO', assunto.nome);
    if (node.created) acc.assuntos++;
    for (const topico of assunto.topicos) await this.addTopico(ctx, node.nodeId, topico, acc);
  }

  private async addTopico(
    ctx: Ctx,
    assuntoId: string,
    topico: EditalTopico,
    acc: BuildEditalResult,
  ): Promise<void> {
    const node = await this.findOrCreate(ctx, 'TOPICO', topico.nome);
    if (node.created) acc.topicos++;
    await this.edge(ctx, node.nodeId, assuntoId);
    for (const nome of topico.conceitos) await this.addConceito(ctx, node.nodeId, nome, acc);
  }

  private async addConceito(
    ctx: Ctx,
    topicoId: string,
    nome: string,
    acc: BuildEditalResult,
  ): Promise<void> {
    const node = await this.findOrCreate(ctx, 'CONCEITO', nome);
    if (node.created) acc.conceitos++;
    acc.conceitoNodeIds.push(node.nodeId);
    await this.edge(ctx, node.nodeId, topicoId);
  }

  private findOrCreate(
    ctx: Ctx,
    tipoNode: string,
    nome: string,
  ): Promise<{ nodeId: string; created: boolean }> {
    return findOrCreateNode(
      this.nodeWriter,
      ctx.nameIndex,
      ctx.userId,
      ctx.grafoId,
      tipoNode,
      nome,
    );
  }

  private edge(ctx: Ctx, sourceNodeId: string, targetNodeId: string): Promise<void> {
    return tryCreateEdge(this.edgeWriter, ctx.userId, ctx.grafoId, {
      sourceNodeId,
      targetNodeId,
      tipoRelacao: 'PERTENCE_A',
    });
  }
}
