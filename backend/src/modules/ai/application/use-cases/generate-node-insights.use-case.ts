import { AiNodeNotFoundError } from '../../domain/errors';
import { parseAiJson } from '../../domain/services/ai-json';
import {
  selectNodeInsights,
  INSIGHT_CATEGORIES,
  type NodeInsight,
  type RawInsight,
} from '../../domain/services/node-insights';
import type {
  InsightContext,
  InsightContextNode,
  InsightContextRepository,
} from '../../domain/ports/insight-context-repository';
import type { InsightTarget, RelationRulesPort } from '../../domain/ports/relation-rules-port';
import type { LlmMessage, LlmPort } from '../../domain/ports/llm-port';

const TIPO_LABEL: Record<string, string> = {
  ASSUNTO: 'assunto',
  TOPICO: 'tópico',
  CONCEITO: 'conceito',
  NOTA: 'nota',
  FLASHCARD: 'flashcard',
  TEXTO_BRUTO: 'texto',
  BARALHO: 'baralho',
};
const label = (tipo: string): string => TIPO_LABEL[tipo] ?? tipo;

export interface NodeInsightsResult {
  nodeNome: string;
  nodeTipo: string;
  insights: NodeInsight[];
}

/**
 * Generates insights (suggested relations) for a node, validated against the
 * allowed (tipoNo, relacao) combos for its type.
 * @example generateNodeInsights.execute('u1', 'g1', 'ref1')
 */
export class GenerateNodeInsightsUseCase {
  constructor(
    private readonly context: InsightContextRepository,
    private readonly llm: LlmPort,
    private readonly rules: RelationRulesPort,
  ) {}

  async execute(userId: string, grafoId: string, nodeId: string): Promise<NodeInsightsResult> {
    const ctx = await this.context.loadInsightContext(userId, grafoId, nodeId);
    if (!ctx) throw new AiNodeNotFoundError();
    const targets = this.rules.insightTargets(ctx.targetTipo);
    const content = await this.llm.complete({
      userId,
      temperature: 0.5,
      messages: buildMessages(ctx, targets),
    });
    const insights = this.selectInsights(content, ctx, targets);
    return { nodeNome: ctx.target.nome, nodeTipo: ctx.target.tipo, insights };
  }

  private selectInsights(
    content: string,
    ctx: InsightContext,
    targets: InsightTarget[],
  ): NodeInsight[] {
    const first = targets[0];
    const defaultCombo = first ? { tipoNo: first.tipo, relacao: first.relacoes[0] ?? '' } : null;
    const parsed = parseAiJson(content || '{}') as { insights?: RawInsight[] };
    return selectNodeInsights(parsed?.insights ?? [], defaultCombo, (tipoNo, relacao) =>
      this.rules.isRelationAllowed(ctx.targetTipo, tipoNo, relacao),
    );
  }
}

function buildMessages(ctx: InsightContext, targets: InsightTarget[]): LlmMessage[] {
  const targetsDesc = targets
    .map((t) => `- tipoNo "${t.tipo}" → relacoes possíveis: ${t.relacoes.join(', ')}`)
    .join('\n');
  return [
    { role: 'system', content: systemPrompt(targetsDesc) },
    { role: 'user', content: userPrompt(ctx) },
  ];
}

function systemPrompt(targetsDesc: string): string {
  return `Você é um tutor que analisa um nó de um grafo de conhecimento e gera INSIGHTS. Cada insight: categoria (uma de [${INSIGHT_CATEGORIES.join(', ')}]), titulo (3-8 palavras), descricao (1-2 frases), tipoNo e relacao escolhidos SOMENTE entre os combos válidos:\n${targetsDesc}\nEntre 4 e 8 insights. Responda em JSON: {"insights":[{"categoria":"...","titulo":"...","descricao":"...","tipoNo":"...","relacao":"..."}]}`;
}

function userPrompt(ctx: InsightContext): string {
  const tipoAlvo = label(ctx.target.tipo);
  const body = ctx.target.corpo
    ? `Conteúdo:\n${ctx.target.corpo.slice(0, 2000)}`
    : '(sem conteúdo)';
  const contextoLista = ctx.others
    .slice(0, 80)
    .map((c) => `- [${label(c.tipo)}] ${c.nome}`)
    .join('\n');
  return `NÓ-ALVO (${tipoAlvo}): ${ctx.target.nome}\n${body}\n\n${neighborSection(ctx.neighbors)}\n\nOUTROS NÓS DO GRAFO:\n${contextoLista || '(sem outros nós)'}`;
}

function neighborSection(neighbors: InsightContextNode[]): string {
  if (neighbors.length === 0) return '';
  const lines = neighbors
    .map((c) => `- [${label(c.tipo)}] ${c.nome}${c.corpo ? ': ' + c.corpo.slice(0, 200) : ''}`)
    .join('\n');
  return `VIZINHOS DIRETOS:\n${lines}`;
}
