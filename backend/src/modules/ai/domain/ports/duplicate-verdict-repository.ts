// Incremental cache for the hybrid duplicate detector: per graph, the LLM verdict
// for each candidate-cluster signature. On re-run only clusters with a new
// signature (a new/renamed node) go back to the LLM; the rest reuse their verdict.

export interface ClusterVerdict {
  refIds: string[]; // ids the LLM confirmed as one duplicate group
  sugestao: string;
}

// signature (cluster membership + normalized names) → confirmed groups (0..n).
export type VerdictMap = Record<string, ClusterVerdict[]>;

export interface DuplicateVerdictRepository {
  load(grafoId: string): Promise<VerdictMap>;
  save(userId: string, grafoId: string, dados: VerdictMap): Promise<void>;
}

export const DUPLICATE_VERDICT_REPOSITORY = Symbol('DUPLICATE_VERDICT_REPOSITORY');
