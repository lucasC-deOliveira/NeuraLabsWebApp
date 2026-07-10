// Anti-Corruption Layer for text embeddings: the core speaks this port; only the
// adapter knows the concrete provider (OpenAI text-embedding-*). Used by semantic
// duplicate detection to compare node names by vector similarity.
export interface EmbeddingPort {
  // Returns one embedding vector per input text, in the same order.
  embed(userId: string, texts: string[]): Promise<number[][]>;
}

export const EMBEDDING_PORT = Symbol('EMBEDDING_PORT');
