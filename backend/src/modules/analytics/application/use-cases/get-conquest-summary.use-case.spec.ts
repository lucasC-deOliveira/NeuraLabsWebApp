import { describe, it, expect } from 'vitest';
import { GetConquestSummaryUseCase } from './get-conquest-summary.use-case';
import type {
  ConceptMasterySource,
  FeynmanClarityRow,
  FlashcardStateRow,
  QuestionStatRow,
} from '../../domain/ports/concept-mastery-source';

class FakeSource implements ConceptMasterySource {
  constructor(
    private readonly states: FlashcardStateRow[],
    private readonly questions: QuestionStatRow[] = [],
    private readonly feynman: FeynmanClarityRow[] = [],
  ) {}
  flashcardStates(): Promise<FlashcardStateRow[]> {
    return Promise.resolve(this.states);
  }
  questionStats(): Promise<QuestionStatRow[]> {
    return Promise.resolve(this.questions);
  }
  feynmanClarity(): Promise<FeynmanClarityRow[]> {
    return Promise.resolve(this.feynman);
  }
  conceptNames(_userId: string, ids: string[]): Promise<Map<string, string>> {
    return Promise.resolve(new Map(ids.map((id) => [id, `Nome ${id}`])));
  }
}

const fc = (conceitoId: string): FlashcardStateRow => ({
  conceitoId,
  dificuldade: 2,
  intervalo: 10,
  proximaRevisao: new Date(),
});

// Domínio fake: alto para o conceito "bom", baixo para o "ruim".
const fakeMastery: (i: { dificuldade: number }) => number = (i) => (i.dificuldade <= 2 ? 0.9 : 0.2);

describe('GetConquestSummaryUseCase', () => {
  it('averages flashcard mastery per concept and counts the dominated', async () => {
    const source = new FakeSource([fc('bom'), fc('bom'), { ...fc('ruim'), dificuldade: 9 }]);

    const summary = await new GetConquestSummaryUseCase(source, fakeMastery).execute('u1');

    expect(summary.dominated).toBe(1); // "bom" (0.9) domina; "ruim" (0.2) fica em progresso
    expect(summary.inProgress).toBe(1);
  });

  // A regra do usuário: as três evidências se cruzam. Questão fraca segura um
  // conceito com flashcards fortes.
  it('lets a weak question score hold back a strong flashcard concept', async () => {
    const source = new FakeSource(
      [fc('c1')],
      [{ conceitoId: 'c1', total: 10, acertos: 3 }], // 30% de acerto
    );

    const summary = await new GetConquestSummaryUseCase(source, fakeMastery).execute('u1');

    expect(summary.dominated).toBe(0);
    expect(summary.inProgress).toBe(1);
  });

  it('unions concepts that only have question or feynman evidence', async () => {
    const source = new FakeSource(
      [],
      [{ conceitoId: 'q', total: 4, acertos: 4 }],
      [{ conceitoId: 'f', clareza: 85 }],
    );

    const summary = await new GetConquestSummaryUseCase(source, fakeMastery).execute('u1');

    expect(summary.studied).toBe(2);
    expect(summary.dominated).toBe(2);
  });
});
