import type { LoadRelationImpact, RelationEndpoints, RelationImpactGraph } from "../../application/ports/relation-impact.port";
import type { GraphConfirmationState } from "../hooks/useGraphConfirmation";

interface RelationConfirmation {
  operation: "edit" | "delete";
  currentGraphId: string;
  edge: RelationEndpoints;
  loadImpact?: LoadRelationImpact;
  ask: GraphConfirmationState["ask"];
}

function affectedGraphSetMatches(before: RelationImpactGraph[], after: RelationImpactGraph[]): boolean {
  const ids = new Set(before.map(({ id }) => id));
  return before.length === after.length && after.every(({ id }) => ids.has(id));
}

function mutationPrompt(deleting: boolean, graphs: RelationImpactGraph[]): Parameters<GraphConfirmationState["ask"]>[0] {
  const shared = graphs.length > 1;
  return {
    title: deleting ? "Excluir esta relação?" : "Alterar relação compartilhada?",
    description: shared ? "A alteração será aplicada aos grafos abaixo, que contêm os dois nós." : undefined,
    affectedGraphs: shared ? graphs : undefined,
    action: deleting ? "Excluir" : "Salvar alteração",
    destructive: deleting,
  };
}

/** Confirms a shared relation mutation after looking up the affected graph views.
 * @example await confirmRelationImpact({ operation: "edit", edge, currentGraphId, loadImpact, ask })
 */
export async function confirmRelationImpact(input: RelationConfirmation): Promise<boolean> {
  const { operation, edge, currentGraphId, loadImpact, ask } = input;
  const graphs = loadImpact ? await loadImpact(edge) : [];
  if (loadImpact && !graphs.some(({ id }) => id === currentGraphId)) {
    throw new Error("Não foi possível verificar o impacto desta relação no grafo atual.");
  }
  const deleting = operation === "delete";
  if (!deleting && graphs.length <= 1) return true;
  const accepted = await ask(mutationPrompt(deleting, graphs));
  if (!accepted || !loadImpact) return accepted;
  const current = await loadImpact(edge);
  if (!affectedGraphSetMatches(graphs, current)) {
    throw new Error("Os grafos afetados mudaram. Revise o impacto antes de continuar.");
  }
  return true;
}
