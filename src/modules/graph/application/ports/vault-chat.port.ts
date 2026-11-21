import type { VaultChatRequest, VaultChatResponse } from "@contracts/vault-chat";
import type { VaultChatDocument, VaultChatFilter, VaultChatMatch } from "../../domain/services/vault-chat-search";
import type { ChatHistoryItem } from "./graph-ai.port";

export type VaultChatScope = "graph" | "vault";

export interface VaultChatPort {
  documents(scope: VaultChatScope): Promise<VaultChatDocument[]>;
  answer(request: VaultChatRequest): Promise<VaultChatResponse>;
}

export interface VaultChatInput {
  question: string;
  history: ChatHistoryItem[];
  scope: VaultChatScope;
  filter: VaultChatFilter;
}

export interface VaultChatAnswer {
  answer: string;
  citations: VaultChatMatch[];
  localOnly: boolean;
}
