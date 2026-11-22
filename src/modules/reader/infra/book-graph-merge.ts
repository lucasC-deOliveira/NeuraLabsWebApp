import type { BookGraphIndex } from "@contracts/book-graph-source";
import type { VaultBookGraphWrite, VaultFile } from "@/lib/vault-bridge";
import { nodeRelPath, parseNode, replaceVaultNodeContent, replaceVaultRelations, serializeNode, type VaultNode } from "@/lib/vault-format";
import { bookEdgeKey } from "@/lib/book-graph-view";

export interface BookGraphBatch {
  nodes: VaultNode[];
  index: Pick<BookGraphIndex, "coverage" | "nodes" | "edges">;
  imported?: string;
}

interface MergeWorkspace {
  graphId: string;
  index: BookGraphIndex;
  nodes: Map<string, VaultNode>;
  keys: Map<string, string>;
  changed: Set<string>;
}

function normalize(text: string): string {
  return text.normalize("NFKC").toLowerCase().replace(/\s+/gu, " ").trim();
}

function nodeKey(node: VaultNode): string {
  return JSON.stringify([node.tipo, normalize(node.nome ?? node.titulo ?? node.pergunta ?? node.id),
    node.tipo === "FLASHCARD" ? normalize(node.resposta ?? "") : ""]);
}


function mergePages(first: number[] = [], second: number[] = []): number[] {
  return [...new Set([...first, ...second])].sort((left, right) => left - right);
}

function mergeBookText(first: string | null | undefined, second: string | null | undefined): string | undefined {
  if (!first || !second) return first || second || undefined;
  return first.includes(second) ? first : `${first}\n\n${second}`;
}

function mergeBookNode(current: VaultNode, incoming: VaultNode): VaultNode {
  return {
    ...current,
    descricao: mergeBookText(current.descricao, incoming.descricao),
    conteudo: mergeBookText(current.conteudo, incoming.conteudo),
    fonte: current.fonte || incoming.fonte,
  };
}

function mergeBatchNodes(workspace: MergeWorkspace, batch: BookGraphBatch, nextId: () => string): Map<string, string> {
  const aliases = new Map<string, string>();
  for (const incoming of batch.nodes) {
    const key = nodeKey(incoming);
    const id = workspace.keys.get(key) ?? nextId();
    const current = workspace.nodes.get(id);
    const node = current ? mergeBookNode(current, incoming) : { ...incoming, id, grafoId: workspace.graphId, relacoes: [] };
    workspace.nodes.set(id, node);
    workspace.keys.set(key, id);
    aliases.set(incoming.id, id);
    workspace.changed.add(id);
    workspace.index.nodes[id] = mergePages(workspace.index.nodes[id], batch.index.nodes[incoming.id]);
  }
  return aliases;
}

function mergeBatchEdges(workspace: MergeWorkspace, batch: BookGraphBatch, aliases: Map<string, string>): void {
  for (const incoming of batch.nodes) {
    for (const relation of incoming.relacoes) {
      mergeBookRelation(workspace, batch, aliases, incoming.id, relation);
    }
  }
}

function mergeBookRelation(
  workspace: MergeWorkspace, batch: BookGraphBatch, aliases: Map<string, string>, incoming: string, relation: VaultNode["relacoes"][number],
): void {
  const id = aliases.get(incoming)!;
  const node = workspace.nodes.get(id)!;
  const target = aliases.get(relation.alvo);
  if (!target || target === id) return;
  if (!node.relacoes.some(({ rel, alvo }) => rel === relation.rel && alvo === target)) {
    node.relacoes.push({ ...relation, alvo: target });
  }
  const edge = bookEdgeKey(id, relation.rel, target);
  const original = bookEdgeKey(incoming, relation.rel, relation.alvo);
  workspace.index.edges[edge] = mergePages(workspace.index.edges[edge], batch.index.edges[original]);
}

function bookGraphWrites(workspace: MergeWorkspace, originals: Map<string, VaultFile>): VaultBookGraphWrite["notes"] {
  return [...workspace.changed].flatMap((id) => {
    const node = workspace.nodes.get(id)!;
    const previous = originals.get(id);
    if (!previous) return [{ id, relPath: nodeRelPath(node), content: serializeNode(node) }];
    const body = replaceVaultNodeContent(previous.content, node);
    const content = replaceVaultRelations(body, node.relacoes);
    return content === previous.content ? [] : [{ id, relPath: previous.relPath, previousPath: previous.relPath, expected: previous.content, content }];
  });
}

/** Plans a non-destructive merge into one book graph and maintains page provenance.
 * @example mergeBookGraph("book-id", [], index, batches, () => crypto.randomUUID())
 */
export function mergeBookGraph(
  graphId: string, files: VaultFile[], index: BookGraphIndex, batches: BookGraphBatch[], nextId: () => string,
): { notes: VaultBookGraphWrite["notes"]; index: BookGraphIndex } {
  const originals = new Map<string, VaultFile>();
  const workspace: MergeWorkspace = { graphId, index: structuredClone(index), nodes: new Map(), keys: new Map(), changed: new Set() };
  for (const file of files) {
    if (!/--[^/]+\.md$|\/[a-zA-Z0-9_-]+\.md$/u.test(file.relPath)) continue;
    const node = parseNode(file.content);
    if (!node) continue;
    originals.set(node.id, file);
    workspace.nodes.set(node.id, node);
    workspace.keys.set(nodeKey(node), node.id);
  }
  for (const batch of batches) {
    mergeBatchEdges(workspace, batch, mergeBatchNodes(workspace, batch, nextId));
    workspace.index.coverage = mergePages(workspace.index.coverage, batch.index.coverage);
    if (batch.imported) workspace.index.imported.push(batch.imported);
  }
  return { notes: bookGraphWrites(workspace, originals), index: workspace.index };
}
