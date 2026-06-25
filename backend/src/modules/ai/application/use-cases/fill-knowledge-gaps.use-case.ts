import { EmptyAiContentError } from '../../domain/errors';
import { parseAiJson } from '../../domain/services/ai-json';
import type { GraphNameIndexRepository } from '../../domain/ports/graph-name-index-repository';
import type { GraphNodeWriter } from '../../domain/ports/graph-node-writer';
import type { GraphEdgeWriter } from '../../domain/ports/graph-edge-writer';
import type { NodeTypesRepository } from '../../domain/ports/node-types-repository';
import type { LlmMessage, LlmPort } from '../../domain/ports/llm-port';

export interface KnowledgeGap {
  nome: string;
  tipo: 'missing' | 'shallow';
  assuntoId: string;
  assuntoNome: string;
}

export interface FillCounts {
  topicos: number;
  conceitos: number;
  notas: number;
  flashcards: number;
}

interface RawFlashcard {
  pergunta?: unknown;
  resposta?: unknown;
}
interface RawNota {
  titulo?: unknown;
  conteudo?: unknown;
}
interface RawConceito {
  nome?: unknown;
  descricao?: unknown;
  nota?: RawNota;
  flashcards?: unknown;
}
interface RawTopico {
  nome?: unknown;
  descricao?: unknown;
  assuntoId?: unknown;
  conceitos?: unknown;
}

interface Ctx {
  userId: string;
  grafoId: string;
  nameIndex: Map<string, string>;
}

/**
 * Fills knowledge gaps by generating topics/concepts/notes/flashcards and wiring
 * them under the existing subjects, reusing nodes by name. Empty/invalid output
 * raises a domain error.
 * @example fillGaps.execute('u1', 'g1', [{ nome, tipo, assuntoId, assuntoNome }])
 */
export class FillKnowledgeGapsUseCase {
  constructor(
    private readonly names: GraphNameIndexRepository,
    private readonly nodeWriter: GraphNodeWriter,
    private readonly edgeWriter: GraphEdgeWriter,
    private readonly types: NodeTypesRepository,
    private readonly llm: LlmPort,
  ) {}

  async execute(userId: string, grafoId: string, gaps: KnowledgeGap[]): Promise<FillCounts> {
    if (gaps.length === 0) return zeroCounts();
    const { nameIndex, existingContext } = await this.names.loadNameIndex(userId, grafoId);
    const content = await this.llm.complete({
      userId,
      maxTokens: 6000,
      messages: buildMessages(gaps, existingContext),
    });
    if (!content) throw new EmptyAiContentError();
    const parsed = parseAiJson(content) as { topicos?: unknown };
    return this.materialize({ userId, grafoId, nameIndex }, arr<RawTopico>(parsed?.topicos));
  }

  private async materialize(ctx: Ctx, topicos: RawTopico[]): Promise<FillCounts> {
    const counts = zeroCounts();
    for (const t of topicos.slice(0, 12)) await this.addTopico(ctx, t, counts);
    return counts;
  }

  private async addTopico(ctx: Ctx, raw: RawTopico, counts: FillCounts): Promise<void> {
    const nome = str(raw?.nome);
    if (!nome) return;
    const topico = await this.findOrCreate(ctx, 'TOPICO', nome, str(raw?.descricao));
    if (!topico) return;
    if (topico.created) counts.topicos++;
    await this.linkToAssunto(ctx, topico.nodeId, raw?.assuntoId);
    for (const c of arr<RawConceito>(raw?.conceitos).slice(0, 6)) {
      await this.addConceito(ctx, topico.nodeId, c, counts);
    }
  }

  private async linkToAssunto(ctx: Ctx, topicoId: string, assuntoId: unknown): Promise<void> {
    const id = typeof assuntoId === 'string' ? assuntoId : '';
    if (!id) return;
    const types = await this.types.loadNodeTypes(ctx.userId, ctx.grafoId, [id]);
    if (types.get(id) !== 'ASSUNTO') return;
    await this.tryEdge(ctx, topicoId, id, 'PERTENCE_A');
  }

  private async addConceito(
    ctx: Ctx,
    topicoId: string,
    raw: RawConceito,
    counts: FillCounts,
  ): Promise<void> {
    const nome = str(raw?.nome);
    if (!nome) return;
    const conceito = await this.findOrCreate(ctx, 'CONCEITO', nome, str(raw?.descricao));
    if (!conceito) return;
    if (conceito.created) counts.conceitos++;
    await this.tryEdge(ctx, conceito.nodeId, topicoId, 'PERTENCE_A');
    await this.addNota(ctx, conceito.nodeId, raw?.nota, counts);
    for (const fc of arr<RawFlashcard>(raw?.flashcards).slice(0, 2)) {
      await this.addFlashcard(ctx, conceito.nodeId, fc, counts);
    }
  }

  private async addNota(
    ctx: Ctx,
    conceitoId: string,
    raw: RawNota | undefined,
    counts: FillCounts,
  ): Promise<void> {
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
    await this.tryEdge(ctx, id, conceitoId, 'EXPLICA');
  }

  private async addFlashcard(
    ctx: Ctx,
    conceitoId: string,
    raw: RawFlashcard,
    counts: FillCounts,
  ): Promise<void> {
    const pergunta = str(raw?.pergunta);
    const resposta = str(raw?.resposta);
    if (!pergunta || !resposta) return;
    const id = await this.createNode(ctx, { tipoNode: 'FLASHCARD', pergunta, resposta });
    if (!id) return;
    counts.flashcards++;
    await this.tryEdge(ctx, id, conceitoId, 'HERDA');
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

const str = (v: unknown): string => String(v ?? '').trim();
const zeroCounts = (): FillCounts => ({ topicos: 0, conceitos: 0, notas: 0, flashcards: 0 });
const arr = <T>(v: unknown): T[] => (Array.isArray(v) ? (v as T[]) : []);

function buildMessages(gaps: KnowledgeGap[], existingContext: string): LlmMessage[] {
  const gapList = gaps.map(describeGap).join('\n');
  return [
    { role: 'system', content: systemPrompt(existingContext) },
    { role: 'user', content: `Lacunas a preencher:\n${gapList}` },
  ];
}

function describeGap(g: KnowledgeGap): string {
  const tag = g.tipo === 'missing' ? 'FALTANDO' : 'RASO';
  return `- [${tag}] "${g.nome}" no assunto "${g.assuntoNome}" (assuntoId: ${g.assuntoId})`;
}

function systemPrompt(existingContext: string): string {
  return (
    'Você é especialista em conteúdo educacional. Dado lacunas de conhecimento, gere tópicos, ' +
    'conceitos, notas e flashcards para preenchê-las.\n\nPara cada lacuna, agrupe sob um TÓPICO ' +
    'com seus CONCEITOs, cada conceito com uma NOTA explicativa detalhada e até 2 FLASHCARDS de ' +
    'estudo.\n\nResponda APENAS JSON:\n{"topicos":[{"nome":"...","descricao":"...","assuntoId":"...",' +
    '"conceitos":[{"nome":"...","descricao":"...","nota":{"titulo":"...","conteudo":"..."},' +
    '"flashcards":[{"pergunta":"...","resposta":"..."}]}]}]}' +
    existingContext
  );
}
