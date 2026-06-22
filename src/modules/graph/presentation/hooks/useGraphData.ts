import { useEffect, useState } from "react";
import {
  getGraphNodes,
  getGraphEdges,
  getGrafoInfo,
  loadGraphVisualState,
} from "@/lib/graph-api";
import { isDesktop, desktop } from "@/lib/vault-bridge";
import { graphVaultDir, vaultToGraphNode, vaultToGraphEdges } from "@/lib/vault-sync";
import { parseNode } from "@/lib/vault-format";
import { VAULT_GUIDE_FILENAME } from "@/lib/vault-guide";
import type { VaultNode } from "@/lib/vault-format";

export function useGraphData(graphId: string) {
  const [rawNodes, setRawNodes] = useState<any[]>([]);
  const [rawEdges, setRawEdges] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [grafoNome_, setGrafoNome] = useState("Mapa de Conhecimento");

  const [zoom, setZoom] = useState(0.6);
  const [pan, setPan] = useState({ x: 0, y: 0 });

  const [graphEdges, setGraphEdges] = useState<any[]>([]);

  // LOAD GRAPH + NAME (tudo junto para ter o nome antes de ler o vault)
  useEffect(() => {
    // Limpa dados do grafo anterior imediatamente para que o controller não
    // entre no caminho de "grafo grande" com nós velhos ao trocar de grafo.
    setRawNodes([]);
    setRawEdges([]);

    async function load() {
      setLoading(true);
      try {
        const [result, saved, info] = await Promise.all([
          getGraphNodes(graphId),
          loadGraphVisualState(graphId),
          getGrafoInfo(graphId).catch(() => null),
        ]);

        if (saved) {
          setZoom(saved.zoom);
          setPan(saved.pan);
        }

        const nome = info?.nome ?? "Mapa de Conhecimento";
        if (info?.nome) setGrafoNome(info.nome);

        // tenta carregar do vault; se tiver nós lá, usa como fonte primária
        let nodes = result.nodes;
        let edges = result.edges;
        if (isDesktop()) {
          try {
            const vaultDir = await desktop.vault.getPath();
            if (vaultDir) {
              const graphDir = graphVaultDir(vaultDir, graphId, nome);
              const files = await desktop.vault.read(graphDir).catch(() => null);
              if (files) {
                const mdFiles = files.filter(
                  (f) => !f.relPath.replace(/\\/g, "/").endsWith(VAULT_GUIDE_FILENAME),
                );
                const vaultNodes = mdFiles
                  .map((f) => parseNode(f.content))
                  .filter(Boolean) as VaultNode[];
                if (vaultNodes.length > 0) {
                  const byId = new Map(nodes.map((n: any) => [n.id, n]));
                  nodes = vaultNodes.map((vn) => vaultToGraphNode(vn, byId.get(vn.id)));
                  edges = vaultToGraphEdges(vaultNodes);
                }
              }
            }
          } catch { /* vault indisponível, usa backend */ }
        }

        setRawNodes(nodes);
        setRawEdges(edges);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }

      // Carrega detalhes de arestas em background — não bloqueia a renderização.
      // Grafos grandes (14k+ arestas) têm este endpoint lento; o grafo funciona sem ele.
      getGraphEdges(graphId)
        .then((d) => { if (d) setGraphEdges(d); })
        .catch(() => {});
    }

    load();
  }, [graphId]);

  return {
    rawNodes,
    rawEdges,
    loading,
    grafoNome: grafoNome_,
    setGrafoNome,
    zoom,
    setZoom,
    pan,
    setPan,
    graphEdges,
    setGraphEdges,
    setRawNodes,
    setRawEdges,
  };
}