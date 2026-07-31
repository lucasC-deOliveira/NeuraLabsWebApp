import {
  conquestSummary,
  type ConceptSignalRow,
  type ConquestSummary,
} from '../../domain/services/conquest-summary';
import type {
  ConceptMasterySource,
  FlashcardStateRow,
} from '../../domain/ports/concept-mastery-source';

// A fórmula de domínio SM-2 vive no contexto do grafo; entra por função para o
// analytics não importar o domínio de outro módulo (o bind é no módulo). Mesmo
// padrão do CardMasteryCalculator no estudo.
export type MasteryFn = (
  input: { dificuldade: number; intervalo: number; proximaRevisao: Date },
  nowMs: number,
) => number;

/**
 * Resumo da conquista do grafo: cruza SRS dos flashcards, acerto nas questões e
 * clareza no Feynman por conceito e conta dominados vs em progresso.
 * @example useCase.execute('u1')
 */
export class GetConquestSummaryUseCase {
  constructor(
    private readonly source: ConceptMasterySource,
    private readonly mastery: MasteryFn,
  ) {}

  async execute(userId: string): Promise<ConquestSummary> {
    const [states, questions, feynman] = await Promise.all([
      this.source.flashcardStates(userId),
      this.source.questionStats(userId),
      this.source.feynmanClarity(userId),
    ]);
    const rows = await this.buildRows(userId, states, questions, feynman);
    return conquestSummary(rows);
  }

  private async buildRows(
    userId: string,
    states: FlashcardStateRow[],
    questions: { conceitoId: string; total: number; acertos: number }[],
    feynman: { conceitoId: string; clareza: number }[],
  ): Promise<ConceptSignalRow[]> {
    const flashcard = this.flashcardMasteryByConcept(states);
    const question = new Map(questions.map((q) => [q.conceitoId, q.acertos / q.total]));
    const feyn = new Map(feynman.map((f) => [f.conceitoId, f.clareza]));
    const ids = [...new Set([...flashcard.keys(), ...question.keys(), ...feyn.keys()])];
    const names = await this.source.conceptNames(userId, ids);
    return ids.map((id) => toSignalRow(id, names, flashcard, question, feyn));
  }

  // Domínio do conceito pelos flashcards = média do domínio SM-2 dos cards que o DEFINE.
  private flashcardMasteryByConcept(states: FlashcardStateRow[]): Map<string, number> {
    const nowMs = Date.now();
    const soma = new Map<string, { total: number; n: number }>();
    for (const s of states) {
      const acc = soma.get(s.conceitoId) ?? { total: 0, n: 0 };
      acc.total += this.mastery(s, nowMs);
      acc.n += 1;
      soma.set(s.conceitoId, acc);
    }
    return new Map([...soma].map(([id, { total, n }]) => [id, total / n]));
  }
}

function toSignalRow(
  conceitoId: string,
  names: Map<string, string>,
  flashcard: Map<string, number>,
  question: Map<string, number>,
  feyn: Map<string, number>,
): ConceptSignalRow {
  return {
    conceitoId,
    nome: names.get(conceitoId) ?? conceitoId,
    flashcardMastery: flashcard.get(conceitoId) ?? null,
    questionAccuracy: question.get(conceitoId) ?? null,
    feynmanClarity: feyn.get(conceitoId) ?? null,
  };
}
