import type { EmbeddingConfig } from '../../domain/ports/embedding-config';

// Local TEI container from docker-compose. Not the chat provider: vectors and
// chat are different endpoints here (see EmbeddingConfig).
const DEFAULT_BASE_URL = 'http://embeddings:80/v1';

// multilingual-e5-small: 384 dims, genuinely multilingual (the acervo mixes pt,
// en and ja), small enough to embed the whole concept layer on CPU in seconds.
const DEFAULT_MODEL = 'intfloat/multilingual-e5-small';

// e5 asks for this on every input, retrieval or not.
const DEFAULT_PREFIX = 'query: ';

/**
 * Reads the embeddings provider config from the environment, defaulting to the
 * bundled TEI container. Changing the model invalidates every stored vector:
 * dimensions and the semantic space both change.
 * @example embeddingConfigFromEnv() // → { baseUrl: 'http://embeddings:80/v1', ... }
 */
export function embeddingConfigFromEnv(): EmbeddingConfig {
  const dimensions = Number(process.env.EMBEDDINGS_DIMENSIONS ?? '');
  return {
    baseUrl: process.env.EMBEDDINGS_BASE_URL ?? DEFAULT_BASE_URL,
    model: process.env.EMBEDDINGS_MODEL ?? DEFAULT_MODEL,
    // TEI ignores it; a non-empty string is required to build the client at all.
    apiKey: process.env.EMBEDDINGS_API_KEY ?? 'tei-local',
    dimensions: Number.isFinite(dimensions) && dimensions > 0 ? dimensions : undefined,
    inputPrefix: process.env.EMBEDDINGS_PREFIX ?? DEFAULT_PREFIX,
  };
}
