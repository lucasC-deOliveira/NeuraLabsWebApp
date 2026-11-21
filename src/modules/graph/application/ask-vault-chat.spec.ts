import { expect, it } from "vitest";
import type { VaultChatRequest, VaultChatResponse } from "@contracts/vault-chat";
import type { VaultChatDocument } from "../domain/services/vault-chat-search";
import type { VaultChatInput, VaultChatPort, VaultChatScope } from "./ports/vault-chat.port";
import { askVaultChat } from "./ask-vault-chat";

const docs: VaultChatDocument[] = [
  { id: "n1", graphId: "g1", tipo: "NOTA", noteRole: "PERMANENTE", nome: "Repetição espaçada",
    body: "Intervalos regulares ajudam na retenção.", linkedIds: ["n2", "q1"] },
  { id: "n2", graphId: "g2", tipo: "NOTA", noteRole: "PERMANENTE", nome: "Retenção",
    body: "Recuperar um conceito fortalece a memória.", linkedIds: [] },
  { id: "q1", graphId: "g2", tipo: "QUESTION", nome: "Questão sobre repetição",
    body: "Repita a pergunta.", linkedIds: [] },
];

class FakeVaultChat implements VaultChatPort {
  requests: VaultChatRequest[] = [];
  scope: VaultChatScope | null = null;
  offline = false;

  async documents(scope: VaultChatScope): Promise<VaultChatDocument[]> {
    this.scope = scope;
    return scope === "graph" ? docs.filter(({ graphId }) => graphId === "g1") : docs;
  }

  async answer(request: VaultChatRequest): Promise<VaultChatResponse> {
    this.requests.push(request);
    if (this.offline) throw new Error("Server unavailable");
    return { answer: "Use intervalos regulares.", referencedNodes: [{ id: "n2", nome: "Retenção", tipo: "NOTA" }] };
  }
}

const input: VaultChatInput = { scope: "vault", filter: "PERMANENTE", question: "O que é repeticao?", history: [] };

it("matches accented titles, follows links in the selected scope and sends only filtered excerpts", async () => {
  const port = new FakeVaultChat();
  const result = await askVaultChat(port, input);
  expect(port.scope).toBe("vault");
  expect(port.requests[0].sources.map(({ id }) => id)).toEqual(["n1", "n2"]);
  expect(result.citations).toMatchObject([{ id: "n2", graphId: "g2" }]);
  expect(result.localOnly).toBe(false);
});

it("returns local excerpts on provider failure and keeps graph scope", async () => {
  const port = new FakeVaultChat();
  port.offline = true;
  const result = await askVaultChat(port, { ...input, scope: "graph" });
  expect(result.localOnly).toBe(true);
  expect(result.citations.map(({ id }) => id)).toEqual(["n1"]);
});

it("does not call the model when the current scope has no matches", async () => {
  const port = new FakeVaultChat();
  const result = await askVaultChat(port, { ...input, scope: "graph", question: "Geometria" });
  expect(result.citations).toEqual([]);
  expect(port.requests).toHaveLength(0);
});
