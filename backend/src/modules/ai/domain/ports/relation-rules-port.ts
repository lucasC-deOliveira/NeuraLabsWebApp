// Published interface of the graph context's relation rules, consumed by the AI
// context (which must not import another context's domain directly). The binding
// to the concrete graph rules is wired in the AI module.
// Valid (tipoNo, relacoes) combinations when generating insights from a node.
export interface InsightTarget {
  tipo: string;
  relacoes: string[];
}

export interface RelationRulesPort {
  // Allowed relations for a NOTA pointing at a target of the given type.
  allowedNotaRelations(targetTipo: string): string[];
  isNotaRelationAllowed(targetTipo: string, relacao: string): boolean;
  // General relation check between any two node types.
  isRelationAllowed(sourceTipo: string, targetTipo: string, relacao: string): boolean;
  // Valid insight targets (and relations) for a source node of the given type.
  insightTargets(tipo: string): InsightTarget[];
}

export const RELATION_RULES_PORT = Symbol('RELATION_RULES_PORT');
