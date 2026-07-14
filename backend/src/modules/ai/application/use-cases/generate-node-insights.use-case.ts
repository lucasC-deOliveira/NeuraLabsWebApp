import { AiNodeNotFoundError } from '../../domain/errors';
import { parseAiJson } from '../../domain/services/ai-json';
import {
  selectNodeInsights,
  insightSignature,
  INSIGHT_CATEGORIES,
  type NodeInsight,
  type NodeInsightsResult,
  type RawInsight,
} from '../../domain/services/node-insights';
import type {
  InsightContext,
  InsightContextNode,
  InsightContextRepository,
} from '../../domain/ports/insight-context-repository';
import type { NodeInsightsCacheRepository } from '../../domain/ports/node-insights-cache-repository';
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

export type { NodeInsightsResult };

/**
 * Generates insights (suggested relations) for a node, validated against the
 * allowed (tipoNo, relacao) combos for its type. Results are cached per node and
 * reused until the node's context changes; `refresh` forces a fresh LLM call.
 * @example generateNodeInsights.execute('u1', 'g1', 'ref1', { refresh: true })
 */
export class GenerateNodeInsightsUseCase {
  constructor(
    private readonly context: InsightContextRepository,
    private readonly llm: LlmPort,
    private readonly rules: RelationRulesPort,
    private readonly cache: NodeInsightsCacheRepository,
  ) {}

  async execute(
    userId: string,
    grafoId: string,
    nodeId: string,
    options: { refresh?: boolean } = {},
  ): Promise<NodeInsightsResult> {
    const ctx = await this.context.loadInsightContext(userId, grafoId, nodeId);
    if (!ctx) throw new AiNodeNotFoundError();
    const assinatura = insightSignature(ctx);
    if (!options.refresh) {
      const cached = await this.cache.load(grafoId, nodeId);
      if (cached && cached.assinatura === assinatura) return cached.result;
    }
    const result = await this.generate(userId, ctx);
    await this.cache.save(userId, grafoId, nodeId, assinatura, result);
    return result;
  }

  private async generate(userId: string, ctx: InsightContext): Promise<NodeInsightsResult> {
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

const CATEGORY_GUIDE = [
  'Relacionado: um nó próximo do mesmo assunto que deveria estar ligado',
  'Aprofundar: um subtópico/detalhe que estende o nó-alvo',
  'Conexão: uma ponte com outra área do grafo (nó de assunto distinto)',
  'Aplicação: um uso prático, exemplo ou exercício do nó-alvo',
].join('; ');

function systemPrompt(targetsDesc: string): string {
  return `Você é um tutor que analisa um nó de um grafo de conhecimento e gera INSIGHTS. Prefira LIGAR a nós que já existem no grafo (listados no contexto) a inventar novos. Cada insight: categoria (uma de [${INSIGHT_CATEGORIES.join(', ')}] — ${CATEGORY_GUIDE}), titulo (3-8 palavras), descricao (1-2 frases), tipoNo e relacao escolhidos SOMENTE entre os combos válidos:\n${targetsDesc}\nEntre 4 e 8 insights. Responda em JSON: {"insights":[{"categoria":"...","titulo":"...","descricao":"...","tipoNo":"...","relacao":"..."}]}`;
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
  return `GRAFO (tema): ${ctx.grafoNome}\n\nNÓ-ALVO (${tipoAlvo}): ${ctx.target.nome}\n${body}\n\n${neighborSection(ctx.neighbors)}\n\nOUTROS NÓS DO GRAFO (por relevância):\n${contextoLista || '(sem outros nós)'}`;
}

function neighborSection(neighbors: InsightContextNode[]): string {
  if (neighbors.length === 0) return '';
  const lines = neighbors
    .map((c) => `- [${label(c.tipo)}] ${c.nome}${c.corpo ? ': ' + c.corpo.slice(0, 200) : ''}`)
    .join('\n');
  return `VIZINHOS DIRETOS:\n${lines}`;
}
