import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { OpenAI } from 'openai';
import { AI_CONFIG_RESOLVER, type AiConfigResolver } from '../../domain/ports/ai-config-resolver';
import type { EmbeddingPort } from '../../domain/ports/embedding-port';
import { TokenUsageService, type RawUsage } from '../../../../token-usage/token-usage.service';

// text-embedding-3-small at 512 dims: multilingual (maps "Pilha" ≈ "Stack") and
// cheap; 512 dims cuts the O(n²) cosine cost a third vs the default 1536.
const EMBEDDING_MODEL = 'text-embedding-3-small';
const EMBEDDING_DIMENSIONS = 512;
const BATCH_SIZE = 256;

// Minimal slice of the OpenAI embeddings API this adapter relies on — keeps the
// SDK surface from leaking and makes the adapter testable via createClient().
export interface EmbeddingParams {
  model: string;
  input: string[];
  dimensions: number;
}
export interface EmbeddingClient {
  embeddings: {
    create(
      params: EmbeddingParams,
    ): Promise<{ data: Array<{ embedding: number[] }>; usage?: RawUsage }>;
  };
}

// ACL over OpenAI embeddings: resolves the user's config (key/baseUrl) and embeds
// in batches. The only place besides the LLM adapter that imports the OpenAI SDK.
@Injectable()
export class OpenAiEmbeddingAdapter implements EmbeddingPort {
  constructor(
    @Inject(AI_CONFIG_RESOLVER) private readonly config: AiConfigResolver,
    private readonly tokens?: TokenUsageService,
  ) {}

  async embed(userId: string, texts: string[]): Promise<number[][]> {
    if (!texts.length) return [];
    const cfg = await this.config.resolve(userId);
    if (!cfg.apiKey)
      throw new BadRequestException('API key não configurada. Configure em Configurações.');
    const client = this.createClient({ apiKey: cfg.apiKey, baseURL: cfg.baseUrl });
    const out: number[][] = [];
    for (let i = 0; i < texts.length; i += BATCH_SIZE) {
      out.push(...(await this.embedBatch(client, userId, texts.slice(i, i + BATCH_SIZE))));
    }
    return out;
  }

  private async embedBatch(
    client: EmbeddingClient,
    userId: string,
    input: string[],
  ): Promise<number[][]> {
    const res = await client.embeddings.create({
      model: EMBEDDING_MODEL,
      input,
      dimensions: EMBEDDING_DIMENSIONS,
    });
    this.tokens?.record(userId, res.usage);
    return res.data.map((d) => d.embedding);
  }

  // Seam for tests; production builds a real OpenAI client.
  protected createClient(config: { apiKey: string; baseURL: string }): EmbeddingClient {
    return new OpenAI(config) as unknown as EmbeddingClient;
  }
}
