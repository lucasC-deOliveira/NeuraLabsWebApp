import { InvalidSubgraphRelationError } from '../errors';

// Relations a GRAFO_REF (subgraph reference) may have with its parent graph.
export const GRAFO_REF_RELATIONS = [
  'PREREQUISITO',
  'APROFUNDA',
  'DERIVA_DE',
  'APLICADO_EM',
  'CONTRASTA_COM',
  'SINTETIZA',
  'RELACIONADO',
] as const;

export function isSubgraphRelation(relacao: string): boolean {
  return (GRAFO_REF_RELATIONS as readonly string[]).includes(relacao);
}

export function assertValidSubgraphRelation(relacao: string): void {
  if (!isSubgraphRelation(relacao)) throw new InvalidSubgraphRelationError(relacao);
}
