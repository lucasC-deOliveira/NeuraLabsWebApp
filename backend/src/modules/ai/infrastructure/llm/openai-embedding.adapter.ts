import { Inject, Injectable } from '@nestjs/common';
import { OpenAI } from 'openai';
import { EMBEDDING_CONFIG, type EmbeddingConfig } from '../../domain/ports/embedding-config';
import type { EmbeddingPort } from '../../domain/ports/embedding-port';
import { TokenUsageService, type RawUsage } from '../../../../token-usage/token-usage.service';

// TEI rejects anything over its --max-client-batch-size (32 by default) with a
// 413; OpenAI accepts far more. 32 is the value that works against both.
const BATCH_SIZE = 32;

// Minimal slice of the OpenAI embeddings API this adapter relies on — keeps the
// SDK surface from leaking and makes the adapter testable via createClient().
export interface EmbeddingParams {
  model: string;
  input: string[];
  dimensions?: number;
}
export interface EmbeddingClient {
  embeddings: {
    create(
      params: EmbeddingParams,
    ): Promise<{ data: Array<{ embedding: number[] }>; usage?: RawUsage }>;
  };
}

// ACL over any OpenAI-protocol embeddings endpoint — by default a local TEI
// container serving a HuggingFace model, but an OpenAI key works unchanged.
// Config comes from EMBEDDING_CONFIG, never from the chat provider's config.
@Injectable()
export class OpenAiEmbeddingAdapter implements EmbeddingPort {
  constructor(
    @Inject(EMBEDDING_CONFIG) private readonly config: EmbeddingConfig,
    private readonly tokens?: TokenUsageService,
  ) {}

  async embed(userId: string, texts: string[]): Promise<number[][]> {
    if (!texts.length) return [];
    const client = this.createClient({
      apiKey: this.config.apiKey,
      baseURL: this.config.baseUrl,
    });
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
    const res = await client.embeddings.create(this.buildParams(input));
    this.tokens?.record(userId, res.usage);
    return res.data.map((d) => d.embedding);
  }

  private buildParams(input: string[]): EmbeddingParams {
    const params: EmbeddingParams = {
      model: this.config.model,
      input: input.map((text) => `${this.config.inputPrefix}${text}`),
    };
    if (this.config.dimensions) params.dimensions = this.config.dimensions;
    return params;
  }

  // Seam for tests; production builds a real OpenAI client.
  protected createClient(config: { apiKey: string; baseURL: string }): EmbeddingClient {
    return new OpenAI(config) as unknown as EmbeddingClient;
  }
}
