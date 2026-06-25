import { EmptyAiContentError, EmptyTextError } from '../../domain/errors';
import { parseAiJson } from '../../domain/services/ai-json';
import type { GraphNameIndexRepository } from '../../domain/ports/graph-name-index-repository';
import type { LlmMessage, LlmPort } from '../../domain/ports/llm-port';

export const GRAPH_SYSTEM_PROMPT = `Você é especialista em organização curricular. A partir de um texto bruto, gere um grafo de conhecimento completo e hierárquico.
Responda APENAS JSON válido (sem markdown, sem blocos de código):
{
  "assunto": { "nome": "...", "descricao": "..." },
  "topicos": [
    {
      "nome": "...",
      "descricao": "...",
      "conceitos": [
        {
          "nome": "...",
          "descricao": "...",
          "nota": { "titulo": "...", "conteudo": "explicação detalhada em Markdown" },
          "flashcards": [
            { "pergunta": "...", "resposta": "..." }
          ]
        }
      ]
    }
  ],
  "baralho": "Nome do baralho de estudo"
}
Regras: 1 ASSUNTO que engloba tudo; 2-5 TOPICOs principais; 2-4 CONCEITOs por tópico; 1 NOTA por conceito com explicação detalhada; 1-3 FLASHCARDs por conceito com pergunta e resposta claras.`;

export function graphPlanMessages(rawText: string, existingContext: string): LlmMessage[] {
  return [
    { role: 'system', content: GRAPH_SYSTEM_PROMPT + existingContext },
    { role: 'user', content: rawText.slice(0, 15000) },
  ];
}

/**
 * Stage 1 of graph generation: asks the model for a graph plan from raw text
 * (no persistence). The returned plan is fed to BuildGraphFromPlan.
 * @example planGraph.execute('u1', 'g1', 'texto bruto...')
 */
export class PlanGraphFromTextUseCase {
  constructor(
    private readonly names: GraphNameIndexRepository,
    private readonly llm: LlmPort,
  ) {}

  async execute(userId: string, grafoId: string, rawText: string): Promise<{ plan: unknown }> {
    if (!rawText.trim()) throw new EmptyTextError();
    const { existingContext } = await this.names.loadNameIndex(userId, grafoId);
    const content = await this.llm.complete({
      userId,
      maxTokens: 6000,
      messages: graphPlanMessages(rawText, existingContext),
    });
    if (!content) throw new EmptyAiContentError();
    return { plan: parseAiJson(content) };
  }
}
