import type { VaultFile } from "@/lib/vault-bridge";
import { nodeRelPath, serializeNode, type VaultNode } from "@/lib/vault-format";
import { findVaultGraphFolder } from "@/lib/vault-graph-manifest";
import type { NodeCreationPort } from "../../application/use-cases/create-graph-node";
import type { GraphNodesPort } from "../../application/ports/graph-nodes.port";
import { makeVaultGraphEdges, type VaultEdgeFiles } from "./graph-vault-edges";
import { graphVaultEntries } from "./graph-vault-reader";
import { attachVaultConcept } from "./existing-vault-concepts";

export interface VaultNodeCreationFiles extends VaultEdgeFiles {
  write(dir: string, files: VaultFile[]): Promise<{ written: number }>;
}

export type VaultGraphNodeCreation = NodeCreationPort & Pick<GraphNodesPort, "createBaralhoNode">;

function textField(payload: Record<string, unknown>, key: string): string {
  const value = payload[key];
  return typeof value === "string" ? value : "";
}

function markdownNode(base: Pick<VaultNode, "id" | "grafoId" | "relacoes">, type: string, fields: Record<string, unknown>): VaultNode {
  const text = (key: string): string => textField(fields, key);
  switch (type) {
    case "ASSUNTO":
    case "TOPICO":
    case "CONCEITO":
      return { ...base, tipo: type, nome: text("nome"), descricao: text("descricao") || null };
    case "FLASHCARD":
      return { ...base, tipo: type, pergunta: text("pergunta"), resposta: text("resposta") };
    case "NOTA":
      return {
        ...base, tipo: type, titulo: text("titulo"), conteudo: text("conteudo"),
        tipoNota: text("tipoNota") || "PERMANENTE", subtipo: text("subtipo"), fonte: text("fonte") || null,
      };
    default:
      throw new Error("Este tipo de nó precisa ser criado no servidor.");
  }
}

async function vaultNodeDirectory(files: VaultNodeCreationFiles, graphId: string): Promise<string> {
  const folder = findVaultGraphFolder(await files.listGraphFolders(), graphId);
  if (!folder) throw new Error("Grafo não encontrado no vault.");
  return folder.directory;
}

async function writeNewNode(files: VaultNodeCreationFiles, directory: string, node: VaultNode): Promise<{ success: boolean; nodeId: string }> {
  const result = await files.write(directory, [{ relPath: nodeRelPath(node), content: serializeNode(node) }]);
  if (result.written !== 1) throw new Error("Não foi possível gravar o nó no vault.");
  return { success: true, nodeId: node.id };
}

async function createLocalDeck(
  files: VaultNodeCreationFiles, graphId: string, id: string, title: string, flashcardIds: string[],
): Promise<{ success: boolean; nodeId: string }> {
  const directory = await vaultNodeDirectory(files, graphId);
  const entries = graphVaultEntries(await files.read(directory), graphId);
  const flashcards = new Set(entries.filter(({ node }) => node.tipo === "FLASHCARD").map(({ node }) => node.id));
  const selected = [...new Set(flashcardIds)];
  if (selected.some((cardId) => !flashcards.has(cardId))) throw new Error("Um dos flashcards não está no grafo do vault.");
  return writeNewNode(files, directory, {
    id, grafoId: graphId, tipo: "BARALHO", titulo: title,
    relacoes: selected.map((alvo) => ({ rel: "CONTEM", alvo, peso: 1 })),
  });
}

/** Creates Markdown nodes and links in the existing vault graph.
 * @example const creation = makeVaultGraphNodeCreation(desktop.vault)
 */
export function makeVaultGraphNodeCreation(
  files: VaultNodeCreationFiles, nextId = (): string => crypto.randomUUID(),
): VaultGraphNodeCreation {
  const edges = makeVaultGraphEdges(files);
  return {
    createEdge: edges.createEdge,
    async addNodeToGraph(graphId, type, fields): Promise<{ success: boolean; nodeId: string }> {
      if (type === "CONCEITO" && typeof fields.entityId === "string") {
        return attachVaultConcept(files, graphId, fields.entityId);
      }
      const node = markdownNode({ id: nextId(), grafoId: graphId, relacoes: [] }, type, fields);
      return writeNewNode(files, await vaultNodeDirectory(files, graphId), node);
    },
    createBaralhoNode(graphId, title, flashcardIds): Promise<{ success: boolean; nodeId: string }> {
      return createLocalDeck(files, graphId, nextId(), title, flashcardIds);
    },
  };
}
