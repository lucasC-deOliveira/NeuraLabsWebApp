import { getToken } from "@/lib/api";
import { desktop, isDesktop, type VaultFile, type VaultGraphFolder } from "@/lib/vault-bridge";
import { parseNode, type VaultNode } from "@/lib/vault-format";
import { VAULT_GUIDE_FILENAME } from "@/lib/vault-guide";
import { decodeVaultGraphManifest, findVaultGraphFolder, VAULT_GRAPH_MANIFEST, type VaultGraphManifest } from "@/lib/vault-graph-manifest";
import { vaultToGraphEdges, vaultToGraphNode } from "@/lib/vault-sync";
import type { GrafoInfo, GrafoInfoDetail, GraphEdgeType, GraphNodeType, GraphVisualState } from "../../domain/types/graph.types";
import { buildRoadmap } from "../../domain/services/roadmap.service";

export interface GraphVaultFiles {
  getPath(): Promise<string | null>;
  listGraphFolders(): Promise<VaultGraphFolder[]>;
  readFile(dir: string, relPath: string): Promise<string | null>;
  read(dir: string): Promise<VaultFile[]>;
}

export interface VaultGraphSource {
  directory: string;
  entries: { file: VaultFile; node: VaultNode }[];
}

/** Returns the deterministic order of concepts in a downloaded graph.
 * @example const ranks = vaultConceptTrail(nodes)
 */
export function vaultConceptTrail(nodes: VaultNode[]): Map<string, number> {
  const concepts = nodes.filter(({ tipo }) => tipo === "CONCEITO");
  const edges = concepts.flatMap((node) => node.relacoes.map(({ alvo, rel, peso }) =>
    ({ source: node.id, target: alvo, type: rel, peso })));
  const roadmap = buildRoadmap(concepts.map(({ id, nome, nivelDominio }) =>
    ({ id, label: nome, group: "CONCEITO", dominio: nivelDominio })), edges);
  const ids = roadmap.sections.flatMap(({ looseConcepts, topics }) =>
    [...looseConcepts, ...topics.flatMap((topic) => topic.concepts)]).map(({ id }) => id);
  return new Map(ids.map((id, index) => [id, index]));
}

interface VaultGraphSnapshot {
  source: VaultGraphSource;
  info: GrafoInfoDetail;
  visual: GraphVisualState | null;
  nodes: GraphNodeType[];
  edges: GraphEdgeType[];
}

/** Reads a node from Markdown while allowing unrelated files in the vault.
 * @example const node = parseVaultGraphNode(file)
 */
export function parseVaultGraphNode(file: VaultFile): VaultNode | null {
  if (file.relPath.replace(/\\/g, "/").endsWith(VAULT_GUIDE_FILENAME)) return null;
  try {
    return parseNode(file.content);
  } catch {
    return null;
  }
}

/** Keeps files belonging to the same graph in the loaded snapshot.
 * @example const entries = graphVaultEntries(markdown, graphId)
 */
export function graphVaultEntries(markdown: VaultFile[], graphId: string): VaultGraphSource["entries"] {
  return markdown.flatMap((file) => {
    const node = parseVaultGraphNode(file);
    return node && (!node.grafoId || node.grafoId === graphId) ? [{ file, node }] : [];
  });
}

async function readManifest(files: GraphVaultFiles, folder: VaultGraphFolder): Promise<VaultGraphManifest | null> {
  const raw = await files.readFile(folder.directory, VAULT_GRAPH_MANIFEST).catch(() => null);
  return decodeVaultGraphManifest(raw, folder.id);
}

function detailFromManifest(folder: VaultGraphFolder, manifest: VaultGraphManifest | null): GrafoInfoDetail {
  const {
    name = folder.label, description, parentId = null, parentName = null,
    parentRelation = null, childCount = 0,
  } = manifest ?? {};
  return {
    nome: name, descricao: description, parentGrafoId: parentId,
    parentNome: parentName, tipoRelacaoPai: parentRelation, filhosCount: childCount,
  };
}

/** Opens an identified folder, including renamed or legacy exports.
 * @example const graph = await openGraphFromVault(grafoId, desktop.vault)
 */
export async function openGraphFromVault(id: string, files: GraphVaultFiles): Promise<VaultGraphSnapshot | null> {
  if (!(await files.getPath())) return null;
  const folder = findVaultGraphFolder(await files.listGraphFolders(), id);
  if (!folder) return null;
  const [manifest, markdown] = await Promise.all([readManifest(files, folder), files.read(folder.directory)]);
  const entries = graphVaultEntries(markdown, id);
  const nodes = entries.map(({ node }) => node);
  if (!manifest && !nodes.length) return null;
  return {
    source: { directory: folder.directory, entries },
    info: detailFromManifest(folder, manifest),
    visual: manifest?.visual ?? null,
    nodes: nodes.map((node) => vaultToGraphNode(node)),
    edges: vaultToGraphEdges(nodes),
  };
}

/** Reads local graph metadata without loading all node files.
 * @example const info = await readLocalGraphInfo(graphId)
 */
export async function readLocalGraphInfo(id: string): Promise<GrafoInfoDetail | null> {
  if (!isDesktop()) return null;
  const folder = findVaultGraphFolder(await desktop.vault.listGraphFolders(), id);
  if (!folder) return null;
  return detailFromManifest(folder, await readManifest(desktop.vault, folder));
}

/** Enumerates the visible vault catalog without involving the server.
 * @example const graphs = await listLocalGraphs()
 */
export async function listLocalGraphs(
  files: GraphVaultFiles | null = isDesktop() ? desktop.vault : null,
): Promise<GrafoInfo[]> {
  if (!files) return [];
  const folders = await files.listGraphFolders();
  const distinct = [...new Set(folders.map((folder) => folder.id))];
  return Promise.all(distinct.map(async (id): Promise<GrafoInfo> => {
    const folder = findVaultGraphFolder(folders, id)!;
    const info = detailFromManifest(folder, await readManifest(files, folder));
    return { ...info, id, dataAtualizacao: folder.modifiedAt };
  }));
}

/** Allows remote graph reads on web or with a desktop server session.
 * @example if (canReadServerGraphs()) await graphHttp.listUserGraphs({})
 */
export function canReadServerGraphs(): boolean {
  return !isDesktop() || Boolean(getToken());
}
