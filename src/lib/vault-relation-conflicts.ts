import type { VaultFile, VaultGraphFolder, VaultGraphMarkdownWrite } from "./vault-bridge";
import { parseNode, replaceVaultRelations, vaultNodeLabel, type VaultNode } from "./vault-format";
import { decodeVaultGraphManifest, VAULT_GRAPH_MANIFEST } from "./vault-graph-manifest";
import { VAULT_GUIDE_FILENAME } from "./vault-guide";
import { isRelationAllowed } from "../modules/graph/domain/services/relation-rules";

export interface VaultRelationConflictFiles {
  listGraphFolders(): Promise<VaultGraphFolder[]>;
  read(dir: string): Promise<VaultFile[]>;
  readFile(dir: string, path: string): Promise<string | null>;
}

interface RelationVersion { from: string; to: string; relation: string; weight: number }
interface SharedConflict {
  from: string;
  to: string;
  source: string;
  target: string;
  relation: string;
  current: number | undefined;
  other: number | undefined;
}

interface RelationCopy {
  directory: string;
  name: string;
  weight?: number;
}

interface RelationCopySnapshot extends RelationCopy {
  sourceFile: VaultFile;
  sourceNode: VaultNode;
  targetFile: VaultFile;
}

export class SharedVaultRelationError extends Error {
  constructor(readonly conflict: SharedConflict, readonly copies: RelationCopy[]) {
    const versions = copies.map(({ name, weight }) => `“${name}” (${relationWeight(weight)})`).join(" e ");
    super(`A relação ${conflict.relation} de “${conflict.source}” para “${conflict.target}” diverge entre ${versions}.`);
    this.name = "SharedVaultRelationError";
  }
}

function parseUploadFile(file: VaultFile, graphId: string): VaultNode | null {
  if (file.relPath.replace(/\\/g, "/").endsWith(VAULT_GUIDE_FILENAME)) return null;
  try {
    const node = parseNode(file.content);
    return node && (!node.grafoId || node.grafoId === graphId) ? node : null;
  } catch (cause) {
    throw new Error(`Não foi possível ler “${file.relPath}” no grafo ${graphId}. Revise o Markdown antes de enviar.`, { cause });
  }
}

/** Reads the node files that participate in this graph's upload.
 * @example const nodes = parseVaultUploadNodes(files, graphId)
 */
export function parseVaultUploadNodes(files: VaultFile[], graphId: string): VaultNode[] {
  return files.map((file) => parseUploadFile(file, graphId)).filter((node): node is VaultNode => node !== null);
}

function comparableWeight(weight: number): number {
  return Number.isFinite(weight) && weight > 0 && weight <= 2 ? weight : 1;
}

function sharedRelationVersions(nodes: Map<string, VaultNode>, sharedIds: Set<string>): Map<string, RelationVersion> {
  const versions = new Map<string, RelationVersion>();
  for (const id of sharedIds) {
    const source = nodes.get(id)!;
    for (const link of source.relacoes) {
      const target = sharedIds.has(link.alvo) ? nodes.get(link.alvo) : undefined;
      if (!target || target.id === id || !isRelationAllowed(source.tipo, target.tipo, link.rel)) continue;
      const key = JSON.stringify([id, target.id, link.rel]);
      const weight = comparableWeight(link.peso);
      if (!versions.has(key)) versions.set(key, { from: id, to: target.id, relation: link.rel, weight });
    }
  }
  return versions;
}

function versionsConflict(
  current: Map<string, RelationVersion>, other: Map<string, RelationVersion>, nodes: Map<string, VaultNode>,
): SharedConflict | null {
  for (const key of new Set([...current.keys(), ...other.keys()])) {
    const left = current.get(key);
    const right = other.get(key);
    if (left?.weight === right?.weight) continue;
    const version = left ?? right!;
    return {
      from: version.from, to: version.to,
      source: vaultNodeLabel(nodes.get(version.from)!), target: vaultNodeLabel(nodes.get(version.to)!),
      relation: version.relation, current: left?.weight, other: right?.weight,
    };
  }
  return null;
}

/** Detects different versions of an edge shared by two graph views.
 * @example const conflict = findSharedVaultRelationConflict(graphNodes, otherGraphNodes)
 */
export function findSharedVaultRelationConflict(current: VaultNode[], other: VaultNode[]): SharedConflict | null {
  const oldNodes = new Map(current.map((node) => [node.id, node]));
  const peerNodes = new Map(other.map((node) => [node.id, node]));
  const shared = new Set([...oldNodes.keys()].filter((id) => peerNodes.has(id)));
  if (shared.size < 2) return null;
  return versionsConflict(sharedRelationVersions(oldNodes, shared), sharedRelationVersions(peerNodes, shared), oldNodes);
}

function relationWeight(weight?: number): string {
  return weight === undefined ? "ausente" : `peso ${weight}`;
}

