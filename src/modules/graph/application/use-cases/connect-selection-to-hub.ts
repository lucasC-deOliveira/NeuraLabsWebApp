// Use-case: grava em lote as arestas de "conectar todos a X". Sequencial de
// propósito — o backend valida cada aresta e uma duplicata não pode derrubar as
// outras. Aplicação pura (sem React).
import type { PlannedEdge } from "../../domain/selectors/hub-connection";
import type { GraphEdgesPort } from "../ports/graph-edges.port";

export interface HubConnectionResult {
  // Ids das arestas criadas — é o que o undo precisa para apagar exatamente
  // estas, sem tocar em arestas que já existiam antes da operação.
  edgeIds: string[];
  // Arestas recusadas pelo backend (duplicata ou inválida). Não são erro fatal:
  // reconectar uma seleção que já tinha metade ligada é um caso normal.
  rejected: number;
}

/**
 * Cria as arestas planejadas, seguindo em frente quando uma é recusada.
 * @example connectSelectionToHub(port, "g1", plan.edges)
 */
export async function connectSelectionToHub(
  port: GraphEdgesPort,
  grafoId: string,
  edges: PlannedEdge[],
): Promise<HubConnectionResult> {
  const edgeIds: string[] = [];
  let rejected = 0;
  for (const edge of edges) {
    const edgeId = await tryCreateEdge(port, grafoId, edge);
    if (edgeId) edgeIds.push(edgeId);
    else rejected++;
  }
  return { edgeIds, rejected };
}

async function tryCreateEdge(
  port: GraphEdgesPort,
  grafoId: string,
  edge: PlannedEdge,
): Promise<string | null> {
  try {
    const { edgeId } = await port.createEdge(grafoId, { ...edge, peso: 1 });
    return edgeId;
  } catch {
    return null;
  }
}
