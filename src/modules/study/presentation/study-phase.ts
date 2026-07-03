// Presentation-only types/labels for the study state machine.

export type Phase =
  | "loading"
  | "question"
  | "answer"
  | "elaboration"
  | "confidence"
  | "feedback"
  | "complete";

export interface LastResult {
  acertou: boolean;
  confidence: number;
  metacognitiveGap: boolean;
}

export const CONFIDENCE_LABELS: Record<number, string> = {
  1: "Nada confiante",
  2: "Pouco confiante",
  3: "Neutro",
  4: "Confiante",
  5: "Muito confiante",
};
