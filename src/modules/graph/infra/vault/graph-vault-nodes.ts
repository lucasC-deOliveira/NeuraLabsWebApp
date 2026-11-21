import type { VaultFile, VaultGraphFolder, VaultGraphMarkdownWrite } from "@/lib/vault-bridge";
import { replaceVaultNodeContent, type VaultNode } from "@/lib/vault-format";
import { decodeVaultGraphManifest, findVaultGraphFolder, VAULT_GRAPH_MANIFEST } from "@/lib/vault-graph-manifest";
import type { ConceptEditGraph, GraphNodeEditorPort, LoadConceptEditImpact, NodeDetails } from "../../application/ports/graph-nodes.port";
import { parseVaultGraphNode, type VaultGraphSource } from "./graph-vault-reader";
import type { VaultEdgeFiles } from "./graph-vault-edges";

export interface VaultNodeFiles extends Pick<VaultEdgeFiles, "listGraphFolders" | "read"> {
  readFile(dir: string, relPath: string): Promise<string | null>;
  replaceGraphMarkdownBatch(writes: VaultGraphMarkdownWrite[]): Promise<boolean>;
}

interface NodeSnapshot { dir: string; file: VaultFile; node: VaultNode }
interface VaultConceptGraph extends ConceptEditGraph { directory: string }
type EditableField = "nome" | "descricao" | "pergunta" | "resposta" | "titulo" | "conteudo" | "tipoNota" | "subtipo" | "fonte";

const structuralFields = ["nome", "descricao"] as const;
const editableFields: Partial<Record<string, readonly EditableField[]>> = {
  ASSUNTO: structuralFields,
  TOPICO: structuralFields,
  CONCEITO: structuralFields,
  FLASHCARD: ["pergunta", "resposta"],
  NOTA: ["titulo", "conteudo", "tipoNota", "subtipo", "fonte"],
};

/** Checks which vault nodes are supported by the existing edit form.
 * @example canEditVaultGraphNode("CONCEITO")
 */
export function canEditVaultGraphNode(group: string): boolean {
  return Object.hasOwn(editableFields, group);
}

async function readSnapshot(files: VaultNodeFiles, folder: VaultGraphFolder, group: string, id: string): Promise<NodeSnapshot | null> {
  const dir = folder.directory;
  const matches = (await files.read(dir)).flatMap((file): NodeSnapshot[] => {
    const node = parseVaultGraphNode(file);
    const valid = node?.id === id && node.tipo === group && (!node.grafoId || node.grafoId === folder.id);
    return valid ? [{ dir, file, node }] : [];
  });
  if (matches.length > 1) throw new Error("O nó precisa ter um único arquivo neste grafo do vault.");
  return matches[0] ?? null;
}

async function findSnapshot(files: VaultNodeFiles, graphId: string, group: string, id: string): Promise<NodeSnapshot | null> {
  if (!canEditVaultGraphNode(group)) return null;
  const folder = findVaultGraphFolder(await files.listGraphFolders(), graphId);
  return folder ? readSnapshot(files, folder, group, id) : null;
}

function editFields(node: VaultNode): NodeDetails {
  return Object.fromEntries((editableFields[node.tipo] ?? []).map((key) => [key, node[key] ?? null]));
}

function patchNode(node: VaultNode, payload: Record<string, unknown>): VaultNode {
  const fields = editableFields[node.tipo] ?? [];
  const updates = fields.flatMap<[EditableField, string | null]>((key) => {
    const value = payload[key];
    if (typeof value === "string") return [[key, value]];
    if (value === null && (key === "descricao" || key === "fonte")) return [[key, null]];
    return [];
  });
  return { ...node, ...Object.fromEntries(updates) };
}

function planNodeCopy(copy: NodeSnapshot, original: VaultNode, updated: VaultNode, changes: EditableField[]): VaultGraphMarkdownWrite {
  const { dir, file, node } = copy;
  const conflicting = changes.some((key) => node[key] !== original[key] && node[key] !== updated[key]);
  if (conflicting) throw new Error("Uma cópia deste nó tem alterações diferentes no vault. Confira os arquivos antes de salvar.");
  const patch = Object.fromEntries(changes.map((key) => [key, updated[key]]));
  return {
    dir, relPath: file.relPath, expected: file.content,
    next: changes.some((key) => node[key] !== updated[key])
      ? replaceVaultNodeContent(file.content, { ...node, ...patch }) : file.content,
  };
}

