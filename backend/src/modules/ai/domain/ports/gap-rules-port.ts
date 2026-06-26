import type { InsightTarget } from './relation-rules-port';

// Published rules for the structural-gap feature: the valid (tipoNo, relacoes)
// combos a bridge node may use. Bound to the graph's relation rules in the module.
export interface GapRulesPort {
  gapTargets(): InsightTarget[];
}

export const GAP_RULES_PORT = Symbol('GAP_RULES_PORT');
