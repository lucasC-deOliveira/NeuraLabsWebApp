// Shared, incremental embedding step for duplicate detection: reuses cached
// vectors and only (re)embeds nodes whose name changed. Returns vectors aligned
// to `nodes`. Takes the ports as arguments so it needs no DI of its own.
// Vectors are global per user (node-as-system), so the same entity shared by
// several graphs is embedded once.
import type { DuplicateGraphNode } from '../domain/ports/duplicate-nodes-repository';
import type { EmbeddingPort } from '../domain/ports/embedding-port';
import type {
  EmbeddingUpsert,
  NodeEmbeddingRepository,
  StoredEmbedding,
} from '../domain/ports/node-embedding-repository';

export async function ensureNodeVectors(
  embeddings: EmbeddingPort,
  store: NodeEmbeddingRepository,
  userId: string,
  nodes: DuplicateGraphNode[],
): Promise<number[][]> {
  const ids = nodes.map((n) => n.id);
  const byRef = new Map((await store.load(userId, ids)).map((s) => [s.referenciaId, s]));
  const missing = nodes.filter((n) => !isFresh(byRef.get(n.id), n));
  if (missing.length) await embedMissing(embeddings, store, userId, missing, byRef);
  return nodes.map((n) => byRef.get(n.id)?.vetor ?? []);
}

async function embedMissing(
  embeddings: EmbeddingPort,
  store: NodeEmbeddingRepository,
  userId: string,
  missing: DuplicateGraphNode[],
  byRef: Map<string, StoredEmbedding>,
): Promise<void> {
  const vectors = await embeddings.embed(
    userId,
    missing.map((n) => n.nome),
  );
  const rows = toEmbeddingRows(missing, vectors);
  await store.upsertMany(userId, rows);
  for (const r of rows) byRef.set(r.referenciaId, r);
}

function toEmbeddingRows(missing: DuplicateGraphNode[], vectors: number[][]): EmbeddingUpsert[] {
  return missing.map((n, i) => ({
    referenciaId: n.id,
    tipoNode: n.tipo,
    assinatura: n.nome,
    vetor: vectors[i] ?? [],
  }));
}

function isFresh(stored: StoredEmbedding | undefined, node: DuplicateGraphNode): boolean {
  return !!stored && stored.assinatura === node.nome && stored.vetor.length > 0;
}
