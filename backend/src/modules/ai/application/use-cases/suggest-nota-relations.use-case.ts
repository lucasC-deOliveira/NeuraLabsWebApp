import { parseAiJson } from '../../domain/services/ai-json';
import {
  selectNotaRelations,
  type NotaRelationSuggestion,
  type RawSuggestion,
  type RelationCandidate,
} from '../../domain/services/nota-relation-suggestions';
import type { RelationCandidatesRepository } from '../../domain/ports/relation-candidates-repository';
import type { RelationRulesPort } from '../../domain/ports/relation-rules-port';
import type { LlmMessage, LlmPort } from '../../domain/ports/llm-port';

const TARGET_TYPES = ['CONCEITO', 'TOPICO', 'ASSUNTO'] as const;

/**
 * Suggests relations from a note to existing graph nodes, validated against the
 * allowed relation rules.
 * @example suggestNotaRelations.execute('u1', 'g1', 'Título', 'Conteúdo')
 */
export class SuggestNotaRelationsUseCase {
  constructor(
    private readonly candidates: RelationCandidatesRepository,
    private readonly llm: LlmPort,
    private readonly rules: RelationRulesPort,
  ) {}

  async execute(
    userId: string,
    grafoId: string,
    titulo: string,
    conteudo: string,
  ): Promise<NotaRelationSuggestion[]> {
    if (!titulo.trim() && !conteudo.trim()) return [];
    const candidates = await this.candidates.loadCandidates(userId, grafoId);
    if (candidates.length === 0) return [];
    const content = await this.llm.complete({
      userId,
      temperature: 0.2,
      messages: this.buildMessages(titulo, conteudo, candidates),
    });
    const parsed = parseAiJson(content || '{}') as { sugestoes?: RawSuggestion[] };
    return selectNotaRelations(parsed?.sugestoes ?? [], candidates, (tipo, relacao) =>
      this.rules.isNotaRelationAllowed(tipo, relacao),
    );
  }

  private buildMessages(
    titulo: string,
    conteudo: string,
    candidates: RelationCandidate[],
  ): LlmMessage[] {
    const candidateList = candidates.map(describeCandidate).join('\n');
    const allowedByType = TARGET_TYPES.map(
      (t) => `- NOTA → ${t}: ${this.rules.allowedNotaRelations(t).join(', ')}`,
    ).join('\n');
    return [
      { role: 'system', content: systemPrompt(allowedByType) },
      {
        role: 'user',
        content: `NOTA:\nTítulo: ${titulo}\nConteúdo:\n${conteudo.slice(0, 4000)}\n\nCANDIDATOS:\n${candidateList}`,
      },
    ];
  }
}

function describeCandidate(c: RelationCandidate): string {
  return `- id: ${c.id} | tipo: ${c.tipo} | nome: ${c.nome}${c.descricao ? ` | descricao: ${c.descricao}` : ''}`;
}

function systemPrompt(allowedByType: string): string {
  return `Você analisa uma nota (Zettelkasten) e sugere relações com nós de um grafo (a nota é sempre a origem).\nRelações permitidas:\n${allowedByType}\nSugira APENAS nós da lista (id exato), só relações permitidas, no máximo 8 pertinentes. JSON: {"sugestoes":[{"nodeId":"...","relacao":"...","motivo":"frase curta"}]}`;
}
