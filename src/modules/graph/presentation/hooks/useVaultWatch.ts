import { useEffect, useRef } from "react";
import { isDesktop, desktop, type VaultFile } from "@/lib/vault-bridge";
import { parseNode } from "@/lib/vault-format";
import { VAULT_GUIDE_FILENAME } from "@/lib/vault-guide";
import { graphVaultDir, vaultToGraphNode, vaultToGraphEdges } from "@/lib/vault-sync";
import type { GraphNodeType, GraphEdgeType } from "@/lib/graph-api";
import type { VaultNode } from "@/lib/vault-format";

export function useVaultWatch({
  grafoId,
  grafoNome,
  rawNodes,
  setRawNodes,
  setRawEdges,
}: {
  grafoId: string;
  grafoNome: string;
  rawNodes: GraphNodeType[];
  setRawNodes: (nodes: GraphNodeType[]) => void;
  setRawEdges: (edges: GraphEdgeType[]) => void;
}) {
  const rawNodesRef = useRef<GraphNodeType[]>(rawNodes);
  useEffect(() => { rawNodesRef.current = rawNodes; }, [rawNodes]);

  const setRawNodesRef = useRef(setRawNodes);
  const setRawEdgesRef = useRef(setRawEdges);
  useEffect(() => { setRawNodesRef.current = setRawNodes; }, [setRawNodes]);
  useEffect(() => { setRawEdgesRef.current = setRawEdges; }, [setRawEdges]);

  useEffect(() => {
    if (!isDesktop() || !grafoNome) return;

    const watchId = `graph-${grafoId}`;
    let offChanged: (() => void) | undefined;
    let active = true;

    async function setup() {
      const dir = await desktop.vault.getPath().catch(() => null);
      if (!active || !dir) return;

      const graphDir = graphVaultDir(dir, grafoId, grafoNome);

      offChanged = desktop.vault.onChanged((data) => {
        if (data.watchId !== watchId) return;
        applyVaultFiles(data.files, rawNodesRef.current, setRawNodesRef.current, setRawEdgesRef.current);
      });

      await desktop.vault.watch(graphDir, watchId).catch(() => {});
    }

    setup();

    return () => {
      active = false;
      offChanged?.();
      desktop.vault.unwatch(watchId).catch(() => {});
    };
  }, [grafoId, grafoNome]);
}

function applyVaultFiles(
  files: VaultFile[],
  currentNodes: GraphNodeType[],
  setRawNodes: (n: GraphNodeType[]) => void,
  setRawEdges: (e: GraphEdgeType[]) => void,
) {
  const mdFiles = files.filter(
    (f) => !f.relPath.replace(/\\/g, "/").endsWith(VAULT_GUIDE_FILENAME),
  );
  const vaultNodes = mdFiles
    .map((f) => parseNode(f.content))
    .filter(Boolean) as VaultNode[];

  if (vaultNodes.length === 0) return;

  const existingById = new Map(currentNodes.map((n) => [n.id, n]));
  setRawNodes(vaultNodes.map((vn) => vaultToGraphNode(vn, existingById.get(vn.id))));
  setRawEdges(vaultToGraphEdges(vaultNodes));
}
