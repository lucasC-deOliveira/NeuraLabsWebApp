import { chatWithVaultSources } from "@/lib/ai-api";
import { getToken } from "@/lib/api";
import { desktop } from "@/lib/vault-bridge";
import { vaultNodeLabel } from "@/lib/vault-format";
import type { VaultChatResponse } from "@contracts/vault-chat";
import type { VaultChatPort } from "../../application/ports/vault-chat.port";
import type { VaultChatDocument } from "../../domain/services/vault-chat-search";
import { graphVaultEntries, type VaultGraphSource } from "./graph-vault-reader";

function linkIds(body: string): string[] {
  return [...body.matchAll(/\[\[([^\]|#]+)(?:[|#][^\]]*)?\]\]/g)]
    .map((match) => match[1].trim().split(/[/\\]/).at(-1)!.replace(/\.md$/i, ""))
    .map((name) => name.split("--").at(-1) ?? name);
}

function vaultChatDocuments(graphId: string | null, entries: VaultGraphSource["entries"]): VaultChatDocument[] {
  return entries.flatMap(({ node, file }) => {
    if (!/^[a-zA-Z0-9][a-zA-Z0-9_-]{0,159}$/.test(node.id)) return [];
    const body = file.content.replace(/^\uFEFF?---\r?\n[\s\S]*?\r?\n---(?:\r?\n|$)/, "").trim();
    return [{
      id: node.id, graphId, nome: vaultNodeLabel(node).trim() || node.id, tipo: node.tipo, noteRole: node.tipoNota,
      body, linkedIds: [...new Set([...linkIds(body), ...node.relacoes.map(({ alvo }) => alvo)])],
    }];
  });
}

async function readOtherVaultDocuments(graphId: string): Promise<VaultChatDocument[]> {
  const folders = await desktop.vault.listGraphFolders();
  const other = folders.filter((folder) => folder.id !== graphId);
  const read = await Promise.allSettled(other.map(async (folder) =>
    vaultChatDocuments(folder.id, graphVaultEntries(await desktop.vault.read(folder.directory), folder.id))));
  return read.flatMap((result) => result.status === "fulfilled" ? result.value : []);
}

async function readSharedParaDocuments(): Promise<VaultChatDocument[]> {
  const root = await desktop.vault.getPath();
  if (!root) return [];
  return vaultChatDocuments(null, graphVaultEntries(await desktop.vault.read(root), ""));
}

function joinVaultChatDocuments(documents: VaultChatDocument[]): VaultChatDocument[] {
  const byId = new Map<string, VaultChatDocument>();
  for (const document of documents) {
    const existing = byId.get(document.id);
    const linkedIds = [...new Set([...(existing?.linkedIds ?? []), ...document.linkedIds])];
    byId.set(document.id, { ...document, linkedIds });
  }
  return [...byId.values()];
}

/** Creates a scoped reader for the currently open vault graph.
 * @example const chat = makeVaultChat(graphId, vaultSource)
 */
export function makeVaultChat(graphId: string, source: VaultGraphSource): VaultChatPort {
  return {
    async documents(scope): Promise<VaultChatDocument[]> {
      const current = vaultChatDocuments(graphId, source.entries);
      if (scope === "graph") return current;
      const [shared, peers] = await Promise.all([
        readSharedParaDocuments().catch(() => []),
        readOtherVaultDocuments(graphId),
      ]);
      return joinVaultChatDocuments([...shared, ...peers, ...current]);
    },
    async answer(request): Promise<VaultChatResponse> {
      if (!getToken()) throw new Error("The vault chat answer requires a server session.");
      return chatWithVaultSources(request);
    },
  };
}
