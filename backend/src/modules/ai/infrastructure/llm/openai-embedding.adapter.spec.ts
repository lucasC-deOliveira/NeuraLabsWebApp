import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  OpenAiEmbeddingAdapter,
  type EmbeddingClient,
  type EmbeddingParams,
} from './openai-embedding.adapter';
import { embeddingConfigFromEnv } from './embedding-config.factory';
import type { EmbeddingConfig } from '../../domain/ports/embedding-config';

const CONFIG: EmbeddingConfig = {
  baseUrl: 'http://embeddings:80/v1',
  model: 'intfloat/multilingual-e5-small',
  apiKey: 'tei-local',
  inputPrefix: 'query: ',
};

class FakeEmbeddingClient implements EmbeddingClient {
  public calls: EmbeddingParams[] = [];
  public embeddings = {
    create: (params: EmbeddingParams) => {
      this.calls.push(params);
      return Promise.resolve({ data: params.input.map(() => ({ embedding: [0.1, 0.2] })) });
    },
  };
}

// Exposes the client seam so the spec can inspect what was sent over the wire.
class TestableEmbeddingAdapter extends OpenAiEmbeddingAdapter {
  constructor(
    config: EmbeddingConfig,
    private readonly fake: FakeEmbeddingClient,
  ) {
    super(config);
  }
  protected createClient(): EmbeddingClient {
    return this.fake;
  }
}

describe('OpenAiEmbeddingAdapter', () => {
  it('prefixes every input, as the e5 family requires', async () => {
    const fake = new FakeEmbeddingClient();

    await new TestableEmbeddingAdapter(CONFIG, fake).embed('u1', ['Pilha', 'Fila']);

    expect(fake.calls[0].input).toEqual(['query: Pilha', 'query: Fila']);
    expect(fake.calls[0].model).toBe('intfloat/multilingual-e5-small');
  });

  it('omits `dimensions` for fixed-size models, which reject the parameter', async () => {
    const fake = new FakeEmbeddingClient();

    await new TestableEmbeddingAdapter(CONFIG, fake).embed('u1', ['Pilha']);

    expect(fake.calls[0]).not.toHaveProperty('dimensions');
  });

  it('sends `dimensions` when the configured model supports truncation', async () => {
    const fake = new FakeEmbeddingClient();
    const config = { ...CONFIG, dimensions: 512, inputPrefix: '' };

    await new TestableEmbeddingAdapter(config, fake).embed('u1', ['Pilha']);

    expect(fake.calls[0].dimensions).toBe(512);
    expect(fake.calls[0].input).toEqual(['Pilha']);
  });

  it('does not call the provider for an empty input', async () => {
    const fake = new FakeEmbeddingClient();

    expect(await new TestableEmbeddingAdapter(CONFIG, fake).embed('u1', [])).toEqual([]);
    expect(fake.calls).toHaveLength(0);
  });
});

describe('embeddingConfigFromEnv', () => {
  const saved = { ...process.env };
  beforeEach(() => {
    delete process.env.EMBEDDINGS_BASE_URL;
    delete process.env.EMBEDDINGS_MODEL;
    delete process.env.EMBEDDINGS_DIMENSIONS;
    delete process.env.EMBEDDINGS_PREFIX;
  });
  afterEach(() => {
    process.env = { ...saved };
  });

  it('defaults to the bundled TEI container and its model', () => {
    const config = embeddingConfigFromEnv();

    expect(config.baseUrl).toBe('http://embeddings:80/v1');
    expect(config.model).toBe('intfloat/multilingual-e5-small');
    expect(config.inputPrefix).toBe('query: ');
    expect(config.dimensions).toBeUndefined();
  });

  it('lets the environment switch provider, model and dimensions', () => {
    process.env.EMBEDDINGS_BASE_URL = 'https://api.openai.com/v1';
    process.env.EMBEDDINGS_MODEL = 'text-embedding-3-small';
    process.env.EMBEDDINGS_DIMENSIONS = '512';
    process.env.EMBEDDINGS_PREFIX = '';

    const config = embeddingConfigFromEnv();

    expect(config).toMatchObject({
      baseUrl: 'https://api.openai.com/v1',
      model: 'text-embedding-3-small',
      dimensions: 512,
      inputPrefix: '',
    });
  });

  it('ignores a non-numeric dimensions setting instead of sending NaN', () => {
    process.env.EMBEDDINGS_DIMENSIONS = 'abc';

    expect(embeddingConfigFromEnv().dimensions).toBeUndefined();
  });
});
