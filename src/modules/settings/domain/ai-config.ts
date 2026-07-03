// AI connection config — the credentials used for every AI call. Pure domain:
// default fallback and the save-time validation live here, framework-free.

export interface AiConfig {
  apiKey: string;
  baseUrl: string;
  modelo: string;
}

// Defaults shown when the user has no saved config yet (OpenRouter free tier).
export const DEFAULT_AI_CONFIG: AiConfig = {
  apiKey: "",
  baseUrl: "https://openrouter.ai/api/v1",
  modelo: "qwen/qwen3.6-plus:free",
};

/** Loaded config or the defaults when nothing is saved. */
export function resolveAiConfig(loaded: AiConfig | null): AiConfig {
  return loaded ?? DEFAULT_AI_CONFIG;
}

/** Returns a user-facing (pt-BR) error, or `null` when the config can be saved. */
export function validateAiConfig(apiKey: string): string | null {
  if (!apiKey.trim()) return "A API key e obrigatoria.";
  return null;
}
