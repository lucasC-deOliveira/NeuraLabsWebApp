import type { ConfigAi, ConfigAiRepository } from '../../domain/ports/config-ai-repository';

/**
 * Returns the user's stored AI configuration, or null when none is saved.
 * @example getConfigAi.execute('u1')
 */
export class GetConfigAiUseCase {
  constructor(private readonly repo: ConfigAiRepository) {}

  execute(userId: string): Promise<ConfigAi | null> {
    return this.repo.load(userId);
  }
}
