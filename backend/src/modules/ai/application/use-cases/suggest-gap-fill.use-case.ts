import { parseAiJson } from '../../domain/services/ai-json';
import {
  selectGapInsights,
  type NodeInsight,
  type RawInsight,
} from '../../domain/services/node-insights';
import type { GapRulesPort } from '../../domain/ports/gap-rules-port';
import type { InsightTarget } from '../../domain/ports/relation-rules-port';
import type { LlmMessage, LlmPort } from '../../domain/ports/llm-port';

export interface GapFillInput {
  labelsA: string[];
  labelsB: string[];
  bridgeA: string;
  bridgeB: string;
}

/**
 * Suggests bridge nodes (concepts/notes) that could connect two disconnected
 * clusters — a structural gap. Returns nothing for invalid input/output.
 * @example suggestGapFill.execute('u1', 'g1', { labelsA, labelsB, bridgeA, bridgeB })
 */
export class SuggestGapFillUseCase {
  constructor(
    private readonly llm: LlmPort,
    private readonly rules: GapRulesPort,
  ) {}

  async execute(
    userId: string,
    _grafoId: string,
    input: GapFillInput,
  ): Promise<{ insights: NodeInsight[] }> {
    if (input.labelsA.length === 0 || input.labelsB.length === 0) return { insights: [] };
    const content = await this.llm.complete({
      userId,
      messages: buildMessages(input, this.rules.gapTargets()),
    });
    try {
      const parsed = parseAiJson(content || '{}') as { insights?: RawInsight[] };
      return { insights: selectGapInsights(parsed?.insights ?? []) };
    } catch {
      return { insights: [] };
    }
  }
}

function buildMessages(input: GapFillInput, targets: InsightTarget[]): LlmMessage[] {
  const targetsDesc = targets
    .map((t) => `- tipoNo "${t.tipo}" → relações: ${t.relacoes.join(', ')}`)
    .join('\n');
  return [
    { role: 'system', content: systemPrompt(targetsDesc) },
    { role: 'user', content: userPrompt(input) },
  ];
}

function systemPrompt(targetsDesc: string): string {
  return `Você analisa dois clusters de um grafo de conhecimento que NÃO têm nenhuma conexão entre si — isso é uma lacuna estrutural (structural gap). Sugira 4-6 novos nós (conceitos ou notas) que poderiam criar pontes intelectuais entre eles.\nCada nó sugerido deve: (1) relacionar-se semanticamente com ambos os clusters; (2) usar tipoNo e relacao SOMENTE dos combos válidos:\n${targetsDesc}\nResponda em JSON: {"insights":[{"categoria":"Lacuna","titulo":"...","descricao":"...","tipoNo":"...","relacao":"..."}]}`;
}

function userPrompt(input: GapFillInput): string {
  const { labelsA, labelsB, bridgeA, bridgeB } = input;
  return (
    `CLUSTER A (${labelsA.length} nós): ${labelsA.slice(0, 20).join(', ')}\n` +
    `Nó de borda de A mais próximo de B: "${bridgeA}"\n\n` +
    `CLUSTER B (${labelsB.length} nós): ${labelsB.slice(0, 20).join(', ')}\n` +
    `Nó de borda de B mais próximo de A: "${bridgeB}"`
  );
}
