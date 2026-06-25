import type { ConfigAiRepository } from '../../domain/ports/config-ai-repository';

export interface ResolvedAiConfig {
  apiKey: string;
  baseUrl: string;
  model: string;
}

const DEFAULT_BASE_URL = 'https://api.openai.com/v1';
const DEFAULT_MODEL = 'gpt-4o-mini';

/**
 * Resolves the effective AI config: the user's stored config first, falling back
 * to environment variables. Used by the AI features.
 * @example resolveAiConfig.execute('u1')
 */
export class ResolveAiConfigUseCase {
  constructor(private readonly repo: ConfigAiRepository) {}

  async execute(userId: string): Promise<ResolvedAiConfig> {
    const db = await this.repo.load(userId).catch(() => null);
    return {
      apiKey: db?.apiKey ?? process.env.OPENAI_API_KEY ?? '',
      baseUrl: db?.baseUrl ?? process.env.OPENAI_BASE_URL ?? DEFAULT_BASE_URL,
      model: db?.modelo ?? process.env.OPENAI_MODEL ?? DEFAULT_MODEL,
    };
  }
}
