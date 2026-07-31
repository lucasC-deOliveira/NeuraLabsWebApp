// "Conceito dominado" para a conquista do grafo: não é um número só, é o cruzamento
// de TRÊS evidências que o app já registra — o SRS dos flashcards, o acerto nas
// questões e a clareza no Feynman. Um conceito está dominado quando você é forte em
// TODAS as evidências que tem sobre ele (e tem ao menos uma). Domínio puro, testável.

export interface ConceptSignals {
  // null = sem evidência daquela fonte para este conceito.
  flashcardMastery: number | null; // 0..1 — média do domínio SM-2 dos cards que o DEFINE
  questionAccuracy: number | null; // 0..1 — acerto nas questões do conceito
  feynmanClarity: number | null; // 0..100 — última clareza da explicação Feynman
}

export interface ConceptMastery {
  dominated: boolean;
  // 0..1 combinando as evidências presentes — para ordenar e mostrar "% de domínio".
  score: number;
  evidenceCount: number;
}

// Barras por fonte. Calibráveis; começam onde a UI já trata como "bom".
export const FLASHCARD_BAR = 0.6;
export const QUESTION_BAR = 0.7;
export const FEYNMAN_BAR = 70; // escala 0..100

interface Signal {
  norm: number; // 0..1 normalizado
  ok: boolean; // acima da barra da fonte
}

/**
 * Avalia o domínio de um conceito a partir das evidências disponíveis.
 * @example conceptMastery({ flashcardMastery: 0.8, questionAccuracy: 0.9, feynmanClarity: null })
 */
export function conceptMastery(signals: ConceptSignals): ConceptMastery {
  const present = collectSignals(signals);
  if (present.length === 0) return { dominated: false, score: 0, evidenceCount: 0 };
  const score = present.reduce((sum, s) => sum + s.norm, 0) / present.length;
  return {
    dominated: present.every((s) => s.ok),
    score,
    evidenceCount: present.length,
  };
}

function collectSignals(signals: ConceptSignals): Signal[] {
  const present: Signal[] = [];
  if (signals.flashcardMastery !== null)
    present.push({
      norm: clamp01(signals.flashcardMastery),
      ok: signals.flashcardMastery >= FLASHCARD_BAR,
    });
  if (signals.questionAccuracy !== null)
    present.push({
      norm: clamp01(signals.questionAccuracy),
      ok: signals.questionAccuracy >= QUESTION_BAR,
    });
  if (signals.feynmanClarity !== null)
    present.push({
      norm: clamp01(signals.feynmanClarity / 100),
      ok: signals.feynmanClarity >= FEYNMAN_BAR,
    });
  return present;
}

function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v));
}
