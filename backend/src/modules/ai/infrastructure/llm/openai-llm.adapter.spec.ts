import { describe, it, expect } from 'vitest';
import { BadRequestException } from '@nestjs/common';
import { OpenAiLlmAdapter, type ChatClient, type ChatParams } from './openai-llm.adapter';
import type { AiConfigResolver } from '../../domain/ports/ai-config-resolver';

type Config = { apiKey: string; baseUrl: string; model: string };

class FakeResolver implements AiConfigResolver {
  constructor(private readonly cfg: Config) {}
  async resolve(): Promise<Config> {
    return this.cfg;
  }
}

// Captures the params and returns a canned completion, replacing the OpenAI SDK.
class TestAdapter extends OpenAiLlmAdapter {
  lastParams: ChatParams | null = null;
  constructor(
    config: Config,
    private readonly content: string | null = '{"ok":1}',
  ) {
    super(new FakeResolver(config));
  }
  protected createClient(): ChatClient {
    return {
      chat: {
        completions: {
          create: async (params: ChatParams) => {
            this.lastParams = params;
            return { choices: [{ message: { content: this.content } }] };
          },
        },
      },
    };
  }
}

const cfg: Config = { apiKey: 'k', baseUrl: 'https://api', model: 'gpt-test' };
const request = { userId: 'u1', messages: [{ role: 'user' as const, content: 'hi' }] };

describe('OpenAiLlmAdapter', () => {
  it('returns the completion content', async () => {
    const adapter = new TestAdapter(cfg);
    expect(await adapter.complete(request)).toBe('{"ok":1}');
  });

  it('forwards model, messages and JSON mode; defaults the temperature to 0.3', async () => {
    const adapter = new TestAdapter(cfg);
    await adapter.complete(request);
    expect(adapter.lastParams).toMatchObject({
      model: 'gpt-test',
      temperature: 0.3,
      response_format: { type: 'json_object' },
      messages: request.messages,
    });
    expect(adapter.lastParams?.max_tokens).toBeUndefined();
  });

  it('passes through temperature and max_tokens when given', async () => {
    const adapter = new TestAdapter(cfg);
    await adapter.complete({ ...request, temperature: 0.5, maxTokens: 4000 });
    expect(adapter.lastParams).toMatchObject({ temperature: 0.5, max_tokens: 4000 });
  });

  it('returns an empty string when the model returns no content', async () => {
    const adapter = new TestAdapter(cfg, null);
    expect(await adapter.complete(request)).toBe('');
  });

  it('throws when the API key is not configured', async () => {
    const adapter = new TestAdapter({ ...cfg, apiKey: '' });
    await expect(adapter.complete(request)).rejects.toBeInstanceOf(BadRequestException);
  });
});
