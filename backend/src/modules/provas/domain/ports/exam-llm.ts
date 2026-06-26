// Anti-Corruption Layer for the LLM used to parse uploaded exams. The provas
// core speaks this thin port; only the adapter knows the concrete provider
// (OpenAI) and how the user's AI config is resolved. Completions run in
// JSON-object mode.
export type ExamLlmRole = 'system' | 'user' | 'assistant';

export interface ExamLlmMessage {
  role: ExamLlmRole;
  content: string;
}

export interface ExamLlmRequest {
  userId: string;
  messages: ExamLlmMessage[];
  temperature?: number;
}

export interface ExamLlmPort {
  // Returns the completion text, or '' when the model returns nothing.
  complete(request: ExamLlmRequest): Promise<string>;
}

export const EXAM_LLM_PORT = Symbol('EXAM_LLM_PORT');
