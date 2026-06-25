// Published interface of the graph context's relation rules, consumed by the AI
// context (which must not import another context's domain directly). The binding
// to the concrete graph rules is wired in the AI module.
export interface RelationRulesPort {
  // Allowed relations for a NOTA pointing at a target of the given type.
  allowedNotaRelations(targetTipo: string): string[];
  isNotaRelationAllowed(targetTipo: string, relacao: string): boolean;
}

export const RELATION_RULES_PORT = Symbol('RELATION_RULES_PORT');
