import { describe, it, expect } from 'vitest';
import { SuggestNotaRelationsUseCase } from './suggest-nota-relations.use-case';
import type { RelationCandidatesRepository } from '../../domain/ports/relation-candidates-repository';
import type { RelationRulesPort } from '../../domain/ports/relation-rules-port';
import type { RelationCandidate } from '../../domain/services/nota-relation-suggestions';
import type { LlmPort, LlmRequest } from '../../domain/ports/llm-port';

class FakeCandidates implements RelationCandidatesRepository {
  constructor(private readonly rows: RelationCandidate[]) {}
  async loadCandidates(): Promise<RelationCandidate[]> {
    return this.rows;
  }
}

class FakeLlm implements LlmPort {
  lastRequest: LlmRequest | null = null;
  constructor(private readonly response: string) {}
  async complete(request: LlmRequest): Promise<string> {
    this.lastRequest = request;
    return this.response;
  }
}

const rules: RelationRulesPort = {
  allowedNotaRelations: () => ['DEFINE', 'EXPLICA'],
  isNotaRelationAllowed: (_t, relacao) => relacao === 'DEFINE',
};

const candidate: RelationCandidate = {
  id: 'c1',
  tipo: 'CONCEITO',
  nome: 'Mitose',
  descricao: null,
};

describe('SuggestNotaRelationsUseCase', () => {
  it('returns nothing when there are no candidates', async () => {
    const llm = new FakeLlm('{}');
    const useCase = new SuggestNotaRelationsUseCase(new FakeCandidates([]), llm, rules);
    expect(await useCase.execute('u1', 'g1', 'T', 'C')).toEqual([]);
    expect(llm.lastRequest).toBeNull();
  });

  it('validates the model suggestions against the rules', async () => {
    const llm = new FakeLlm(
      '{"sugestoes":[{"nodeId":"c1","relacao":"NOPE"},{"nodeId":"c1","relacao":"DEFINE","motivo":"m"}]}',
    );
    const useCase = new SuggestNotaRelationsUseCase(new FakeCandidates([candidate]), llm, rules);
    const out = await useCase.execute('u1', 'g1', 'T', 'C');
    expect(out).toEqual([
      { nodeId: 'c1', nodeTipo: 'CONCEITO', nodeNome: 'Mitose', relacao: 'DEFINE', motivo: 'm' },
    ]);
    expect(llm.lastRequest?.temperature).toBe(0.2);
  });
});
