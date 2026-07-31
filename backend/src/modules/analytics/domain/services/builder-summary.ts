import { evaluateBuilderAchievements } from './builder-achievements';
import type { Achievement } from './achievement-eval';
import type { CreatedTotals } from '../ports/content-creation-source';
import type { GraphBreadth, TerritoryItem } from '../ports/graph-breadth-source';

// Resumo do eixo Construtor & Explorador: ofensiva de criação + totais criados +
// amplitude do mapa + badges + território novo. Não redefine consistência — reusa
// a ofensiva (studyStreak) e a mecânica de badges já existentes.
export interface BuilderSummary {
  creationStreak: number;
  created: number;
  createdTotals: CreatedTotals;
  breadth: GraphBreadth;
  achievements: Achievement[];
  recentTerritory: TerritoryItem[];
}

export interface BuilderInput {
  creationStreak: number;
  createdTotals: CreatedTotals;
  breadth: GraphBreadth;
  recentTerritory: TerritoryItem[];
}

/** Monta o resumo a partir dos sinais já carregados. @example builderSummary(input) */
export function builderSummary(input: BuilderInput): BuilderSummary {
  const created = sumTotals(input.createdTotals);
  const achievements = evaluateBuilderAchievements({
    created,
    flashcardsCreated: input.createdTotals.flashcard,
    concepts: input.breadth.concepts,
    subjects: input.breadth.subjects,
  });
  return { ...input, created, achievements };
}

function sumTotals(totals: CreatedTotals): number {
  return Object.values(totals).reduce((n, v) => n + v, 0);
}
