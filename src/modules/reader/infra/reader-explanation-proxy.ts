import type { VaultChatRequest, VaultChatResponse } from "@contracts/vault-chat";
import { chatWithVaultSources } from "@/lib/ai-api";

/** Uses the same configured proxy as the rest of the app for reading questions. */
export function askReaderExplanation(request: VaultChatRequest): Promise<VaultChatResponse> {
  return chatWithVaultSources(request, 180_000);
}
