// Anti-Corruption Layer for the LLM: the core speaks this port; only the adapter
// knows the concrete provider (OpenAI). All completions run in JSON-object mode.
export type LlmRole = 'system' | 'user' | 'assistant';

export interface LlmMessage {
  role: LlmRole;
  content: string;
}

export interface LlmRequest {
  userId: string;
  messages: LlmMessage[];
  temperature?: number;
  maxTokens?: number;
}

export interface LlmPort {
  // Returns the completion text, or '' when the model returns nothing.
  complete(request: LlmRequest): Promise<string>;
}

export const LLM_PORT = Symbol('LLM_PORT');