async function snapshotCopy(files: VaultRelationConflictFiles, folder: VaultGraphFolder, conflict: SharedConflict): Promise<RelationCopySnapshot | null> {
  const entries = (await files.read(folder.directory)).map((file) => ({ file, node: parseUploadFile(file, folder.id) }));
  const sources = entries.filter(({ node }) => node?.id === conflict.from);
  const targets = entries.filter(({ node }) => node?.id === conflict.to);
  if (!sources.length || !targets.length) return null;
  if (sources.length !== 1 || targets.length !== 1) throw new Error("Há nós duplicados em um dos grafos do vault.");
  const source = sources[0].node!;
  const target = targets[0].node!;
  if (!isRelationAllowed(source.tipo, target.tipo, conflict.relation)) {
    throw new Error("Os tipos dos nós divergem entre os grafos do vault.");
  }
  const versions = source.relacoes.filter((link) => link.alvo === conflict.to && link.rel === conflict.relation);
  if (versions.length > 1) throw new Error("Há relações duplicadas em um dos arquivos do vault.");
  const version = versions[0];
  const manifest = await files.readFile(folder.directory, VAULT_GRAPH_MANIFEST);
  return {
    directory: folder.directory, name: decodeVaultGraphManifest(manifest, folder.id)?.name ?? folder.label,
    weight: version ? comparableWeight(version.peso) : undefined,
    sourceFile: sources[0].file, sourceNode: source, targetFile: targets[0].file,
  };
}

async function snapshots(files: VaultRelationConflictFiles, folders: VaultGraphFolder[], conflict: SharedConflict): Promise<RelationCopySnapshot[]> {
  const values = await Promise.all(folders.map((folder) => snapshotCopy(files, folder, conflict)));
  return values.filter((copy): copy is RelationCopySnapshot => copy !== null);
}

/** Checks shared vault copies before a Push can replace global server relations.
 * @example await guardSharedVaultRelations(desktop.vault, directory, graphName, nodes)
 */
export async function guardSharedVaultRelations(files: VaultRelationConflictFiles, directory: string, graphName: string, nodes: VaultNode[]): Promise<void> {
  if (nodes.length < 2) return;
  const folders = await files.listGraphFolders();
  const peers = folders.filter((folder) => folder.directory !== directory);
  for (const peer of peers) {
    const other = parseVaultUploadNodes(await files.read(peer.directory), peer.id);
    const conflict = findSharedVaultRelationConflict(nodes, other);
    if (!conflict) continue;
    const copies = (await snapshots(files, folders, conflict)).map(({ directory: dir, name, weight }) => ({
      directory: dir, name: dir === directory ? graphName : name, weight,
    }));
    if (copies.length < 2 || new Set(copies.map(({ weight }) => weight)).size < 2) {
      throw new Error("Os arquivos do vault mudaram durante a verificação. Tente o envio novamente.");
    }
    throw new SharedVaultRelationError(conflict, copies);
  }
}

function resolutionWrites(copy: RelationCopySnapshot, conflict: SharedConflict, weight: number | undefined): VaultGraphMarkdownWrite[] {
  const { directory: dir, sourceFile, sourceNode, targetFile } = copy;
  const keep = sourceNode.relacoes.filter((link) => link.alvo !== conflict.to || link.rel !== conflict.relation);
  const links = weight === undefined ? keep : [...keep, { alvo: conflict.to, rel: conflict.relation, peso: weight }];
  const next = copy.weight === weight ? sourceFile.content : replaceVaultRelations(sourceFile.content, links);
  return [
    { dir, relPath: sourceFile.relPath, expected: sourceFile.content, next },
    { dir, relPath: targetFile.relPath, expected: targetFile.content, next: targetFile.content },
  ];
}

/** Writes the selected version to all affected local graphs after rechecking the preview.
 * @example await resolveSharedVaultRelation(desktop.vault, error, selectedDirectory)
 */
export async function resolveSharedVaultRelation(
  files: VaultRelationConflictFiles & { replaceGraphMarkdownBatch(writes: VaultGraphMarkdownWrite[]): Promise<boolean> },
  error: SharedVaultRelationError,
  selectedDirectory: string,
): Promise<void> {
  const chosen = error.copies.find(({ directory }) => directory === selectedDirectory);
  if (!chosen) throw new Error("Selecione uma das versões da relação.");
  const current = await snapshots(files, await files.listGraphFolders(), error.conflict);
  const original = new Map(error.copies.map(({ directory, weight }) => [directory, weight]));
  const changed = current.length !== original.size || current.some(({ directory, weight }) =>
    !original.has(directory) || original.get(directory) !== weight);
  if (changed) throw new Error("As versões da relação mudaram. Faça a verificação novamente.");
  const writes = current.flatMap((copy) => resolutionWrites(copy, error.conflict, chosen.weight));
  if (!(await files.replaceGraphMarkdownBatch(writes))) {
    throw new Error("Os arquivos do vault mudaram. Faça a verificação novamente.");
  }
}
