import { useEffect, useState, type Dispatch, type SetStateAction } from "react";
import { graphHttp } from "../../infra/http";
import { isDesktop, desktop } from "@/lib/vault-bridge";
import { canReadServerGraphs, openGraphFromVault, type VaultGraphSource } from "../../infra/vault/graph-vault-reader";
import type { GraphNodeType, GraphEdgeType, EdgeView, GraphVisualState, GrafoInfoDetail } from "../../domain/types/graph.types";
import { loadCachedGraph, saveCachedGraph } from "../services/graph-cache";

type Pan = { x: number; y: number };
type GraphSource = { nodes: GraphNodeType[]; edges: GraphEdgeType[] };

interface GraphDataSetters {
  setVaultBacked: Dispatch<SetStateAction<boolean>>;
  setZoom: Dispatch<SetStateAction<number>>;
  setPan: Dispatch<SetStateAction<Pan>>;
  setGrafoNome: Dispatch<SetStateAction<string>>;
  setRawNodes: Dispatch<SetStateAction<GraphNodeType[]>>;
  setRawEdges: Dispatch<SetStateAction<GraphEdgeType[]>>;
  setLoading: Dispatch<SetStateAction<boolean>>;
  setGraphEdges: Dispatch<SetStateAction<EdgeView[]>>;
}

export interface GraphDataApi {
  vaultSource: VaultGraphSource | null;
  setVaultSource: Dispatch<SetStateAction<VaultGraphSource | null>>;
  vaultBacked: boolean;
  setVaultBacked: Dispatch<SetStateAction<boolean>>;
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

function fetchGraphBundle(graphId: string): Promise<[GraphSource, GraphVisualState | null, GrafoInfoDetail | null]> {
  return Promise.all([
    graphHttp.getGraphNodes(graphId),
    graphHttp.loadGraphVisualState(graphId),
    graphHttp.getGrafoInfo(graphId).catch(() => null),
  ]);
}

// detalhes de arestas em background — não bloqueia a renderização (lento em grafos grandes).
function loadEdgesInBackground(graphId: string, setGraphEdges: Dispatch<SetStateAction<EdgeView[]>>, active: () => boolean): void {
  graphHttp.getGraphEdges(graphId).then((d) => { if (d && active()) setGraphEdges(d); }).catch(() => {});
}

// Semeia o estado com o grafo cacheado (abertura instantânea). Retorna false
// quando não há cache — aí o chamador mostra o spinner até o fetch chegar.
function seedFromCache(graphId: string, s: GraphDataSetters): boolean {
  if (!canReadServerGraphs()) return false;
  const cached = loadCachedGraph(graphId);
  if (!cached) return false;
  s.setRawNodes(cached.nodes);
  s.setRawEdges(cached.edges);
  s.setZoom(cached.zoom);
  s.setPan(cached.pan);
  s.setGrafoNome(cached.grafoNome);
  s.setLoading(false);
  return true;
}

function applyGraphSource(s: GraphDataSetters, source: GraphSource, name: string, visual: GraphVisualState | null): void {
  s.setGrafoNome(name);
  s.setRawNodes(source.nodes);
  s.setRawEdges(source.edges);
  s.setZoom(visual?.zoom ?? 0.6);
  s.setPan(visual?.pan ?? { x: 0, y: 0 });
}

function cacheLoaded(graphId: string, src: GraphSource, saved: GraphVisualState | null, nome: string): void {
  saveCachedGraph(graphId, {
    nodes: src.nodes, edges: src.edges,
    zoom: saved?.zoom ?? 0.6, pan: saved?.pan ?? { x: 0, y: 0 },
    grafoNome: nome, savedAt: Date.now(),
  });
}

async function loadServerGraph(graphId: string, s: GraphDataSetters, active: () => boolean): Promise<void> {
  if (!canReadServerGraphs()) return;
  const [result, saved, info] = await fetchGraphBundle(graphId);
  if (!active()) return;
  const nome = info?.nome ?? "Mapa de Conhecimento";
  applyGraphSource(s, result, nome, saved);
  cacheLoaded(graphId, result, saved, nome);
}

// loadGraph NÃO liga o spinner: o estado inicial (cache ou vazio) já foi definido
// no render. Aqui só revalida em background e reescreve o cache.
async function loadGraph(graphId: string, s: GraphDataSetters, active: () => boolean, setSource: GraphDataApi["setVaultSource"]): Promise<void> {
  try {
    const local = isDesktop() ? await openGraphFromVault(graphId, desktop.vault).catch(() => null) : null;
    if (!active()) return;
    if (local) {
      setSource(local.source);
      s.setVaultBacked(true);
      applyGraphSource(s, local, local.info.nome, local.visual);
      return;
    }
    await loadServerGraph(graphId, s, active);
    if (active() && canReadServerGraphs()) loadEdgesInBackground(graphId, s.setGraphEdges, active);
  } catch (e) {
    console.error(e);
  } finally {
    if (active()) s.setLoading(false);
  }
}

function watchGraphLoad(graphId: string, setters: GraphDataSetters, setSource: GraphDataApi["setVaultSource"]): () => void {
  let active = true;
  void loadGraph(graphId, setters, () => active, setSource);
  return (): void => { active = false; };
}

function useGraphDataState(): { data: GraphDataApi; setters: GraphDataSetters } {
  const [vaultSource, setVaultSource] = useState<VaultGraphSource | null>(null);
  const [vaultBacked, setVaultBacked] = useState(false);
  const [rawNodes, setRawNodes] = useState<GraphNodeType[]>([]);
  const [rawEdges, setRawEdges] = useState<GraphEdgeType[]>([]);
  const [loading, setLoading] = useState(true);
  const [grafoNome, setGrafoNome] = useState("Mapa de Conhecimento");
  const [zoom, setZoom] = useState(0.6);
  const [pan, setPan] = useState<Pan>({ x: 0, y: 0 });
  const [graphEdges, setGraphEdges] = useState<EdgeView[]>([]);
  const setters: GraphDataSetters = { setVaultBacked, setZoom, setPan, setGrafoNome, setRawNodes, setRawEdges, setLoading, setGraphEdges };
  return {
    data: {
      vaultSource, setVaultSource, vaultBacked, setVaultBacked, rawNodes, rawEdges, loading, grafoNome, setGrafoNome, zoom, setZoom, pan, setPan,
      graphEdges, setGraphEdges, setRawNodes, setRawEdges,
    },
    setters,
  };
}

export function useGraphData(graphId: string): GraphDataApi {
  const { data, setters } = useGraphDataState();
  const [prevGraphId, setPrevGraphId] = useState<string | null>(null);

  // Troca de grafo: semeia do cache no render (abertura instantânea, evita
  // set-state-in-effect). Sem cache, limpa e mostra o spinner até revalidar.
  if (graphId !== prevGraphId) {
    setPrevGraphId(graphId);
    data.setVaultSource(null);
    setters.setVaultBacked(false);
    setters.setGraphEdges([]);
    if (!seedFromCache(graphId, setters)) {
      setters.setRawNodes([]); setters.setRawEdges([]); setters.setLoading(true);
    }
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => watchGraphLoad(graphId, setters, data.setVaultSource), [graphId]);

  return data;
}
