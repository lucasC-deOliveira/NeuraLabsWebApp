import { parseAiJson } from '../../domain/services/ai-json';
import {
  selectBridgeCandidates,
  type BridgeCandidate,
  type BridgeItem,
} from '../../domain/services/cross-graph-bridges';
import { ensureNodeVectors } from '../ensure-node-vectors';
import type {
  BridgeCandidatesRepository,
  BridgeNode,
} from '../../domain/ports/bridge-candidates-repository';
import type { EmbeddingPort } from '../../domain/ports/embedding-port';
import type { LlmMessage, LlmPort } from '../../domain/ports/llm-port';
import type { NodeEmbeddingRepository } from '../../domain/ports/node-embedding-repository';
import type { RelationRulesPort } from '../../domain/ports/relation-rules-port';

export interface BridgeSuggestion extends BridgeCandidate {
  relacao: string;
  motivo: string;
}

interface RawBridgeRelation {
  indice?: unknown;
  relacao?: unknown;
  motivo?: unknown;
}

// Neutral fallback: the pair IS related (cosine said so) but the LLM did not name
// the relation usefully, so we assert the weakest honest claim and let the human
// change it in the review.
const DEFAULT_BRIDGE_RELATION = 'REFORCA';

const SYSTEM_PROMPT =
  'Cada par abaixo são dois conceitos que o cosseno aproximou e que vivem em GRAFOS DIFERENTES ' +
  'do mesmo usuário. O cosseno erra: pares podem ser parecidos só na escrita ("Unificação de ' +
  'Termos" x "Testes Unitários") sem nenhuma relação real.\n' +
  'Para cada par: se houver relação conceitual de verdade, escolha a melhor entre IS_A, PART_OF, ' +
  'PREREQUISITO, DERIVA_DE, EVOLUI_PARA, REFORCA, ALTERNATIVA_A, CONTRASTA_COM. ' +
  'Se NÃO houver relação real, responda "NENHUMA" — é esperado que boa parte dos pares seja NENHUMA.\n' +
  'JSON: {"relacoes":[{"indice":0,"relacao":"...","motivo":"frase curta"}]}';

// The LLM's veto: the pair looked close by cosine but is not actually related.
const REJECTED_RELATION = 'NENHUMA';

/**
 * Suggests edges between semantically close concepts that live in DIFFERENT graphs
 * and are not yet connected — the "bridges" that the node-as-system model made
 * expressible. Embeddings pick the candidates (no prompt-size cap); one LLM call
 * names the relation. Nothing is written: the caller reviews and applies.
 * @example suggestCrossGraphBridges.execute('u1', 'g1')
 */
export class SuggestCrossGraphBridgesUseCase {
  constructor(
    private readonly repo: BridgeCandidatesRepository,
    private readonly embeddings: EmbeddingPort,
    private readonly store: NodeEmbeddingRepository,
    private readonly llm: LlmPort,
    private readonly rules: RelationRulesPort,
  ) {}

  async execute(
    userId: string,
    grafoId: string,
    percentile?: number,
  ): Promise<{ suggestions: BridgeSuggestion[] }> {
    const inside = await this.repo.loadConceptsInGraph(userId, grafoId);
    const outside = await this.repo.loadConceptsOutsideGraph(userId, grafoId);
    if (!inside.length || !outside.length) return { suggestions: [] };
    const items = await this.toItems(userId, inside, outside);
    const ids = [...inside, ...outside].map((n) => n.id);
    const existing = await this.repo.loadExistingPairKeys(userId, ids);
    const candidates = selectBridgeCandidates(items.inside, items.outside, existing, {
      percentile,
    });
    if (!candidates.length) return { suggestions: [] };
    return { suggestions: await this.nameRelations(userId, candidates) };
  }

  // Embeds both sides in a single pass so a node shared by the two lists is
  // embedded once, then splits the vectors back to their sides.
  private async toItems(
    userId: string,
    inside: BridgeNode[],
    outside: BridgeNode[],
  ): Promise<{ inside: BridgeItem[]; outside: BridgeItem[] }> {
    const all = [...inside, ...outside];
    const vectors = await ensureNodeVectors(this.embeddings, this.store, userId, all);
    const items = all.map((node, i) => toItem(node, vectors[i]));
    return { inside: items.slice(0, inside.length), outside: items.slice(inside.length) };
  }

  // Candidates the LLM explicitly rejected are dropped: cosine proximity alone
  // pairs "Encapsulamento" with "Ressentimento", and shipping that as a suggestion
  // wastes the reviewer's attention, which is the scarce resource here.
  private async nameRelations(
    userId: string,
    candidates: BridgeCandidate[],
  ): Promise<BridgeSuggestion[]> {
    const named = await this.askForRelations(userId, candidates);
    return candidates.flatMap((candidate, i) => {
      const relacao = named.get(i)?.relacao;
      if (relacao === REJECTED_RELATION) return [];
      return [
        {
          ...candidate,
          relacao: this.validRelation(relacao),
          motivo: named.get(i)?.motivo ?? defaultMotivo(candidate),
        },
      ];
    });
  }

  // A failed or unparseable LLM call must not lose the candidates: they are still
  // valid bridges, just with the fallback relation.
  private async askForRelations(
    userId: string,
    candidates: BridgeCandidate[],
  ): Promise<Map<number, { relacao: string; motivo?: string }>> {
    try {
      const content = await this.llm.complete({
        userId,
        maxTokens: 2000,
        messages: buildBridgeMessages(candidates),
      });
      const parsed = parseAiJson(content || '{}') as { relacoes?: RawBridgeRelation[] };
      return indexRelations(parsed?.relacoes ?? []);
    } catch {
      return new Map();
    }
  }

  private validRelation(relacao: string | undefined): string {
    if (!relacao) return DEFAULT_BRIDGE_RELATION;
    const allowed = this.rules.isRelationAllowed('CONCEITO', 'CONCEITO', relacao);
    return allowed ? relacao : DEFAULT_BRIDGE_RELATION;
  }
}

function toItem(node: BridgeNode, vetor: number[]): BridgeItem {
  return {
    id: node.id,
    nome: node.nome,
    grafoId: node.grafoId,
    grafoNome: node.grafoNome,
    vetor: vetor ?? [],
  };
}

function indexRelations(
  raw: RawBridgeRelation[],
): Map<number, { relacao: string; motivo?: string }> {
  const byIndex = new Map<number, { relacao: string; motivo?: string }>();
  for (const row of raw) {
    if (typeof row?.indice !== 'number' || typeof row?.relacao !== 'string') continue;
    const motivo = typeof row.motivo === 'string' ? row.motivo : undefined;
    byIndex.set(row.indice, { relacao: row.relacao, motivo });
  }
  return byIndex;
}

function defaultMotivo(candidate: BridgeCandidate): string {
  const pct = Math.round(candidate.similaridade * 100);
  return `Conceitos próximos (~${pct}%) em grafos diferentes: ${candidate.sourceGrafoNome} e ${candidate.targetGrafoNome}.`;
}

function buildBridgeMessages(candidates: BridgeCandidate[]): LlmMessage[] {
  const list = candidates
    .map(
      (c, i) =>
        `${i}: "${c.sourceNome}" (${c.sourceGrafoNome}) <-> "${c.targetNome}" (${c.targetGrafoNome})`,
    )
    .join('\n');
  return [
    { role: 'system', content: SYSTEM_PROMPT },
    { role: 'user', content: `PARES:\n${list.slice(0, 6000)}` },
  ];
}
