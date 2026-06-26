import { parseAiJson } from '../../domain/services/ai-json';
import {
  selectAutoLinkSuggestions,
  type AutoLinkNode,
  type AutoLinkSuggestion,
  type RawAutoLink,
} from '../../domain/services/auto-link-suggestions';
import type { AutoLinkRepository } from '../../domain/ports/auto-link-repository';
import type { RelationRulesPort } from '../../domain/ports/relation-rules-port';
import type { LlmMessage, LlmPort } from '../../domain/ports/llm-port';

const ALLOWED_DESC =
  'TOPICO→ASSUNTO: PERTENCE_A | CONCEITO→TOPICO: PERTENCE_A, FUNDAMENTA | ' +
  'CONCEITO→CONCEITO: IS_A, PART_OF, PREREQUISITO, DERIVA_DE, EVOLUI_PARA, REFORCA, ALTERNATIVA_A, CONTRASTA_COM | ' +
  'NOTA→CONCEITO: DEFINE, EXPLICA, APROFUNDA, EXEMPLIFICA | NOTA→TOPICO: PERTENCE_A';
const SYSTEM_PROMPT =
  `Analise o grafo e sugira 5-15 ARESTAS que deveriam existir mas ainda não existem. Relações válidas: ${ALLOWED_DESC}\n` +
  'JSON: {"suggestions":[{"sourceId":"...","targetId":"...","relacao":"...","motivo":"frase curta"}]}';

/**
 * Suggests new edges for a graph (5–15), validated against the relation rules and
 * excluding edges that already exist.
 * @example autoLink.execute('u1', 'g1')
 */
export class AutoLinkGraphUseCase {
  constructor(
    private readonly repo: AutoLinkRepository,
    private readonly llm: LlmPort,
    private readonly rules: RelationRulesPort,
  ) {}

  async execute(userId: string, grafoId: string): Promise<{ suggestions: AutoLinkSuggestion[] }> {
    const { nodes, existingPairs } = await this.repo.loadAutoLinkData(userId, grafoId);
    if (nodes.length < 2) return { suggestions: [] };
    const content = await this.llm.complete({
      userId,
      maxTokens: 4000,
      messages: buildMessages(nodes),
    });
    const parsed = parseAiJson(content || '{}') as { suggestions?: RawAutoLink[] };
    const suggestions = selectAutoLinkSuggestions(
      parsed?.suggestions ?? [],
      nodes,
      existingPairs,
      (sourceTipo, targetTipo, relacao) =>
        this.rules.isRelationAllowed(sourceTipo, targetTipo, relacao),
    );
    return { suggestions };
  }
}

function buildMessages(nodes: AutoLinkNode[]): LlmMessage[] {
  const nodeList = nodes.map((n) => `id:${n.id} tipo:${n.tipo} nome:"${n.nome}"`).join('\n');
  return [
    { role: 'system', content: SYSTEM_PROMPT },
    { role: 'user', content: `NÓS:\n${nodeList.slice(0, 7000)}` },
  ];
}
