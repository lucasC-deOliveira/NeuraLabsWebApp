import { useEffect, useRef, type MutableRefObject } from "react";
import { isDesktop, desktop, type VaultFile } from "@/lib/vault-bridge";
import { existingVaultGraphDirectory } from "@/lib/vault-graph-manifest";
import { graphVaultDir, vaultToGraphNode, vaultToGraphEdges } from "@/lib/vault-sync";
import type { GraphNodeType, GraphEdgeType } from "../../domain/types/graph.types";
import { graphVaultEntries, type VaultGraphSource } from "../../infra/vault/graph-vault-reader";

interface VaultRefs {
  setVaultSource: (source: VaultGraphSource) => void;
  setVaultBacked: (value: boolean) => void;
  rawNodesRef: MutableRefObject<GraphNodeType[]>;
  setRawNodesRef: MutableRefObject<(n: GraphNodeType[]) => void>;
  setRawEdgesRef: MutableRefObject<(e: GraphEdgeType[]) => void>;
}

interface WatchState {
  active: boolean;
  offChanged?: () => void;
}

function applyVaultFiles(
  files: VaultFile[], graphId: string, directory: string,
  refs: VaultRefs,
): void {
  const entries = graphVaultEntries(files, graphId);
  const vaultNodes = entries.map(({ node }) => node);
  if (vaultNodes.length === 0) return;
  const existingById = new Map(refs.rawNodesRef.current.map((n) => [n.id, n]));
  refs.setVaultBacked(true);
  refs.setVaultSource({ directory, entries });
  refs.setRawNodesRef.current(vaultNodes.map((vn) => vaultToGraphNode(vn, existingById.get(vn.id))));
  refs.setRawEdgesRef.current(vaultToGraphEdges(vaultNodes));
}

async function setupWatch(state: WatchState, grafoId: string, grafoNome: string, watchId: string, refs: VaultRefs): Promise<void> {
  const dir = await desktop.vault.getPath().catch(() => null);
  if (!state.active || !dir) return;
  const graphDir = await existingVaultGraphDirectory(grafoId) ?? graphVaultDir(dir, grafoId, grafoNome);
  if (!state.active) return;
  state.offChanged = desktop.vault.onChanged((data): void => {
    if (!state.active || data.watchId !== watchId) return;
    applyVaultFiles(data.files, grafoId, graphDir, refs);
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
  setVaultSource: (source: VaultGraphSource) => void;
  setVaultBacked: (value: boolean) => void;
  grafoId: string;
  grafoNome: string;
  rawNodes: GraphNodeType[];
  setRawNodes: (nodes: GraphNodeType[]) => void;
  setRawEdges: (edges: GraphEdgeType[]) => void;
}

export function useVaultWatch({ grafoId, grafoNome, rawNodes, setRawNodes, setRawEdges, setVaultBacked, setVaultSource }: UseVaultWatchProps): void {
  const rawNodesRef = useRef<GraphNodeType[]>(rawNodes);
  const setRawNodesRef = useRef(setRawNodes);
  const setRawEdgesRef = useRef(setRawEdges);
  useEffect(() => { rawNodesRef.current = rawNodes; }, [rawNodes]);
  useEffect(() => { setRawNodesRef.current = setRawNodes; }, [setRawNodes]);
  useEffect(() => { setRawEdgesRef.current = setRawEdges; }, [setRawEdges]);

  useEffect(() => {
    if (!isDesktop() || !grafoNome) return;
    return startVaultWatch(grafoId, grafoNome, { rawNodesRef, setRawNodesRef, setRawEdgesRef, setVaultBacked, setVaultSource });
  }, [grafoId, grafoNome, setVaultBacked, setVaultSource]);
}
