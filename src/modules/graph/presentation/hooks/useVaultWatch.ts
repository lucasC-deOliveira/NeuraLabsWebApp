import { useEffect, useRef, type MutableRefObject } from "react";
import { isDesktop, desktop, type VaultFile } from "@/lib/vault-bridge";
import { parseNode } from "@/lib/vault-format";
import { VAULT_GUIDE_FILENAME } from "@/lib/vault-guide";
import { graphVaultDir, vaultToGraphNode, vaultToGraphEdges } from "@/lib/vault-sync";
import type { GraphNodeType, GraphEdgeType } from "../../domain/types/graph.types";
import type { VaultNode } from "@/lib/vault-format";

interface VaultRefs {
  rawNodesRef: MutableRefObject<GraphNodeType[]>;
  setRawNodesRef: MutableRefObject<(n: GraphNodeType[]) => void>;
  setRawEdgesRef: MutableRefObject<(e: GraphEdgeType[]) => void>;
}

interface WatchState {
  active: boolean;
  offChanged?: () => void;
}

function applyVaultFiles(
  files: VaultFile[],
  currentNodes: GraphNodeType[],
  setRawNodes: (n: GraphNodeType[]) => void,
  setRawEdges: (e: GraphEdgeType[]) => void,
): void {
  const mdFiles = files.filter((f) => !f.relPath.replace(/\\/g, "/").endsWith(VAULT_GUIDE_FILENAME));
  const vaultNodes = mdFiles.map((f) => parseNode(f.content)).filter(Boolean) as VaultNode[];
  if (vaultNodes.length === 0) return;
  const existingById = new Map(currentNodes.map((n) => [n.id, n]));
  setRawNodes(vaultNodes.map((vn) => vaultToGraphNode(vn, existingById.get(vn.id))));
  setRawEdges(vaultToGraphEdges(vaultNodes));
}

async function setupWatch(state: WatchState, grafoId: string, grafoNome: string, watchId: string, refs: VaultRefs): Promise<void> {
  const dir = await desktop.vault.getPath().catch(() => null);
  if (!state.active || !dir) return;
  const graphDir = graphVaultDir(dir, grafoId, grafoNome);
  state.offChanged = desktop.vault.onChanged((data): void => {
    if (data.watchId !== watchId) return;
    applyVaultFiles(data.files, refs.rawNodesRef.current, refs.setRawNodesRef.current, refs.setRawEdgesRef.current);
  });
  await desktop.vault.watch(graphDir, watchId).catch(() => {});
}

// Observa a pasta do vault do grafo e reflete edições externas (.md) de volta no estado.
function startVaultWatch(grafoId: string, grafoNome: string, refs: VaultRefs): () => void {
  const watchId = `graph-${grafoId}`;
  const state: WatchState = { active: true };
  void setupWatch(state, grafoId, grafoNome, watchId, refs);
  return (): void => {
    state.active = false;
    state.offChanged?.();
    desktop.vault.unwatch(watchId).catch(() => {});
  };
}

interface UseVaultWatchProps {
  grafoId: string;
  grafoNome: string;
  rawNodes: GraphNodeType[];
  setRawNodes: (nodes: GraphNodeType[]) => void;
  setRawEdges: (edges: GraphEdgeType[]) => void;
}

export function useVaultWatch({ grafoId, grafoNome, rawNodes, setRawNodes, setRawEdges }: UseVaultWatchProps): void {
  const rawNodesRef = useRef<GraphNodeType[]>(rawNodes);
  const setRawNodesRef = useRef(setRawNodes);
  const setRawEdgesRef = useRef(setRawEdges);
  useEffect(() => { rawNodesRef.current = rawNodes; }, [rawNodes]);
  useEffect(() => { setRawNodesRef.current = setRawNodes; }, [setRawNodes]);
  useEffect(() => { setRawEdgesRef.current = setRawEdges; }, [setRawEdges]);

  useEffect(() => {
    if (!isDesktop() || !grafoNome) return;
    return startVaultWatch(grafoId, grafoNome, { rawNodesRef, setRawNodesRef, setRawEdgesRef });
  }, [grafoId, grafoNome]);
}
