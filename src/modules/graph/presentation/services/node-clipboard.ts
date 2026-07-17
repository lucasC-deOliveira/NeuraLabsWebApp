// A view-level clipboard for graph nodes. Because a node is a system entity and a
// graph only CONTAINS it, copy/cut/paste move CONTAINMENT, not the entity: copy
// then paste = the same entity now shown in two graphs; cut then paste = moved.
//
// The clipboard is persisted to sessionStorage so it survives navigating from one
// graph route to another (paste happens in a different graph than copy).

export type ClipMode = "copy" | "cut";

export interface ClipItem {
  /** referenciaId of the entity — what addNodeToGraph/removeNodeFromGraph key on. */
  entityId: string;
  tipoNode: string;
  label: string;
}

export interface NodeClipboard {
  items: ClipItem[];
  mode: ClipMode;
  sourceGrafoId: string;
}

const STORAGE_KEY = "graph-node-clipboard";

interface SelectableNode {
  id: string;
  tipoReal?: string;
  group?: string;
  label?: string;
}

/** Builds clipboard items from the currently selected nodes (order preserved). */
export function toClipItems(nodes: SelectableNode[], selectedIds: Set<string>): ClipItem[] {
  return nodes
    .filter((n) => selectedIds.has(n.id))
    .map((n) => ({ entityId: n.id, tipoNode: n.tipoReal ?? n.group ?? "", label: n.label ?? "" }));
}

/** Parses a stored clipboard payload, returning null when absent or malformed. */
export function parseClipboard(raw: string | null): NodeClipboard | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as NodeClipboard;
    if (!Array.isArray(parsed.items) || parsed.items.length === 0) return null;
    if (parsed.mode !== "copy" && parsed.mode !== "cut") return null;
    return parsed;
  } catch {
    return null;
  }
}

export function writeClipboard(clip: NodeClipboard): void {
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(clip));
}

export function readClipboard(): NodeClipboard | null {
  return parseClipboard(sessionStorage.getItem(STORAGE_KEY));
}

export function clearClipboard(): void {
  sessionStorage.removeItem(STORAGE_KEY);
}
