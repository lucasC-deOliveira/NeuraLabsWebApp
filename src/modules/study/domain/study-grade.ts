// SRS grading derived from the self-report (acertou?) + confidence (1–5).

export type Grade = "again" | "hard" | "good" | "easy";

/**
 * Maps a self-reported result + confidence to an SRS grade.
 * Wrong → always "again"; when right, confidence tiers into hard/good/easy.
 *
 * @example computeGrade(true, 5)  // → "easy"
 * @example computeGrade(false, 5) // → "again"
 */
export function computeGrade(acertou: boolean, confidence: number): Grade {
  if (!acertou) return "again";
  if (confidence <= 2) return "hard";
  if (confidence <= 4) return "good";
  return "easy";
}

/**
 * A metacognitive gap: the learner was confident (≥4) yet got it wrong — a
 * signal to revisit the concept.
 */
export function isMetacognitiveGap(acertou: boolean, confidence: number): boolean {
  return !acertou && confidence >= 4;
}
