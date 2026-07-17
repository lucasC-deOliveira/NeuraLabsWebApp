// Storage port for per-node embedding vectors, so semantic duplicate detection is
// incremental: only nodes whose name (`assinatura`) changed are re-embedded.

export interface StoredEmbedding {
  referenciaId: string;
  assinatura: string; // the exact text that was embedded — re-embed when it changes
  vetor: number[];
}

export interface EmbeddingUpsert {
  referenciaId: string;
  tipoNode: string;
  assinatura: string;
  vetor: number[];
}

export interface NodeEmbeddingRepository {
  // Vectors are global per user (node-as-system): load by the entity ids in view.
  load(userId: string, referenciaIds: string[]): Promise<StoredEmbedding[]>;
  upsertMany(userId: string, rows: EmbeddingUpsert[]): Promise<void>;
}

export const NODE_EMBEDDING_REPOSITORY = Symbol('NODE_EMBEDDING_REPOSITORY');