async function sharedNodeCopies(files: VaultNodeFiles, source: NodeSnapshot): Promise<NodeSnapshot[]> {
  const folders = (await files.listGraphFolders()).filter((folder) => folder.directory !== source.dir);
  const copies = await Promise.all(folders.map((folder) => readSnapshot(files, folder, source.node.tipo, source.node.id)));
  return copies.filter((copy): copy is NodeSnapshot => copy !== null);
}

async function saveSnapshot(
  files: VaultNodeFiles, source: NodeSnapshot, payload: Record<string, unknown>, previewed?: string[],
): Promise<NodeSnapshot> {
  const updated = patchNode(source.node, payload);
  const changes = (editableFields[updated.tipo] ?? []).filter((key) => source.node[key] !== updated[key]);
  if (!changes.length) return source;
  const copies = await sharedNodeCopies(files, source);
  if (previewed && JSON.stringify([source.dir, ...copies.map(({ dir }) => dir)].sort()) !== JSON.stringify(previewed)) {
    throw new Error("Os grafos que usam este conceito mudaram. Reabra a edição para revisar o impacto.");
  }
  const primary = planNodeCopy(source, source.node, updated, changes);
  const writes = [primary, ...copies.map((copy) => planNodeCopy(copy, source.node, updated, changes))];
  if (!(await files.replaceGraphMarkdownBatch(writes))) {
    throw new Error("O arquivo mudou no vault. Reabra a edição para carregar a versão atual.");
  }
  return { dir: source.dir, file: { ...source.file, content: primary.next }, node: updated };
}

/** Opens a vault editor that saves against the same Markdown revision loaded into the form.
 * @example const editor = makeVaultGraphNodeEditor(desktop.vault, graphId)
 */
export function makeVaultGraphNodeEditor(
  files: VaultNodeFiles, graphId: string, initial: NodeSnapshot | null = null, readPreview?: () => string[] | undefined,
): GraphNodeEditorPort {
  let snapshot = initial;
  return {
    async getNodeDetails(group, id): Promise<NodeDetails | null> {
      snapshot = await findSnapshot(files, graphId, group, id);
      return snapshot ? editFields(snapshot.node) : null;
    },
    async updateGraphNode(group, id, payload, currentGraphId): Promise<{ success: boolean }> {
      if (!snapshot || snapshot.node.id !== id || snapshot.node.tipo !== group || currentGraphId !== graphId) {
        throw new Error("Reabra a edição para carregar o nó do vault.");
      }
      snapshot = await saveSnapshot(files, snapshot, payload, readPreview?.());
      return { success: true };
    },
  };
}

async function vaultConceptGraph(files: VaultNodeFiles, folder: VaultGraphFolder, id: string): Promise<VaultConceptGraph | null> {
  if (!(await readSnapshot(files, folder, "CONCEITO", id))) return null;
  const manifest = await files.readFile(folder.directory, VAULT_GRAPH_MANIFEST);
  const label = decodeVaultGraphManifest(manifest, folder.id)?.name ?? folder.label;
  return { id: folder.id, name: label, directory: folder.directory };
}

function makeVaultConceptImpact(files: VaultNodeFiles, id: string, remember: (directories: string[]) => void): LoadConceptEditImpact {
  return async (): Promise<ConceptEditGraph[]> => {
    const folders = await files.listGraphFolders();
    const matches = await Promise.all(folders.map((folder) => vaultConceptGraph(files, folder, id)));
    const graphs = matches.filter((match): match is VaultConceptGraph => match !== null);
    remember(graphs.map(({ directory }) => directory).sort());
    return [...new Map(graphs.map(({ id: graphId, name }) => [graphId, { id: graphId, name }])).values()];
  };
}

/** Prepares the editor from the exact files used to display the graph.
 * @example prepareVaultNodeEdit(desktop.vault, graphId, source, "CONCEITO", nodeId)
 */
export function prepareVaultNodeEdit(
  files: VaultNodeFiles, graphId: string, source: VaultGraphSource | null, group: string, id: string,
): { editor: GraphNodeEditorPort; initialDetails?: NodeDetails; loadImpact?: LoadConceptEditImpact } {
  const entries = source?.entries.filter(({ node }) => node.id === id && node.tipo === group);
  const initial = source && entries?.length === 1 ? { dir: source.directory, ...entries[0] } : null;
  let preview: string[] | undefined;
  const loadImpact = group === "CONCEITO" ? makeVaultConceptImpact(files, id, (directories): void => { preview = directories; }) : undefined;
  const editor = makeVaultGraphNodeEditor(files, graphId, initial, () => preview);
  return { editor, initialDetails: initial ? editFields(initial.node) : undefined, loadImpact };
}
