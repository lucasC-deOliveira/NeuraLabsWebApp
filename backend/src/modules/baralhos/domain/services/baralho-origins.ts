import type { BaralhoOrigin } from '../baralho-views';

// NodeConhecimento.referenciaId é uma referência solta (sem FK para Baralho), então
// a origem de um baralho é derivada dos nós BARALHO que apontam para ele. Lógica pura:
// o adapter Prisma faz as consultas e aqui só combinamos os resultados.
export interface BaralhoNodeRow {
  referenciaId: string;
  grafoId: string | null;
}

/**
 * Agrupa, por baralho, os grafos em que ele tem um nó. Nós sem grafo ou cujo grafo
 * sumiu são descartados — a listagem só oferece links que abrem.
 * @example groupBaralhoOrigins([{ referenciaId: 'b1', grafoId: 'g1' }], new Map([['g1', 'Bio']]))
 */
export function groupBaralhoOrigins(
  nodes: BaralhoNodeRow[],
  graphNames: Map<string, string>,
): Map<string, BaralhoOrigin[]> {
  const byBaralho = new Map<string, BaralhoOrigin[]>();
  for (const node of nodes) {
    const origin = originOf(node, graphNames);
    if (!origin) continue;
    const origins = byBaralho.get(node.referenciaId) ?? [];
    origins.push(origin);
    byBaralho.set(node.referenciaId, origins);
  }
  return byBaralho;
}

function originOf(node: BaralhoNodeRow, graphNames: Map<string, string>): BaralhoOrigin | null {
  if (!node.grafoId) return null;
  const nome = graphNames.get(node.grafoId);
  if (!nome) return null;
  return { grafoId: node.grafoId, nome };
}
