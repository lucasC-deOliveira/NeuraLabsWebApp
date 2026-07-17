// Review step of the chunked deck classification: the user opts OUT of concepts
// before a chunk is applied. Filtering a plan keeps only the kept concepts and
// the topics/subjects still referenced by them, so unchecking a concept never
// creates orphan structure. Pure logic.
import type { ClassificationPlan } from "@/modules/graph/application/ports/graph-ai.port";

export function filterPlanToConcepts(
  plan: ClassificationPlan,
  keptIndices: Set<number>,
): ClassificationPlan {
  const conceitos = plan.conceitos.filter((_, i) => keptIndices.has(i));
  const topicoNames = new Set(conceitos.map((c) => c.topico.toLowerCase()));
  const topicos = plan.topicos.filter((t) => topicoNames.has(t.nome.toLowerCase()));
  const assuntoNames = new Set(topicos.map((t) => t.assunto.toLowerCase()));
  const assuntos = plan.assuntos.filter((a) => assuntoNames.has(a.nome.toLowerCase()));
  return { assuntos, topicos, conceitos };
}

/** "Lote N/M" label: chunks already covered + the one in review, over the total. */
export function chunkProgressLabel(
  totalCards: number,
  classifiedCards: number,
  chunkSize: number,
): string {
  const size = Math.max(1, chunkSize);
  const total = Math.max(1, Math.ceil(totalCards / size));
  const current = Math.min(total, Math.floor(classifiedCards / size) + 1);
  return `Lote ${current}/${total}`;
}
