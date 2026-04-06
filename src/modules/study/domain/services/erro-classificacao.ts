// ==========================================
// Error classification using simple heuristics
// Will be replaced/augmented by AI analysis later
// ==========================================

import type { ErrorClassification } from "@/types";

/**
 * Classifies the type of error based on word overlap and key heuristics.
 */
export function classifyError(
  userAnswer: string,
  correctAnswer: string,
): ErrorClassification {
  const userTokens = tokenize(userAnswer);
  const correctTokens = tokenize(correctAnswer);

  if (userTokens.length === 0) {
    return {
      tipo: "CONCEITUAL",
      explicacao:
        "Nenhuma resposta fornecida. O conceito parece nao ter sido compreendido.",
    };
  }

  const overlap = computeOverlap(userTokens, correctTokens);
  const overlapRatio =
    correctTokens.length > 0 ? overlap / correctTokens.length : 0;

  // High overlap but wrong — likely a detail or exception
  if (overlapRatio >= 0.6) {
    return {
      tipo: "DETALHE",
      explicacao:
        "Resposta proxima do correto, mas com imprecisao em detalhes. Revise os pontos especificos que diferenciam a resposta.",
    };
  }

  // Medium overlap — incomplete answer
  if (overlapRatio >= 0.3) {
    return {
      tipo: "INCOMPLETO",
      explicacao:
        "Resposta parcialmente correta, mas incompleta. Faltam elementos importantes do conceito.",
    };
  }

  // Almost no shared key terms — conceptual error
  if (overlapRatio < 0.15) {
    return {
      tipo: "CONCEITUAL",
      explicacao:
        "Pouca ou nenhuma sobreposicao com a resposta correta. O conceito precisa ser revisado do inicio.",
    };
  }

  // Low-medium overlap — likely confused with a related exception
  return {
    tipo: "EXCECAO",
    explicacao:
      "Resposta demonstra confusao entre regra e excecao. Atencao aos casos especiais deste conceito.",
  };
}

/**
 * Tokenizes a string into lowercase words, stripping punctuation.
 */
function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length > 2); // ignore short words like "de", "e"
}

/**
 * Counts how many unique tokens from `b` appear in `a`.
 */
function computeOverlap(a: string[], b: string[]): number {
  const setA = new Set(a);
  return b.filter((t) => setA.has(t)).length;
}
