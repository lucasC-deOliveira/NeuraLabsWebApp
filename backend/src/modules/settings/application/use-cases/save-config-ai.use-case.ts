import type { ConfigAi, ConfigAiRepository } from '../../domain/ports/config-ai-repository';

/**
 * Saves (upserts) the user's AI configuration.
 * @example saveConfigAi.execute('u1', { apiKey, baseUrl, modelo })
 */
export class SaveConfigAiUseCase {
  constructor(private readonly repo: ConfigAiRepository) {}

  async execute(userId: string, data: ConfigAi): Promise<{ success: boolean }> {
    await this.repo.save(userId, data);
    return { success: true };
  }
}
