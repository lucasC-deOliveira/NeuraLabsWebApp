import type { VaultFile, VaultGraphFolder } from "@/lib/vault-bridge";
import { findVaultGraphFolder } from "@/lib/vault-graph-manifest";
import { nodeRelPath, serializeNode, type VaultNode } from "@/lib/vault-format";
import type { AvailableItem } from "../../application/ports/graph-data.port";
import { graphVaultEntries } from "./graph-vault-reader";

export interface VaultConceptFiles {
  listGraphFolders(): Promise<VaultGraphFolder[]>;
  read(dir: string): Promise<VaultFile[]>;
  write(dir: string, files: VaultFile[]): Promise<{ written: number }>;
}

async function graphNodes(files: VaultConceptFiles, folder: VaultGraphFolder): Promise<VaultNode[]> {
  return graphVaultEntries(await files.read(folder.directory), folder.id).map(({ node }) => node);
}

async function readConceptSources(files: VaultConceptFiles, folders: VaultGraphFolder[], graphId: string): Promise<VaultNode[]> {
  const sources = folders.filter((folder) => folder.id !== graphId);
  const nodes = await Promise.all(sources.map((folder) => graphNodes(files, folder)));
  return nodes.flat().filter((node) => node.tipo === "CONCEITO");
}

function destinationFolder(folders: VaultGraphFolder[], graphId: string): VaultGraphFolder {
  const destination = findVaultGraphFolder(folders, graphId);
  if (!destination) throw new Error("Grafo não encontrado no vault.");
  return destination;
}

/** Lists concepts from other vault graphs that are absent from this graph.
 * @example await listExistingVaultConcepts(desktop.vault, graphId)
 */
export async function listExistingVaultConcepts(files: VaultConceptFiles, graphId: string): Promise<AvailableItem[]> {
  const folders = await files.listGraphFolders();
  const [current, sources] = await Promise.all([
    graphNodes(files, destinationFolder(folders, graphId)),
    readConceptSources(files, folders, graphId),
  ]);
  const present = new Set(current.map(({ id }) => id));
  const candidates = new Map(sources.filter(({ id }) => !present.has(id)).map((node) => [node.id, node]));
  return [...candidates.values()].map((node) => ({
    id: node.id, label: node.nome ?? node.id, fullText: node.descricao ?? "", tipo: "CONCEITO", hierarquia: "Vault",
  })).sort((left, right) => left.label.localeCompare(right.label));
}

function sharedConcept(sources: VaultNode[], id: string): VaultNode {
  const [first, ...copies] = sources.filter((node) => node.id === id);
  if (!first) throw new Error("Conceito não encontrado nos outros grafos do vault.");
  if (copies.some((copy) => copy.nome !== first.nome || copy.descricao !== first.descricao)) {
    throw new Error("Este conceito tem versões diferentes no vault. Confira as cópias antes de adicioná-lo.");
  }
  return first;
}

/** Adds another graph membership while preserving the concept's identity.
 * @example await attachVaultConcept(desktop.vault, graphId, conceptId)
 */
export async function attachVaultConcept(files: VaultConceptFiles, graphId: string, conceptId: string): Promise<{ success: boolean; nodeId: string }> {
  const folders = await files.listGraphFolders();
  const destination = destinationFolder(folders, graphId);
  const current = await graphNodes(files, destination);
  if (current.some((node) => node.id === conceptId && node.tipo === "CONCEITO")) return { success: true, nodeId: conceptId };
  const source = sharedConcept(await readConceptSources(files, folders, graphId), conceptId);
  const node: VaultNode = {
    id: source.id, grafoId: graphId, tipo: "CONCEITO", nome: source.nome, descricao: source.descricao,
    nivelDominio: source.nivelDominio, relacoes: destination.layout === "shared-para" ? [] : source.relacoes,
  };
  const { written } = await files.write(destination.directory, [{
    relPath: nodeRelPath(node), content: serializeNode(node),
    ...(destination.layout === "shared-para" ? { preserveSharedContent: true } : {}),
  }]);
  if (written !== 1) throw new Error("Não foi possível adicionar o conceito ao grafo do vault.");
  return { success: true, nodeId: conceptId };
}
