import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { GetConfigAiUseCase } from './get-config-ai.use-case';
import { SaveConfigAiUseCase } from './save-config-ai.use-case';
import { ResolveAiConfigUseCase } from './resolve-ai-config.use-case';
import type { ConfigAi, ConfigAiRepository } from '../../domain/ports/config-ai-repository';

class FakeConfigAiRepository implements ConfigAiRepository {
  saved: Array<{ userId: string; data: ConfigAi }> = [];
  constructor(private stored: ConfigAi | null = null) {}
  async load(): Promise<ConfigAi | null> {
    return this.stored;
  }
  async save(userId: string, data: ConfigAi): Promise<void> {
    this.saved.push({ userId, data });
    this.stored = data;
  }
}

const cfg: ConfigAi = { apiKey: 'k', baseUrl: 'https://x', modelo: 'm' };

describe('GetConfigAiUseCase', () => {
  it('returns the stored config', async () => {
    expect(await new GetConfigAiUseCase(new FakeConfigAiRepository(cfg)).execute('u1')).toEqual(
      cfg,
    );
  });
});

describe('SaveConfigAiUseCase', () => {
  it('upserts the config and reports success', async () => {
    const repo = new FakeConfigAiRepository();
    const res = await new SaveConfigAiUseCase(repo).execute('u1', cfg);
    expect(res).toEqual({ success: true });
    expect(repo.saved).toEqual([{ userId: 'u1', data: cfg }]);
  });
});

describe('ResolveAiConfigUseCase', () => {
  const env = process.env;
  beforeEach(() => {
    process.env = { ...env };
    delete process.env.OPENAI_API_KEY;
    delete process.env.OPENAI_BASE_URL;
    delete process.env.OPENAI_MODEL;
  });
  afterEach(() => {
    process.env = env;
  });

  it('prefers the stored config', async () => {
    const res = await new ResolveAiConfigUseCase(new FakeConfigAiRepository(cfg)).execute('u1');
    expect(res).toEqual({ apiKey: 'k', baseUrl: 'https://x', model: 'm' });
  });

  it('falls back to env vars and defaults when there is no stored config', async () => {
    process.env.OPENAI_API_KEY = 'env-key';
    const res = await new ResolveAiConfigUseCase(new FakeConfigAiRepository(null)).execute('u1');
    expect(res).toEqual({
      apiKey: 'env-key',
      baseUrl: 'https://api.openai.com/v1',
      model: 'gpt-4o-mini',
    });
  });
});
