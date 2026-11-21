import type { FlashcardItem, QuestionItem, StudyPlan } from "../application/study-plan.types";
import type { VaultNode } from "@/lib/vault-format";
import { desktop } from "@/lib/vault-bridge";
import { openGraphFromVault, vaultConceptTrail } from "@/modules/graph/infra/vault/graph-vault-reader";
import type { VaultLibrary } from "../domain/vault-library";

export async function readPlanGraphNodes(ids: string[]): Promise<VaultNode[]> {
  const graphs = await Promise.all(ids.map((id) => openGraphFromVault(id, desktop.vault)));
  return graphs.flatMap((graph, index) => graph?.source.entries.map(({ node }) => ({ ...node, grafoId: ids[index] })) ?? []);
}

function planConcept(node: VaultNode, concepts: Map<string, string>): { id: string; label: string } | null {
  const relation = node.relacoes.find(({ alvo }) => concepts.has(alvo));
  return relation ? { id: relation.alvo, label: concepts.get(relation.alvo)! } : null;
}

function contentsOfExam(exam: VaultNode): string[] {
  return exam.questaoIds ?? exam.relacoes.filter(({ rel }) => rel === "CONTEM").map(({ alvo }) => alvo);
}

function questionItem(node: VaultNode, concept: string | null): QuestionItem | null {
  if (!node.enunciado || !node.gabarito || ["?", "ANULADA"].includes(node.gabarito)) return null;
  return {
    kind: "question", id: node.id, conceito: concept, enunciado: node.enunciado,
    alternativas: node.alternativas ?? null, gabarito: node.gabarito, explicacao: node.explicacao ?? null,
  };
}

function flashcardItem(node: VaultNode, concept: string | null): FlashcardItem | null {
  if (!node.pergunta || !node.resposta) return null;
  return { kind: "flashcard", id: node.id, pergunta: node.pergunta, resposta: node.resposta, conceito: concept };
}

function orderPlanNodes(nodes: VaultNode[], plan: StudyPlan): VaultNode[] {
  const ordering = vaultConceptTrail(nodes);
  const concepts = new Map(nodes.filter(({ tipo }) => tipo === "CONCEITO").map(({ id, nome }) => [id, nome ?? id]));
  const rank = (node: VaultNode): number => ordering.get(planConcept(node, concepts)?.id ?? "") ?? Number.MAX_SAFE_INTEGER;
  const selectedExams = nodes.filter((node) => node.tipo === "PROVA" && plan.provaIds.includes(node.id));
  const priorityExams = selectedExams.length || plan.prioridade === "ai" ? selectedExams : nodes.filter(({ tipo }) => tipo === "PROVA");
  const examOrder = new Map([...new Set(priorityExams.flatMap(contentsOfExam))].map((id, index) => [id, index]));
  return [...nodes].sort((a, b) => (examOrder.get(a.id) ?? Number.MAX_SAFE_INTEGER) -
    (examOrder.get(b.id) ?? Number.MAX_SAFE_INTEGER) || rank(a) - rank(b));
}

function planDeckCards(plan: StudyPlan, library: VaultLibrary): Map<string, FlashcardItem> {
  const deckCards = library.decks.filter(({ id }) => plan.baralhoIds.includes(id)).flatMap(({ cards }) => cards);
  return new Map(deckCards.map((c): [string, FlashcardItem] => [c.id, {
    kind: "flashcard", id: c.id, pergunta: c.question, resposta: c.answer, conceito: c.concept ?? null,
  }]));
}

function projectPlanNode(node: VaultNode, label: string | null, inGraph: boolean, inExam: boolean): FlashcardItem | QuestionItem | null {
  if (node.tipo === "FLASHCARD" && inGraph) return flashcardItem(node, label);
  if (node.tipo === "QUESTION" && (inGraph || inExam)) return questionItem(node, label);
  return null;
}

function addPlanItem(cards: Map<string, FlashcardItem>, questions: Map<string, QuestionItem>, item: FlashcardItem | QuestionItem | null): void {
  if (item?.kind === "flashcard" && !cards.has(item.id)) cards.set(item.id, item);
  if (item?.kind === "question" && !questions.has(item.id)) questions.set(item.id, item);
}

/** Resolves and deduplicates downloaded decks, graph nodes and exam questions for a plan.
 * @example const pool = vaultPlanContent(nodes, plan, library)
 */
export function vaultPlanContent(
  nodes: VaultNode[], plan: StudyPlan, library: VaultLibrary,
): { cards: FlashcardItem[]; questions: QuestionItem[] } {
  const concepts = new Map(nodes.filter(({ tipo }) => tipo === "CONCEITO").map(({ id, nome }) => [id, nome ?? id]));
  const cards = planDeckCards(plan, library);
  const questions = new Map<string, QuestionItem>();
  const explicitQuestions = new Set(nodes.filter(({ id }) => plan.provaIds.includes(id)).flatMap(contentsOfExam));
  for (const node of orderPlanNodes(nodes, plan)) {
    const concept = planConcept(node, concepts);
    if (concept && plan.conceitosExcluidos.includes(concept.id)) continue;
    const item = projectPlanNode(node, concept?.label ?? null, plan.grafoIds.includes(node.grafoId), explicitQuestions.has(node.id));
    addPlanItem(cards, questions, item);
  }
  return { cards: [...cards.values()], questions: [...questions.values()] };
}
