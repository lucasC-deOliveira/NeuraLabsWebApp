// Public surface of the `content` shared kernel (concept hierarchy + staging).
// PURE entry — domain/application/infra only, no React — so domain/application
// consumers can import it without pulling in presentation. React components live
// in the sibling "@/modules/content/ui" barrel. Consumers import from these
// instead of deep paths; internal files use relative imports (avoids cycles).
// Test-only helpers live under "@/modules/content/testing" (not re-exported here).

// domain — concept hierarchy
export type {
  ConceitoNode,
  RelTopicoConceitoGroup,
  TopicoEntry,
  RelAssuntoTopicoGroup,
  ConceitoArvore,
  FlatConcept,
  ConceptContext,
} from "./domain/concept-tree.types";
export {
  flattenConceptTree,
  getTopicosForAssunto,
  filterFlatConcepts,
  findTopicName,
  countSelectedInTopico,
  countSelectedInAssunto,
  type FlattenedTree,
} from "./domain/services/concept-tree";

// domain — staging model
export {
  buildPendingConcept,
  collectNewTopics,
  type StagedRelation,
  type PendingConcept,
  type PendingTopic,
  type PendingAssunto,
  type BuiltConcept,
} from "./domain/concept-draft";

// application
export type { ContentPort } from "./application/ports/content.port";
export { persistStagedConcepts, type StagedConcepts } from "./application/use-cases/persist-staged-concepts";

// infra — composed adapter singleton
export { contentHttp, HttpContentAdapter } from "./infra/http";
