import { AiNodeNotFoundError, UnsupportedExpandTypeError } from '../../domain/errors';
import { parseAiJson } from '../../domain/services/ai-json';
import type {
  ExpandTarget,
  ExpandTargetRepository,
} from '../../domain/ports/expand-target-repository';
import type { GraphNameIndexRepository } from '../../domain/ports/graph-name-index-repository';
import type { GraphNodeWriter } from '../../domain/ports/graph-node-writer';
import type { GraphEdgeWriter } from '../../domain/ports/graph-edge-writer';
import type { LlmMessage, LlmPort } from '../../domain/ports/llm-port';

export interface ExpandCounts {
  topicos: number;
  conceitos: number;
  notas: number;
  flashcards: number;
}

interface RawConceito {
  nome?: unknown;
  descricao?: unknown;
}
interface RawTopico extends RawConceito {
  conceitos?: RawConceito[];
}
interface RawFlashcard {
  pergunta?: unknown;
  resposta?: unknown;
}
interface RawNota {
  titulo?: unknown;
  conteudo?: unknown;
}
interface Expansion {
  topicos?: RawTopico[];
  conceitos?: RawConceito[];
  nota?: RawNota;
  flashcards?: RawFlashcard[];
}

interface Ctx {
  userId: string;
  grafoId: string;
  targetRef: string;
  nameIndex: Map<string, string>;
}

const SCHEMAS: Record<string, string> = {
  ASSUNTO:
    '{"topicos":[{"nome":"...","descricao":"...","conceitos":[{"nome":"...","descricao":"..."}]}]}',
  TOPICO: '{"conceitos":[{"nome":"...","descricao":"..."}]}',
  CONCEITO:
    '{"nota":{"titulo":"...","conteudo":"(Markdown)"},"flashcards":[{"pergunta":"...","resposta":"..."}]}',
  NOTA: '{"flashcards":[{"pergunta":"...","resposta":"..."}]}',
};

/**
 * Expands a node into AI-generated sub-nodes (topics/concepts/notes/flashcards)
 * linked back to it, reusing existing nodes by name. Invalid output adds nothing.
 * @example expandNode.execute('u1', 'g1', 'ref1')
 */
export class ExpandNodeUseCase {
  constructor(
    private readonly targets: ExpandTargetRepository,
    private readonly names: GraphNameIndexRepository,
    private readonly nodeWriter: GraphNodeWriter,
    private readonly edgeWriter: GraphEdgeWriter,
    private readonly llm: LlmPort,
  ) {}

  async execute(userId: string, grafoId: string, nodeId: string): Promise<ExpandCounts> {
    const target = await this.targets.loadExpandTarget(userId, grafoId, nodeId);
    if (!target) throw new AiNodeNotFoundError();
    if (!SCHEMAS[target.tipo]) throw new UnsupportedExpandTypeError(target.tipo);
    const { nameIndex, existingContext } = await this.names.loadNameIndex(userId, grafoId);
    const content = await this.llm.complete({
      userId,
      messages: buildMessages(target, existingContext),
    });
    const parsed = parseExpansion(content);
    if (!parsed) return zeroCounts();
    return this.materialize({ userId, grafoId, targetRef: nodeId, nameIndex }, target.tipo, parsed);
  }

  private materialize(ctx: Ctx, tipo: string, parsed: Expansion): Promise<ExpandCounts> {
    if (tipo === 'ASSUNTO') return this.expandAssunto(ctx, parsed.topicos ?? []);
    if (tipo === 'TOPICO') return this.expandConceitos(ctx, ctx.targetRef, parsed.conceitos ?? []);
    if (tipo === 'CONCEITO') return this.expandConceito(ctx, parsed);
    return this.expandFlashcards(ctx, parsed.flashcards ?? [], 'TESTA', 6);
  }

  private async expandAssunto(ctx: Ctx, topicos: RawTopico[]): Promise<ExpandCounts> {
    const counts = zeroCounts();
    for (const t of topicos.slice(0, 6)) await this.addTopicoTree(ctx, t, counts);
    return counts;
  }

  private async addTopicoTree(ctx: Ctx, raw: RawTopico, counts: ExpandCounts): Promise<void> {
    const nome = str(raw?.nome);
    if (!nome) return;
    const { nodeId, created } = await this.findOrCreate(ctx, 'TOPICO', nome, str(raw?.descricao));
    if (created) counts.topicos++;
    await this.tryEdge(ctx, nodeId, ctx.targetRef, 'PERTENCE_A');
    const child = { ...ctx, targetRef: nodeId };
    for (const c of (raw?.conceitos ?? []).slice(0, 4)) await this.addConceito(child, c, counts);
  }

