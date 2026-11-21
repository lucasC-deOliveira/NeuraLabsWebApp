// Config de IA (OpenAI) → API NestJS.
import { apiFetch } from "./api";
import { accountStorageUsage, type AccountStorageUsage } from "@contracts/account-storage";

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

/** Restores the server's default AI provider by removing the account override.
 * @example await resetConfigAI()
 */
export function resetConfigAI(): Promise<{ success: boolean }> {
  return apiFetch("/settings/ai", { method: "DELETE" });
}

/** Reads the signed-in account's estimated server storage.
 * @example const usage = await getAccountStorage()
 */
export function getAccountStorage(): Promise<AccountStorageUsage> {
  return apiFetch("/settings/storage", { schema: accountStorageUsage });
}
