import { expect, it } from "vitest";
import type { VaultNode } from "@/lib/vault-format";
import { vaultPlanContent } from "./vault-plan-content";
import type { StudyPlan } from "../application/study-plan.types";

const plan: StudyPlan = {
  id: "p", grafoIds: ["g"], prioridade: "prova", metaTipo: "NOVOS", metaValor: 5,
  dataAlvo: null, ativo: true, baralhoIds: ["deck"], provaIds: ["exam"], conceitosExcluidos: [],
};

it("merges downloaded deck cards and graph content without duplicates and follows explicit exam order", () => {
  const nodes: VaultNode[] = [
    { id: "exam", grafoId: "h", tipo: "PROVA", questaoIds: ["b", "a"], relacoes: [] },
    { id: "a", grafoId: "h", tipo: "QUESTION", enunciado: "First", gabarito: "V", relacoes: [] },
    { id: "b", grafoId: "h", tipo: "QUESTION", enunciado: "Second", gabarito: "F", relacoes: [] },
    { id: "c", grafoId: "g", tipo: "QUESTION", enunciado: "Annulled", gabarito: "ANULADA", relacoes: [] },
    { id: "card", grafoId: "g", tipo: "FLASHCARD", pergunta: "Graph prompt", resposta: "Answer", relacoes: [] },
  ];
  const pool = vaultPlanContent(nodes, plan, {
    formatVersion: 1, reviews: [], decks: [
      { id: "deck", title: "Deck", cards: [{ id: "card", question: "Deck prompt", answer: "Answer", schedule: null }] },
    ],
  });
  expect(pool.cards).toHaveLength(1);
  expect(pool.questions.map(({ id }) => id)).toEqual(["b", "a"]);
});
