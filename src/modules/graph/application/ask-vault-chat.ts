import type { VaultChatRequest } from "@contracts/vault-chat";
import type { VaultChatAnswer, VaultChatInput, VaultChatPort } from "./ports/vault-chat.port";
import { searchVaultChat, type VaultChatMatch } from "../domain/services/vault-chat-search";
import type { VaultChatDocument } from "../domain/services/vault-chat-search";

function chatRequest(input: VaultChatInput, matches: VaultChatMatch[]): VaultChatRequest {
  return {
    question: input.question,
    history: input.history.slice(-6).map(({ role, content }) => ({ role, content: content.slice(0, 4000) })),
    sources: matches.map(({ id, nome, tipo, excerpt }) => ({ id, nome, tipo, excerpt })),
  };
}

function matchesForQuestion(documents: VaultChatDocument[], input: VaultChatInput): VaultChatMatch[] {
  const matches = searchVaultChat(documents, input.question, input.filter);
  if (matches.length) return matches;
  const precedingQuestion = input.history.findLast(({ role }) => role === "user")?.content;
  return precedingQuestion ? searchVaultChat(documents, precedingQuestion, input.filter) : [];
}

/** Searches the chosen vault scope and asks the model only when there are sources.
 * @example const answer = await askVaultChat(port, question)
 */
export async function askVaultChat(port: VaultChatPort, input: VaultChatInput): Promise<VaultChatAnswer> {
  const documents = await port.documents(input.scope);
  const matches = matchesForQuestion(documents, input);
  if (matches.length === 0) {
    return { answer: "Nenhum trecho encontrado no recorte escolhido. Tente outro termo ou amplie a busca.", citations: [], localOnly: true };
  }
  try {
    const response = await port.answer(chatRequest(input, matches));
    const ids = new Set(response.referencedNodes.map(({ id }) => id));
    const citations = matches.filter(({ id }) => ids.has(id));
    if (response.answer && citations.length) return { answer: response.answer, citations, localOnly: false };
    return { answer: "A resposta da IA não trouxe referências verificáveis. Consulte os trechos encontrados.", citations: matches, localOnly: true };
  } catch {
    return { answer: "A IA está indisponível. Consulte os trechos encontrados no vault.", citations: matches, localOnly: true };
  }
}
