import {
  normalizeGraphPlan,
  type GraphPlan,
  type PlanConceito,
  type PlanFlashcard,
  type PlanNota,
  type PlanTopico,
} from '../../domain/services/graph-plan';
import { createNodeSafe, tryCreateEdge } from '../graph-write-helpers';
import type { GraphNameIndexRepository } from '../../domain/ports/graph-name-index-repository';
import type { GraphNodeWriter, GraphNodeInput } from '../../domain/ports/graph-node-writer';
import type { GraphEdgeWriter } from '../../domain/ports/graph-edge-writer';
import type { GraphDeckWriter } from '../../domain/ports/graph-deck-writer';

export interface BuildGraphResult {
  assunto: string;
  topicos: number;
  conceitos: number;
  notas: number;
  flashcards: number;
  baralho: string | null;
}

interface Ctx {
  userId: string;
  grafoId: string;
  nameIndex: Map<string, string>;
}

interface Acc {
  topicos: number;
  conceitos: number;
  notas: number;
  flashcards: number;
  baralho: string | null;
  notaIds: string[];
  flashcardIds: string[];
}

/**
 * Persists a full graph plan (subject → topics → concepts → notes/flashcards),
 * reusing existing nodes by name, then a deck and the source TEXTO_BRUTO.
 * @example build.execute('u1', 'g1', rawText, plan, true)
 */
export class BuildGraphFromPlanUseCase {
  constructor(
    private readonly names: GraphNameIndexRepository,
    private readonly nodeWriter: GraphNodeWriter,
    private readonly edgeWriter: GraphEdgeWriter,
    private readonly deckWriter: GraphDeckWriter,
  ) {}

  async execute(
    userId: string,
    grafoId: string,
    rawText: string,
    rawPlan: unknown,
    saveBruto = true,
  ): Promise<BuildGraphResult> {
    const plan = normalizeGraphPlan(rawPlan);
    const { nameIndex } = await this.names.loadNameIndex(userId, grafoId);
    const ctx: Ctx = { userId, grafoId, nameIndex };
    const acc = newAcc();
    const assuntoId = await this.createRoot(ctx, plan.assunto);
    for (const t of plan.topicos) await this.addTopico(ctx, assuntoId, t, acc);
    await this.maybeCreateBaralho(ctx, plan, acc);
    await this.maybeSaveBruto(ctx, rawText, plan.assunto.nome, acc, saveBruto);
    return result(plan.assunto.nome, acc);
  }

  private async createRoot(
    ctx: Ctx,
    assunto: { nome: string; descricao: string },
  ): Promise<string> {
    const { nodeId } = await this.findOrCreate(ctx, 'ASSUNTO', assunto.nome, assunto.descricao);
    return nodeId;
  }

  private async addTopico(ctx: Ctx, assuntoId: string, t: PlanTopico, acc: Acc): Promise<void> {
    const topico = await this.findOrCreate(ctx, 'TOPICO', t.nome, t.descricao);
    if (topico.created) acc.topicos++;
    await this.tryEdge(ctx, topico.nodeId, assuntoId, 'PERTENCE_A');
    for (const c of t.conceitos) await this.addConceito(ctx, topico.nodeId, c, acc);
  }

  private async addConceito(ctx: Ctx, topicoId: string, c: PlanConceito, acc: Acc): Promise<void> {
    const conceito = await this.findOrCreate(ctx, 'CONCEITO', c.nome, c.descricao);
    if (conceito.created) acc.conceitos++;
    await this.tryEdge(ctx, conceito.nodeId, topicoId, 'PERTENCE_A');
    if (c.nota) await this.addNota(ctx, conceito.nodeId, c.nota, acc);
    for (const f of c.flashcards) await this.addFlashcard(ctx, conceito.nodeId, f, acc);
  }

  private async addNota(ctx: Ctx, conceitoId: string, nota: PlanNota, acc: Acc): Promise<void> {
    const id = await this.tryCreateNode(ctx, {
      tipoNode: 'NOTA',
      titulo: nota.titulo,
      conteudo: nota.conteudo,
      subtipo: 'EXPLICACAO',
      tipoNota: 'PERMANENTE',
    });
    if (!id) return;
    acc.notas++;
    acc.notaIds.push(id);
    await this.tryEdge(ctx, id, conceitoId, 'EXPLICA');
  }

  private async addFlashcard(
    ctx: Ctx,
    conceitoId: string,
    f: PlanFlashcard,
    acc: Acc,
  ): Promise<void> {
    const id = await this.tryCreateNode(ctx, {
      tipoNode: 'FLASHCARD',
      pergunta: f.pergunta,
      resposta: f.resposta,
    });
    if (!id) return;
    acc.flashcards++;
    acc.flashcardIds.push(id);
    await this.tryEdge(ctx, id, conceitoId, 'HERDA');
  }

  private async maybeCreateBaralho(ctx: Ctx, plan: GraphPlan, acc: Acc): Promise<void> {
    if (acc.flashcardIds.length === 0) return;
    acc.baralho = plan.baralho || plan.assunto.nome;
    try {
      await this.deckWriter.createBaralho(ctx.userId, ctx.grafoId, acc.baralho, acc.flashcardIds);
    } catch {
      // ignore deck creation failure
    }
  }

  private async maybeSaveBruto(
    ctx: Ctx,
    rawText: string,
    assuntoNome: string,
    acc: Acc,
    saveBruto: boolean,
  ): Promise<void> {
    if (!saveBruto || !rawText.trim()) return;
    const id = await this.tryCreateNode(ctx, {
      tipoNode: 'TEXTO_BRUTO',
      titulo: `Fonte: ${assuntoNome}`,
      texto: rawText.trim(),
    });
    if (!id) return;
    for (const notaId of acc.notaIds) await this.tryEdge(ctx, id, notaId, 'GERA');
  }

  // Structural nodes (ASSUNTO/TOPICO/CONCEITO) propagate creation failures.
  private async findOrCreate(
    ctx: Ctx,
    tipoNode: string,
    nome: string,
    descricao: string,
  ): Promise<{ nodeId: string; created: boolean }> {
    const key = `${tipoNode}|${nome.toLowerCase()}`;
    const existing = ctx.nameIndex.get(key);
    if (existing) return { nodeId: existing, created: false };
    const { nodeId } = await this.nodeWriter.createNode(ctx.userId, ctx.grafoId, {
      tipoNode,
      nome,
      descricao,
    });
    ctx.nameIndex.set(key, nodeId);
    return { nodeId, created: true };
  }

  private tryCreateNode(ctx: Ctx, input: GraphNodeInput): Promise<string | null> {
    return createNodeSafe(this.nodeWriter, ctx.userId, ctx.grafoId, input);
  }

  private tryEdge(
    ctx: Ctx,
    sourceNodeId: string,
    targetNodeId: string,
    tipoRelacao: string,
  ): Promise<void> {
    return tryCreateEdge(this.edgeWriter, ctx.userId, ctx.grafoId, {
      sourceNodeId,
      targetNodeId,
      tipoRelacao,
    });
  }
}

const newAcc = (): Acc => ({
  topicos: 0,
  conceitos: 0,
  notas: 0,
  flashcards: 0,
  baralho: null,
  notaIds: [],
  flashcardIds: [],
});

function result(assunto: string, acc: Acc): BuildGraphResult {
  return {
    assunto,
    topicos: acc.topicos,
    conceitos: acc.conceitos,
    notas: acc.notas,
    flashcards: acc.flashcards,
    baralho: acc.baralho,
  };
}
