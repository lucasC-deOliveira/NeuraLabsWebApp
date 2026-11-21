import { expect, it } from "vitest";
import { buildVaultPlanQueue } from "./vault-plan-queue";
import type { FlashcardItem, StudyPlan } from "./study-plan.types";

const plan: StudyPlan = {
  id: "plan", grafoIds: ["graph"], prioridade: "ai", metaTipo: "NOVOS", metaValor: 2,
  dataAlvo: null, ativo: true, baralhoIds: [], provaIds: [], conceitosExcluidos: [],
};

it("prioritizes due reviews and mixes fresh cards and questions within the daily goal", () => {
  const cards: FlashcardItem[] = ["later", "fresh", "due"].map((id) => ({
    kind: "flashcard", id, pergunta: "Prompt", resposta: "Answer", conceito: null,
  }));
  const schedule = {
    fase: "REVIEW" as const, learningStep: 0, dificuldade: 1, intervalo: 2, fatorEase: 2,
    ultimaRevisao: "2026-11-17T15:00:00Z", proximaRevisao: "2026-11-19T15:00:00Z",
  };
  const result = buildVaultPlanQueue(plan, {
    cards, questions: [{ kind: "question", id: "exam-question", enunciado: "Prompt", alternativas: null,
      gabarito: "V", explicacao: null, conceito: null }],
    schedules: { due: schedule, later: { ...schedule, proximaRevisao: "2026-11-21T15:00:00Z" } },
  }, new Date("2026-11-20T15:00:00Z"));
  expect(result.items.map(({ id }) => id)).toEqual(["due", "fresh", "exam-question"]);
  expect(result.today.target).toMatchObject({ reviews: 1, novos: 2 });
});
