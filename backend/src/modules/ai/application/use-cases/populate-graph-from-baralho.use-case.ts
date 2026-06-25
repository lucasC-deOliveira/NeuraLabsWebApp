import { BaralhoNotFoundError, EmptyBaralhoError, GraphNotFoundError } from '../../domain/errors';
import { parseAiJson } from '../../domain/services/ai-json';
import {
  normalizePopulationPlan,
  type PlanAssunto,
  type PlanConceito,
  type PlanTopico,
  type PopulationPlan,
} from '../../domain/services/population-plan';
import type {
  BaralhoForPopulation,
  BaralhoPopulationRepository,
} from '../../domain/ports/baralho-population-repository';
import type { GraphNameIndexRepository } from '../../domain/ports/graph-name-index-repository';
import type { GraphNodeWriter } from '../../domain/ports/graph-node-writer';
import type { GraphEdgeWriter } from '../../domain/ports/graph-edge-writer';
import type { LlmMessage, LlmPort } from '../../domain/ports/llm-port';

export interface PopulationResult {
  baralhoNome: string;
  assuntos: number;
  topicos: number;
  conceitos: number;
}

interface Ctx {
  userId: string;
  grafoId: string;
  nameIndex: Map<string, string>;
}

/**
 * Populates a graph from a deck: maps its flashcards to a subject→topic→concept
 * hierarchy via the model, creating/reusing nodes and wiring the edges.
 * @example populate.execute('u1', 'g1', 'deck1')
 */
export class PopulateGraphFromBaralhoUseCase {
  constructor(
    private readonly repo: BaralhoPopulationRepository,
    private readonly names: GraphNameIndexRepository,
    private readonly nodeWriter: GraphNodeWriter,
    private readonly edgeWriter: GraphEdgeWriter,
    private readonly llm: LlmPort,
  ) {}

  async execute(userId: string, grafoId: string, baralhoId: string): Promise<PopulationResult> {
    if (!(await this.repo.graphExists(userId, grafoId))) throw new GraphNotFoundError();
    const baralho = await this.repo.loadBaralho(userId, baralhoId);
    if (!baralho) throw new BaralhoNotFoundError();
    if (baralho.flashcards.length === 0) throw new EmptyBaralhoError();
    const indexToFcId = await this.indexFlashcards(grafoId, baralho);
    const { nameIndex, existingContext } = await this.names.loadNameIndex(userId, grafoId);
    const content = await this.llm.complete({
      userId,
      maxTokens: 8000,
      messages: buildMessages(baralho, existingContext),
    });
    const plan = normalizePopulationPlan(
      parseAiJson(content) as { assuntos?: unknown; topicos?: unknown; conceitos?: unknown },
    );
    const counts = await this.materialize({ userId, grafoId, nameIndex }, plan, indexToFcId);
    return { baralhoNome: baralho.titulo, ...counts };
  }

  private async indexFlashcards(
    grafoId: string,
    baralho: BaralhoForPopulation,
  ): Promise<Map<number, string | null>> {
    const refs = await this.repo.loadFlashcardNodeRefs(
      grafoId,
      baralho.flashcards.map((f) => f.id),
    );
    return new Map(baralho.flashcards.map((f, i) => [i, refs.has(f.id) ? f.id : null]));
  }

  private async materialize(
    ctx: Ctx,
    plan: PopulationPlan,
    indexToFcId: Map<number, string | null>,
  ): Promise<{ assuntos: number; topicos: number; conceitos: number }> {
    const counts = { assuntos: 0, topicos: 0, conceitos: 0 };
    for (const a of plan.assuntos) if (await this.addAssunto(ctx, a)) counts.assuntos++;
    for (const t of plan.topicos) if (await this.addTopico(ctx, t)) counts.topicos++;
    for (const c of plan.conceitos)
      if (await this.addConceito(ctx, c, indexToFcId)) counts.conceitos++;
    return counts;
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
    await this.linkByName(ctx, res.nodeId, `ASSUNTO|${t.assunto.toLowerCase()}`, 'PERTENCE_A');
    return res.created;
  }

