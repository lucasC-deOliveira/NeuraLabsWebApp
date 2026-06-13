// Config de IA (OpenAI) → API NestJS.
import { apiFetch } from "./api";

export interface ConfigAIData {
  apiKey: string;
  baseUrl: string;
  modelo: string;
}

export function getConfigAI(): Promise<ConfigAIData | null> {
  return apiFetch<ConfigAIData | null>("/settings/ai");
}

export async function saveConfigAI(data: ConfigAIData): Promise<{ success: boolean }> {
  return apiFetch("/settings/ai", { method: "PUT", body: JSON.stringify(data) });
}
