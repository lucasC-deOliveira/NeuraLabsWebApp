// The user's AI provider configuration (OpenAI-compatible).
export interface ConfigAi {
  apiKey: string;
  baseUrl: string;
  modelo: string;
}

// Persistence port for the per-user AI configuration.
export interface ConfigAiRepository {
  load(userId: string): Promise<ConfigAi | null>;
  save(userId: string, data: ConfigAi): Promise<void>;
}

export const CONFIG_AI_REPOSITORY = Symbol('CONFIG_AI_REPOSITORY');
