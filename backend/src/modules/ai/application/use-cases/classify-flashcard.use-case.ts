import { AiNodeNotFoundError, UnsupportedExpandTypeError } from '../../domain/errors';
import { parseAiJson } from '../../domain/services/ai-json';
import { createNodeSafe, tryCreateEdge } from '../graph-write-helpers';
import { nodeNameKey } from '../../domain/services/node-name-key';
import type { ExpandTargetRepository } from '../../domain/ports/expand-target-repository';
import type { GraphNameIndexRepository } from '../../domain/ports/graph-name-index-repository';
import type { GraphNodeWriter } from '../../domain/ports/graph-node-writer';
import type { GraphEdgeWriter } from '../../domain/ports/graph-edge-writer';
import type { LlmMessage, LlmPort } from '../../domain/ports/llm-port';

export interface ClassifyFlashcardResult {
  /** Conceitos criados por não existirem ainda no grafo. */
  conceitos: number;
  /** Arestas DEFINE criadas do flashcard para um conceito. */
  linked: number;
}

interface RawConceito {
  nome?: unknown;
  descricao?: unknown;
}

interface Ctx {
  userId: string;
  grafoId: string;
  nameIndex: Map<string, string>;
}

const SCHEMA = '{"conceitos":[{"nome":"...","descricao":"..."}]}';
const MAX_CONCEITOS = 4;

/**
 * Classifies a FLASHCARD by the concepts it defines: reuses matching concepts by
 * name (creating the ones that are new) and links the card to each with a DEFINE
 * edge. This is the single-card counterpart of PopulateGraphFromBaralho; invalid
 * AI output links nothing.
 * @example classify.execute('u1', 'g1', 'fc1')
 */
export class ClassifyFlashcardUseCase {
  constructor(
    private readonly targets: ExpandTargetRepository,
    private readonly names: GraphNameIndexRepository,
    private readonly nodeWriter: GraphNodeWriter,
    private readonly edgeWriter: GraphEdgeWriter,
    private readonly llm: LlmPort,
  ) {}

  async execute(userId: string, grafoId: string, nodeId: string): Promise<ClassifyFlashcardResult> {
    const target = await this.targets.loadExpandTarget(userId, grafoId, nodeId);
    if (!target) throw new AiNodeNotFoundError();
    if (target.tipo !== 'FLASHCARD') throw new UnsupportedExpandTypeError(target.tipo);
    const { nameIndex, existingContext } = await this.names.loadNameIndex(userId, grafoId);
    const content = await this.llm.complete({
      userId,
      messages: buildMessages(target.nome, target.desc, existingContext),
    });
    const ctx: Ctx = { userId, grafoId, nameIndex };
    return this.materialize(ctx, nodeId, parseConceitos(content));
  }

  private async materialize(
    ctx: Ctx,
    flashcardRef: string,
    conceitos: RawConceito[],
  ): Promise<ClassifyFlashcardResult> {
    const result: ClassifyFlashcardResult = { conceitos: 0, linked: 0 };
    for (const raw of conceitos.slice(0, MAX_CONCEITOS)) {
      await this.linkConceito(ctx, flashcardRef, raw, result);
    }
    return result;
  }

  private async linkConceito(
    ctx: Ctx,
    flashcardRef: string,
    raw: RawConceito,
    result: ClassifyFlashcardResult,
  ): Promise<void> {
    const nome = str(raw?.nome);
    if (!nome) return;
    const { nodeId, created } = await this.findOrCreate(ctx, nome, str(raw?.descricao));
    if (!nodeId) return;
    if (created) result.conceitos++;
    await this.defineEdge(ctx, flashcardRef, nodeId);
    result.linked++;
  }

  private defineEdge(ctx: Ctx, flashcardRef: string, conceitoId: string): Promise<void> {
    return tryCreateEdge(this.edgeWriter, ctx.userId, ctx.grafoId, {
      sourceNodeId: flashcardRef,
      targetNodeId: conceitoId,
      tipoRelacao: 'DEFINE',
    });
  }

  private async findOrCreate(
    ctx: Ctx,
    nome: string,
    descricao: string,
  ): Promise<{ nodeId: string; created: boolean }> {
    const key = nodeNameKey('CONCEITO', nome);
    const existing = ctx.nameIndex.get(key);
    if (existing) return { nodeId: existing, created: false };
    const id = await createNodeSafe(this.nodeWriter, ctx.userId, ctx.grafoId, {
      tipoNode: 'CONCEITO',
      nome,
      descricao,
    });
    if (!id) return { nodeId: '', created: false };
    ctx.nameIndex.set(key, id);
    return { nodeId: id, created: true };
  }
}

const str = (v: unknown): string => String(v ?? '').trim();

function parseConceitos(content: string): RawConceito[] {
  if (!content) return [];
  try {
    return (parseAiJson(content) as { conceitos?: RawConceito[] }).conceitos ?? [];
  } catch {
    return [];
  }
}

function buildMessages(pergunta: string, resposta: string, existingContext: string): LlmMessage[] {
  return [
    {
      role: 'system',
      content: `Dado um flashcard, liste os CONCEITOs que ele define ou aborda, reusando os existentes pelo nome quando couber. Responda APENAS JSON: ${SCHEMA}${existingContext}`,
    },
    {
      role: 'user',
      content: `Pergunta: ${pergunta}\nResposta: ${resposta.slice(0, 2000)}`,
    },
  ];
}
