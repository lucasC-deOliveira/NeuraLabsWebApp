// The effective AI provider config the LLM adapter needs. Resolved by the
// settings context (stored config + env fallback), bound in the AI module.
export interface ResolvedAiConfig {
  apiKey: string;
  baseUrl: string;
  model: string;
}

export interface AiConfigResolver {
  resolve(userId: string): Promise<ResolvedAiConfig>;
}

export const AI_CONFIG_RESOLVER = Symbol('AI_CONFIG_RESOLVER');