  private async expandConceitos(
    ctx: Ctx,
    parentRef: string,
    conceitos: RawConceito[],
  ): Promise<ExpandCounts> {
    const counts = zeroCounts();
    const under = { ...ctx, targetRef: parentRef };
    for (const c of conceitos.slice(0, 6)) await this.addConceito(under, c, counts);
    return counts;
  }

  private async addConceito(ctx: Ctx, raw: RawConceito, counts: ExpandCounts): Promise<void> {
    const nome = str(raw?.nome);
    if (!nome) return;
    const { nodeId, created } = await this.findOrCreate(ctx, 'CONCEITO', nome, str(raw?.descricao));
    if (created) counts.conceitos++;
    await this.tryEdge(ctx, nodeId, ctx.targetRef, 'PERTENCE_A');
  }

  private async expandConceito(ctx: Ctx, parsed: Expansion): Promise<ExpandCounts> {
    const counts = zeroCounts();
    await this.addNota(ctx, parsed.nota, counts);
    const flashes = await this.expandFlashcards(ctx, parsed.flashcards ?? [], 'HERDA', 5);
    counts.flashcards = flashes.flashcards;
    return counts;
  }

  private async addNota(ctx: Ctx, raw: RawNota | undefined, counts: ExpandCounts): Promise<void> {
    const titulo = str(raw?.titulo);
    if (!titulo) return;
    const id = await this.createNode(ctx, {
      tipoNode: 'NOTA',
      titulo,
      conteudo: String(raw?.conteudo ?? ''),
      subtipo: 'EXPLICACAO',
      tipoNota: 'PERMANENTE',
    });
    if (!id) return;
    counts.notas++;
    await this.tryEdge(ctx, id, ctx.targetRef, 'EXPLICA');
  }

  private async expandFlashcards(
    ctx: Ctx,
    flashcards: RawFlashcard[],
    relacao: string,
    limit: number,
  ): Promise<ExpandCounts> {
    const counts = zeroCounts();
    for (const fc of flashcards.slice(0, limit)) await this.addFlashcard(ctx, fc, relacao, counts);
    return counts;
  }

  private async addFlashcard(
    ctx: Ctx,
    raw: RawFlashcard,
    relacao: string,
    counts: ExpandCounts,
  ): Promise<void> {
    const pergunta = str(raw?.pergunta);
    const resposta = str(raw?.resposta);
    if (!pergunta || !resposta) return;
    const id = await this.createNode(ctx, { tipoNode: 'FLASHCARD', pergunta, resposta });
    if (!id) return;
    counts.flashcards++;
    await this.tryEdge(ctx, id, ctx.targetRef, relacao);
  }

  private async findOrCreate(
    ctx: Ctx,
    tipoNode: string,
    nome: string,
    descricao: string,
  ): Promise<{ nodeId: string; created: boolean }> {
    const key = `${tipoNode}|${nome.toLowerCase()}`;
    const existing = ctx.nameIndex.get(key);
    if (existing) return { nodeId: existing, created: false };
    const id = await this.createNode(ctx, { tipoNode, nome, descricao });
    if (!id) return { nodeId: '', created: false };
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
    if (!sourceNodeId) return;
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

const str = (v: unknown): string => String(v ?? '').trim();
const zeroCounts = (): ExpandCounts => ({ topicos: 0, conceitos: 0, notas: 0, flashcards: 0 });

function parseExpansion(content: string): Expansion | null {
  if (!content) return null;
  try {
    return parseAiJson(content) as Expansion;
  } catch {
    return null;
  }
}

function buildMessages(target: ExpandTarget, existingContext: string): LlmMessage[] {
  return [
    {
      role: 'system',
      content: `Expanda o nó de grafo com sub-nós em português. Responda APENAS JSON: ${SCHEMAS[target.tipo]}${existingContext}`,
    },
    {
      role: 'user',
      content: `${promptFor(target.tipo, target.nome)}\n\nDescrição/Conteúdo: ${target.desc.slice(0, 2000)}`,
    },
  ];
}

function promptFor(tipo: string, nome: string): string {
  const prompts: Record<string, string> = {
    ASSUNTO: `Expanda o ASSUNTO "${nome}" criando 2-4 TOPICOs principais, cada um com 2-3 CONCEITOs chave.`,
    TOPICO: `Expanda o TÓPICO "${nome}" criando 3-5 CONCEITOs que compõem este tópico.`,
    CONCEITO: `Expanda o CONCEITO "${nome}" com 1 NOTA explicativa detalhada em Markdown e 2-4 FLASHCARDs.`,
    NOTA: `A partir da NOTA "${nome}", gere 3-6 FLASHCARDs de estudo com pergunta e resposta.`,
  };
  return prompts[tipo] ?? '';
}
