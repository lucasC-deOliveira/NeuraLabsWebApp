import type { VaultFile, VaultGraphFolder, VaultGraphMarkdownWrite } from "@/lib/vault-bridge";
import { replaceVaultRelations, type VaultNode, type VaultRelacao } from "@/lib/vault-format";
import { findVaultGraphFolder } from "@/lib/vault-graph-manifest";
import type { CreateEdgeData, GraphEdgesPort } from "../../application/ports/graph-edges.port";
import { getAllowedRelations } from "../../domain/services/relation-rules";
import { isValidGraphEdgeWeight } from "../../domain/services/edge-form-validation";
import { graphVaultEntries } from "./graph-vault-reader";

export interface VaultEdgeFiles {
  listGraphFolders(): Promise<VaultGraphFolder[]>;
  read(dir: string): Promise<VaultFile[]>;
  replaceGraphMarkdownBatch(writes: VaultGraphMarkdownWrite[]): Promise<boolean>;
}

interface EdgeKey { source: string; target: string; relation: string }
interface NodeFile { node: VaultNode; file: VaultFile }
interface EdgeViewFiles { dir: string; source?: NodeFile; target?: NodeFile }
interface EdgeChange { from?: VaultRelacao; to?: VaultRelacao; source: VaultNode; target: VaultNode }
interface EdgeFields { tipoRelacao?: string; peso?: number }
type EdgeMutation =
  | { create: CreateEdgeData }
  | { previous: string; update?: EdgeFields };

function edgeKey(source: string, target: string, relation: string): string {
  return JSON.stringify([source, target, relation]);
}

function decodeEdgeKey(id: string): EdgeKey {
  const key: unknown = JSON.parse(id);
  if (!Array.isArray(key) || key.length !== 3 || key.some((part) => typeof part !== "string" || !part)) {
    throw new Error("Identificador de relação inválido.");
  }
  const [source, target, relation] = key as [string, string, string];
  return { source, target, relation };
}

function uniqueNode(entries: NodeFile[], id: string): NodeFile | undefined {
  const matches = entries.filter(({ node }) => node.id === id);
  if (matches.length > 1) throw new Error("O nó precisa ter um único arquivo no vault.");
  return matches[0];
}

async function edgeFiles(files: VaultEdgeFiles, folder: VaultGraphFolder, key: Omit<EdgeKey, "relation">): Promise<EdgeViewFiles> {
  const dir = folder.directory;
  const entries = graphVaultEntries(await files.read(dir), folder.id);
  return { dir, source: uniqueNode(entries, key.source), target: uniqueNode(entries, key.target) };
}

function findRelation(node: VaultNode, target: string, relation?: string): VaultRelacao | undefined {
  const matches = node.relacoes.filter((link) => link.alvo === target && link.rel === relation);
  if (matches.length > 1) throw new Error("Há relações duplicadas no arquivo do vault.");
  return matches[0];
}

function changedRelation(source: VaultNode, target: VaultNode, rel: string, peso: number): VaultRelacao {
  if (source.id === target.id || !getAllowedRelations(source.tipo, target.tipo).includes(rel)) {
    throw new Error("Este tipo de relação não é permitido entre os nós selecionados.");
  }
  if (!isValidGraphEdgeWeight(peso)) throw new Error("O peso deve ser maior que 0 e no máximo 2.");
  return { rel, alvo: target.id, peso };
}

function planChange(view: EdgeViewFiles, previous: string | undefined, mutation: EdgeMutation): EdgeChange {
  if (!view.source || !view.target) throw new Error("Os dois nós precisam estar no grafo do vault.");
  const { node: source } = view.source;
  const { node: target } = view.target;
  const from = findRelation(source, target.id, previous);
  if (previous && !from) throw new Error("A relação foi alterada no vault. Reabra o editor.");
  const fields = "create" in mutation ? mutation.create : mutation.update;
  const to = fields ? validateNewLink(source, target, fields, from) : undefined;
  return { source, target, from, to };
}

function validateNewLink(source: VaultNode, target: VaultNode, fields: EdgeFields, from?: VaultRelacao): VaultRelacao {
  const to = changedRelation(source, target, fields.tipoRelacao ?? from?.rel ?? "", fields.peso ?? from?.peso ?? 1);
  if (to.rel !== from?.rel && findRelation(source, target.id, to.rel)) {
    throw new Error("Esta relação já existe.");
  }
  return to;
}

