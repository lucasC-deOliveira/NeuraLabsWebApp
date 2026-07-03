import { useEffect, useState, type Dispatch, type SetStateAction } from "react";
import { graphHttp } from "../../infra/http";
import { isDesktop, desktop } from "@/lib/vault-bridge";
import { graphVaultDir, vaultToGraphNode, vaultToGraphEdges } from "@/lib/vault-sync";
import { parseNode } from "@/lib/vault-format";
import { VAULT_GUIDE_FILENAME } from "@/lib/vault-guide";
import type { VaultNode } from "@/lib/vault-format";
import type { GraphNodeType, GraphEdgeType, EdgeView, GraphVisualState, GrafoInfoDetail } from "../../domain/types/graph.types";

type Pan = { x: number; y: number };
type GraphSource = { nodes: GraphNodeType[]; edges: GraphEdgeType[] };

interface GraphDataSetters {
  setZoom: Dispatch<SetStateAction<number>>;
  setPan: Dispatch<SetStateAction<Pan>>;
  setGrafoNome: Dispatch<SetStateAction<string>>;
  setRawNodes: Dispatch<SetStateAction<GraphNodeType[]>>;
  setRawEdges: Dispatch<SetStateAction<GraphEdgeType[]>>;
  setLoading: Dispatch<SetStateAction<boolean>>;
  setGraphEdges: Dispatch<SetStateAction<EdgeView[]>>;
}

export interface GraphDataApi {
  rawNodes: GraphNodeType[];
  rawEdges: GraphEdgeType[];
  loading: boolean;
  grafoNome: string;
  setGrafoNome: Dispatch<SetStateAction<string>>;
  zoom: number;
  setZoom: Dispatch<SetStateAction<number>>;
  pan: Pan;
  setPan: Dispatch<SetStateAction<Pan>>;
  graphEdges: EdgeView[];
  setGraphEdges: Dispatch<SetStateAction<EdgeView[]>>;
  setRawNodes: Dispatch<SetStateAction<GraphNodeType[]>>;
  setRawEdges: Dispatch<SetStateAction<GraphEdgeType[]>>;
}

// Lê os nós do vault (desktop); null se indisponível ou vazio.
async function readVaultNodes(graphId: string, nome: string): Promise<VaultNode[] | null> {
  const vaultDir = await desktop.vault.getPath();
  if (!vaultDir) return null;
  const files = await desktop.vault.read(graphVaultDir(vaultDir, graphId, nome)).catch(() => null);
  if (!files) return null;
  const mdFiles = files.filter((f) => !f.relPath.replace(/\\/g, "/").endsWith(VAULT_GUIDE_FILENAME));
  const vaultNodes = mdFiles.map((f) => parseNode(f.content)).filter(Boolean) as VaultNode[];
  return vaultNodes.length > 0 ? vaultNodes : null;
}

// No desktop, o vault (se tiver nós) é a fonte primária; senão usa o backend.
async function resolveGraphSource(graphId: string, nome: string, backend: GraphSource): Promise<GraphSource> {
  if (!isDesktop()) return backend;
  try {
    const vaultNodes = await readVaultNodes(graphId, nome);
    if (!vaultNodes) return backend;
    const byId = new Map(backend.nodes.map((n) => [n.id, n]));
    return { nodes: vaultNodes.map((vn) => vaultToGraphNode(vn, byId.get(vn.id))), edges: vaultToGraphEdges(vaultNodes) };
  } catch {
    return backend; // vault indisponível
  }
}

function fetchGraphBundle(graphId: string): Promise<[GraphSource, GraphVisualState | null, GrafoInfoDetail | null]> {
  return Promise.all([
    graphHttp.getGraphNodes(graphId),
    graphHttp.loadGraphVisualState(graphId),
    graphHttp.getGrafoInfo(graphId).catch(() => null),
  ]);
}

// detalhes de arestas em background — não bloqueia a renderização (lento em grafos grandes).
function loadEdgesInBackground(graphId: string, setGraphEdges: Dispatch<SetStateAction<EdgeView[]>>): void {
  graphHttp.getGraphEdges(graphId).then((d) => { if (d) setGraphEdges(d); }).catch(() => {});
}

async function loadGraph(graphId: string, s: GraphDataSetters): Promise<void> {
  s.setLoading(true);
  try {
    const [result, saved, info] = await fetchGraphBundle(graphId);
    if (saved) { s.setZoom(saved.zoom); s.setPan(saved.pan); }
    const nome = info?.nome ?? "Mapa de Conhecimento";
    if (info?.nome) s.setGrafoNome(info.nome);
    const src = await resolveGraphSource(graphId, nome, { nodes: result.nodes, edges: result.edges });
    s.setRawNodes(src.nodes);
    s.setRawEdges(src.edges);
  } catch (e) {
    console.error(e);
  } finally {
    s.setLoading(false);
  }
  loadEdgesInBackground(graphId, s.setGraphEdges);
}

export function useGraphData(graphId: string): GraphDataApi {
  const [rawNodes, setRawNodes] = useState<GraphNodeType[]>([]);
  const [rawEdges, setRawEdges] = useState<GraphEdgeType[]>([]);
  const [loading, setLoading] = useState(true);
  const [grafoNome, setGrafoNome] = useState("Mapa de Conhecimento");
  const [zoom, setZoom] = useState(0.6);
  const [pan, setPan] = useState<Pan>({ x: 0, y: 0 });
  const [graphEdges, setGraphEdges] = useState<EdgeView[]>([]);
  const [prevGraphId, setPrevGraphId] = useState<string | null>(null);

  // Ao trocar de grafo, limpa os dados anteriores DURANTE o render (evita
  // set-state-in-effect) para o controller não entrar no caminho "grafo grande"
  // com nós velhos.
  if (graphId !== prevGraphId) { setPrevGraphId(graphId); setRawNodes([]); setRawEdges([]); }

  useEffect(() => {
    loadGraph(graphId, { setZoom, setPan, setGrafoNome, setRawNodes, setRawEdges, setLoading, setGraphEdges });
  }, [graphId]);

  return {
    rawNodes, rawEdges, loading, grafoNome, setGrafoNome, zoom, setZoom, pan, setPan,
    graphEdges, setGraphEdges, setRawNodes, setRawEdges,
  };
}