  private async addConceito(
    ctx: Ctx,
    c: PlanConceito,
    indexToFcId: Map<number, string | null>,
  ): Promise<boolean> {
    if (!c.nome) return false;
    const res = await this.findOrCreate(ctx, 'CONCEITO', c.nome, c.descricao);
    if (!res) return false;
    await this.linkByName(ctx, res.nodeId, `TOPICO|${c.topico.toLowerCase()}`, 'PERTENCE_A');
    for (const idx of c.indices) await this.linkFlashcard(ctx, res.nodeId, indexToFcId.get(idx));
    return res.created;
  }

  private async linkByName(
    ctx: Ctx,
    sourceNodeId: string,
    key: string,
    tipoRelacao: string,
  ): Promise<void> {
    const target = ctx.nameIndex.get(key);
    if (target) await this.tryEdge(ctx, sourceNodeId, target, tipoRelacao);
  }

  private async linkFlashcard(
    ctx: Ctx,
    conceitoId: string,
    fcId: string | null | undefined,
  ): Promise<void> {
    if (fcId) await this.tryEdge(ctx, fcId, conceitoId, 'DEFINE');
  }

  private async findOrCreate(
    ctx: Ctx,
    tipoNode: string,
    nome: string,
    descricao: string,
  ): Promise<{ nodeId: string; created: boolean } | null> {
    const key = `${tipoNode}|${nome.toLowerCase()}`;
    const existing = ctx.nameIndex.get(key);
    if (existing) return { nodeId: existing, created: false };
    const id = await this.createNode(ctx, { tipoNode, nome, descricao });
    if (!id) return null;
    ctx.nameIndex.set(key, id);
    return { nodeId: id, created: true };
  }

  private async createNode(
    ctx: Ctx,
    input: Parameters<GraphNodeWriter['createNode']>[2],
  ): Promise<string | null> {
    try {
      const { nodeId } = await this.nodeWriter.createNode(ctx.userId, ctx.grafoId, input);
      return nodeId;
    } catch {
      return null;
    }
  }

  private async tryEdge(
    ctx: Ctx,
    sourceNodeId: string,
    targetNodeId: string,
    tipoRelacao: string,
  ): Promise<void> {
    try {
      await this.edgeWriter.createEdge(ctx.userId, ctx.grafoId, {
        sourceNodeId,
        targetNodeId,
        tipoRelacao,
      });
    } catch {
      // duplicate/invalid edge: skip it
    }
  }
}

function buildMessages(baralho: BaralhoForPopulation, existingContext: string): LlmMessage[] {
  const fcLines = baralho.flashcards
    .map((fc, i) => `[${i}] P: ${fc.pergunta.trim()}\n    R: ${fc.resposta.trim()}`)
    .join('\n\n');
  const last = baralho.flashcards.length - 1;
  return [
    { role: 'system', content: systemPrompt(existingContext) },
    { role: 'user', content: userPrompt(baralho.titulo, baralho.flashcards.length, fcLines, last) },
  ];
}

function systemPrompt(existingContext: string): string {
  return `Você é especialista em pedagogia e organização do conhecimento.
Dado um conjunto de flashcards, mapeie cada um para a hierarquia: ASSUNTO → TÓPICO → CONCEITO.
Responda APENAS com JSON válido, sem texto extra.${existingContext}`;
}

function userPrompt(titulo: string, total: number, fcLines: string, last: number): string {
  return `Baralho: "${titulo}" (${total} flashcards)

${fcLines}

Regras:
- Cada flashcard DEVE estar em "indices" de pelo menos um CONCEITO
- Agrupe flashcards do mesmo conceito; não crie um conceito por flashcard se forem semelhantes
- Reutilize os nomes dos nós já existentes no grafo quando fizer sentido (evite duplicar)
- Nomes concisos em português

Formato de resposta:
{
  "assuntos": [{ "nome": "string", "descricao": "string" }],
  "topicos": [{ "nome": "string", "assunto": "nome exato do assunto", "descricao": "string" }],
  "conceitos": [{ "nome": "string", "topico": "nome exato do tópico", "descricao": "string", "indices": [0, 1, 2] }]
}

"indices" são os índices [0..${last}] dos flashcards que esse conceito representa.`;
}