function checkPeerRelation(oldLink: VaultRelacao | undefined, newLink: VaultRelacao | undefined, change: EdgeChange): void {
  const expected = [change.from?.peso];
  const updatedWeight = change.to?.peso;
  if (oldLink === newLink) expected.push(updatedWeight);
  const oldConflicts = oldLink && !expected.includes(oldLink.peso);
  const newConflicts = newLink && newLink !== oldLink && (oldLink || newLink.peso !== updatedWeight);
  if (oldConflicts || newConflicts) {
    throw new Error("Outro grafo do vault tem uma versão diferente desta relação. Confira as cópias antes de salvar.");
  }
}

function assertReplicaTypes(source: VaultNode, target: VaultNode | undefined, change: EdgeChange): void {
  if (source.tipo !== change.source.tipo || (target && target.tipo !== change.target.tipo)) {
    throw new Error("Os tipos dos nós divergem entre os grafos do vault.");
  }
}

function replacementMarkdown(source: NodeFile, change: EdgeChange, oldLink?: VaultRelacao): string {
  const { node, file } = source;
  const newLink = findRelation(node, change.target.id, change.to?.rel);
  checkPeerRelation(oldLink, newLink, change);
  if (oldLink === newLink && newLink?.peso === change.to?.peso) return file.content;
  const remaining = node.relacoes.filter((link) => link !== oldLink && link !== newLink);
  const links = change.to ? [...remaining, change.to] : remaining;
  return replaceVaultRelations(file.content, links);
}

function fileWrite(dir: string, file: VaultFile, next = file.content): VaultGraphMarkdownWrite {
  const { relPath, content } = file;
  return { dir, relPath, expected: content, next };
}

function planViewWrites(view: EdgeViewFiles, change: EdgeChange): VaultGraphMarkdownWrite[] {
  const { source, target, dir } = view;
  if (!source) return [];
  const oldLink = findRelation(source.node, change.target.id, change.from?.rel);
  if (!target && !oldLink) return [];
  assertReplicaTypes(source.node, target?.node, change);
  const writes = [fileWrite(dir, source.file, replacementMarkdown(source, change, oldLink))];
  if (target && target.file.relPath !== source.file.relPath) writes.push(fileWrite(dir, target.file));
  return writes;
}

async function writeEdge(files: VaultEdgeFiles, graphId: string, mutation: EdgeMutation): Promise<string> {
  const folders = await files.listGraphFolders();
  const folder = findVaultGraphFolder(folders, graphId);
  if (!folder) throw new Error("Grafo não encontrado no vault.");
  const key = "previous" in mutation ? decodeEdgeKey(mutation.previous)
    : { source: mutation.create.sourceNodeId, target: mutation.create.targetNodeId, relation: undefined };
  const primary = await edgeFiles(files, folder, key);
  const change = planChange(primary, key.relation, mutation);
  const peers = await Promise.all(folders.filter(({ directory, layout }) =>
    directory !== primary.dir && folder.layout !== "shared-para" && layout !== "shared-para")
    .map((entry) => edgeFiles(files, entry, key)));
  const writes = [primary, ...peers].flatMap((view) => planViewWrites(view, change));
  if (!(await files.replaceGraphMarkdownBatch(writes))) {
    throw new Error("O arquivo mudou no vault. Reabra o editor e tente novamente.");
  }
  return edgeKey(key.source, key.target, change.to?.rel ?? key.relation ?? "");
}

/** Builds the relation editor adapter for a graph stored as Markdown.
 * @example const edges = makeVaultGraphEdges(desktop.vault)
 */
export function makeVaultGraphEdges(files: VaultEdgeFiles): GraphEdgesPort {
  return {
    async createEdge(graphId, create): Promise<{ success: boolean; edgeId: string }> {
      const edgeId = await writeEdge(files, graphId, { create });
      return { success: true, edgeId };
    },
    async updateEdge(previous, graphId, update): Promise<{ success: boolean }> {
      await writeEdge(files, graphId, { previous, update });
      return { success: true };
    },
    async deleteEdge(previous, graphId): Promise<{ success: boolean }> {
      await writeEdge(files, graphId, { previous });
      return { success: true };
    },
  };
}
