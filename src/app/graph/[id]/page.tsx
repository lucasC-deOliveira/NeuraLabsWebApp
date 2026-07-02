"use client";

import { useParams, useRouter } from "@/lib/navigation";
import { useTheme } from "next-themes";
import { toast } from "sonner";
import { useEffect, useMemo, useRef, useState } from "react";
import { DeleteDeckModal } from "@/modules/graph/presentation/components/deck/DeleteDeckModal";
import { GenerateDeckModal } from "@/modules/graph/presentation/components/deck/GenerateDeckModal";

import { Button } from "@/components/ui/button";
import { PropertiesPanel } from "@/modules/graph/presentation/components/PropertiesPanel";

import { ArrowLeftIcon, Loader2Icon, FolderTreeIcon, BarChart2Icon, GlobeIcon, NetworkIcon, ZapIcon, WandSparklesIcon, Link2Icon, CopyIcon, GitBranchIcon, MessageCircleIcon, SparklesIcon, ChevronDownIcon, GaugeIcon, ScissorsIcon, ChevronRightIcon, LayersIcon } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { CommunitiesPanel } from "@/modules/graph/presentation/components/CommunitiesPanel";
import { GapDetectionModal } from "@/modules/graph/presentation/components/ai/GapDetectionModal";
import { GenerateGraphModal } from "@/modules/graph/presentation/components/ai/GenerateGraphModal";
import { GenerateGraphFromBaralhoModal } from "@/modules/graph/presentation/components/ai/GenerateGraphFromBaralhoModal";
import { AutoLinkModal } from "@/modules/graph/presentation/components/ai/AutoLinkModal";
import { DuplicatesModal } from "@/modules/graph/presentation/components/ai/DuplicatesModal";
import { CommunitySummaryModal } from "@/modules/graph/presentation/components/ai/CommunitySummaryModal";
import { MissingPrereqsModal } from "@/modules/graph/presentation/components/ai/MissingPrereqsModal";
import { GraphChatModal } from "@/modules/graph/presentation/components/ai/GraphChatModal";
import { CompletenessModal } from "@/modules/graph/presentation/components/ai/CompletenessModal";
import { clustersFromHierarchy, detectGaps, type Community, type StructuralGap } from "@/lib/graph-communities";
import { createBaralhoNode } from "@/lib/graph-api";

import { useGraphController } from "@/modules/graph/presentation/controllers/useGraphController";
import { GraphRenderer } from "@/modules/graph/presentation/components/GraphRenderer";
import { Graph3DRenderer, type Graph3DHandle } from "@/modules/graph/presentation/components/Graph3DRenderer";
import { GraphLegend } from "@/modules/graph/presentation/components/GraphLegend";
import { GraphToolbar } from "@/modules/graph/presentation/components/GraphToolbar";
import { GraphSideToolbar } from "@/modules/graph/presentation/components/GraphSideToolbar";
import { useGraphSearch } from "@/modules/graph/presentation/hooks/useGraphSearch";
import { RoadmapPanel } from "@/modules/graph/presentation/components/RoadmapPanel";
import { GraphSettingsModal, DEFAULT_FOCUS_DEPTH } from "@/modules/graph/presentation/components/GraphSettingsModal";
import type { PhysicsMode } from "@/modules/graph/presentation/services/graph-physics.service";

import {
  deleteGraphNode,
  removeNodeFromGraph,
  getGraphNodes,
  getGraphEdges,
  deleteEdge,
  getGrafoInfo,
  extractNodesToSubgrafo,
  type GrafoInfoDetail,
} from "@/lib/graph-api";
import { CreateSubgrafoModal } from "@/components/graph/CreateSubgrafoModal";
import { ExtractSubgrafoModal } from "@/components/graph/ExtractSubgrafoModal";
import { CreateNodeModal } from "@/modules/graph/presentation/components/create-node/CreateNodeModal";
import { ImportJsonModal } from "@/components/graph/ImportJsonModal";
import { EdgeManagerModal } from "@/modules/graph/presentation/components/EdgeManagerModal";
import { EditNodeModal } from "@/modules/graph/presentation/components/EditNodeModal";
import { ViewNotaModal } from "@/modules/graph/presentation/components/deck/ViewNotaModal";
import { ViewTextoBrutoModal } from "@/modules/graph/presentation/components/deck/ViewTextoBrutoModal";
import { StudyFlashcardModal } from "@/modules/graph/presentation/components/deck/StudyFlashcardModal";
import { ViewFlashcardModal } from "@/modules/graph/presentation/components/deck/ViewFlashcardModal";
import { NodeInsightsModal } from "@/modules/graph/presentation/components/ai/NodeInsightsModal";
import { StudyDeckModal } from "@/modules/graph/presentation/components/deck/StudyDeckModal";
import { ViewDeckModal } from "@/modules/graph/presentation/components/deck/ViewDeckModal";
import { VaultSyncModal } from "@/modules/graph/presentation/components/vault/VaultSyncModal";
import { GraphDashboard } from "@/components/graph/GraphDashboard";
import { isDesktop } from "@/lib/vault-bridge";
import { canRelate } from "@/modules/graph/domain/services/relation-rules";

export default function GraphPage() {
  const router = useRouter();
  const params = useParams();
  const graphId = params.id as string;

  const { theme, resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark" || theme === "dark";

  const controller = useGraphController(graphId);

  // busca com filtros poderosos (texto, tipo, domínio, prioridade, conexões)
  const search = useGraphSearch(
    controller.state.filteredNodes,
    controller.state.filteredEdges,
    graphId,
  );
  const [roadmapOpen, setRoadmapOpen] = useState(false);
  const [insightsNode, setInsightsNode] = useState<{ id: string; label?: string } | null>(null);

  // assuntos/tópicos/conceitos já no grafo (para relacionar ao criar nós)
  const graphEntities = useMemo(() => {
    const assuntos: { id: string; nome: string }[] = [];
    const topicos: { id: string; nome: string }[] = [];
    const conceitos: { id: string; nome: string }[] = [];
    const textosBrutos: { id: string; nome: string }[] = [];
    const flashcards: { id: string; nome: string }[] = [];
    for (const n of controller.state.layout) {
      const item = { id: n.id, nome: n.label };
      if (n.group === "ASSUNTO") assuntos.push(item);
      else if (n.group === "TOPICO") topicos.push(item);
      else if (n.group === "CONCEITO") conceitos.push(item);
      else if (n.group === "TEXTO_BRUTO") textosBrutos.push(item);
      else if (n.group === "FLASHCARD") flashcards.push(item);
    }
    return { assuntos, topicos, conceitos, textosBrutos, flashcards };
  }, [controller.state.layout]);
  const [rightPanelCollapsed, setRightPanelCollapsed] = useState(false);
  const [isDeletingNode, setIsDeletingNode] = useState(false);
  const [deleteDeckConfirm, setDeleteDeckConfirm] = useState<{ node: any } | null>(null);
  const [generateDeckConfirm, setGenerateDeckConfirm] = useState<{ node: any; flashcardIds: string[] } | null>(null);
  const [isGeneratingDeck, setIsGeneratingDeck] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isImportJsonOpen, setIsImportJsonOpen] = useState(false);
  const [isVaultOpen, setIsVaultOpen] = useState(false);
  const [isDashboardOpen, setIsDashboardOpen] = useState(false);
  const [dashFilterIds, setDashFilterIds] = useState<Set<string> | null>(null);
  const [roadmapSpotlightId, setRoadmapSpotlightId] = useState<string | null>(null);

  // P3 — Comunidades / P1 — Lacunas / P4 — Ego Network (estados declarados antes dos useMemos que os usam)
  const [communitiesOpen, setCommunitiesOpen] = useState(false);
  const [gapsOpen, setGapsOpen] = useState(false);
  const [highlightedCommunityId, setHighlightedCommunityId] = useState<string | null>(null);
  const [highlightedGap, setHighlightedGap] = useState<StructuralGap | null>(null);
  const [neighborhoodStudyIds, setNeighborhoodStudyIds] = useState<string[] | null>(null);
  const [generateGraphOpen, setGenerateGraphOpen] = useState(false);
  const [generateFromBaralhoOpen, setGenerateFromBaralhoOpen] = useState(false);
  // IA automática
  const [autoLinkOpen, setAutoLinkOpen] = useState(false);
  const [duplicatesOpen, setDuplicatesOpen] = useState(false);
  const [missingPrereqsOpen, setMissingPrereqsOpen] = useState(false);
  const [communitySummary, setCommunitySummary] = useState<{ label: string; nodeIds: string[] } | null>(null);
  const [learningPathOpen, setLearningPathOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [completenessOpen, setCompletenessOpen] = useState(false);
  const [isSplittingBaralhos, setIsSplittingBaralhos] = useState(false);

  // Chave topológica estável — muda só quando nós/arestas são adicionados/removidos,
  // não a cada tick de física (posições não afetam comunidades).
  const topologyKey = useMemo(
    () => controller.state.layout.map(n => n.id).sort().join(','),
    [controller.state.layout],
  );

  // P3 — clusters hierárquicos: um cluster principal por ASSUNTO (subárvore
  // inteira), consistente com as regiões de cluster do grafo. Usa o clusterId
  // já derivado em cada nó (independente de posições).
  const communities = useMemo<Community[]>(() => {
    if (controller.state.layout.length < 3) return [];
    return clustersFromHierarchy(controller.state.layout);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [topologyKey, controller.state.edges]);

  // P1 — detecta lacunas entre comunidades
  const gaps = useMemo<StructuralGap[]>(
    () => detectGaps(communities, controller.state.edges),
    [communities, controller.state.edges],
  );

  // P5 — coordenadas das pontes para overlay no renderer (usa posições atuais)
  const gapBridges = useMemo(
    () => {
      if (!gapsOpen) return [];
      const layoutById = new Map(controller.state.layout.map(n => [n.id, n]));
      return gaps.map(g => {
        const bA = layoutById.get(g.bridgeA.id) ?? g.bridgeA;
        const bB = layoutById.get(g.bridgeB.id) ?? g.bridgeB;
        return { x1: bA.x, y1: bA.y, x2: bB.x, y2: bB.y, colorA: g.communityA.color, colorB: g.communityB.color };
      });
    },
    [gaps, gapsOpen, controller.state.layout],
  );

  // Ids da comunidade em hover para destacar no renderer
  const highlightedCommunityNodeIds = useMemo<Set<string> | null>(() => {
    if (highlightedCommunityId) {
      const c = communities.find(c => c.id === highlightedCommunityId);
      return c ? new Set(c.nodes.map(n => n.id)) : null;
    }
    if (highlightedGap) {
      return new Set([
        ...highlightedGap.communityA.nodes.map(n => n.id),
        ...highlightedGap.communityB.nodes.map(n => n.id),
      ]);
    }
    return null;
  }, [highlightedCommunityId, highlightedGap, communities]);

  // P4 — BFS a partir do nó selecionado para coletar IDs de FLASHCARDs vizinhos
  const getNeighborhoodFlashcardIds = (nodeId: string, depth: number): string[] => {
    const adj = new Map<string, string[]>();
    for (const e of controller.state.edges) {
      (adj.get(e.source) ?? (adj.set(e.source, []), adj.get(e.source)!)).push(e.target);
      (adj.get(e.target) ?? (adj.set(e.target, []), adj.get(e.target)!)).push(e.source);
    }
    const dist = new Map<string, number>([[nodeId, 0]]);
    const queue: string[] = [nodeId];
    let head = 0;
    while (head < queue.length) {
      const cur = queue[head++];
      const d = dist.get(cur)!;
      if (d >= depth) continue;
      for (const nb of adj.get(cur) ?? []) {
        if (!dist.has(nb)) { dist.set(nb, d + 1); queue.push(nb); }
      }
    }
    const nodeMap = new Map(controller.state.layout.map(n => [n.id, n]));
    return [...dist.keys()].filter(id => nodeMap.get(id)?.group === "FLASHCARD");
  };

  const combinedMatchedIds = useMemo(() => {
    const a = dashFilterIds;
    const b = search.matchedIds;
    const c = roadmapSpotlightId ? new Set([roadmapSpotlightId]) : null;
    const sources = [a, b, c].filter(Boolean) as Set<string>[];
    if (sources.length === 0) return null;
    if (sources.length === 1) return sources[0];
    return sources.reduce((acc, s) => new Set([...acc].filter(id => s.has(id))));
  }, [dashFilterIds, search.matchedIds, roadmapSpotlightId]);
  const desktopApp = isDesktop();
  const graph3DRef = useRef<Graph3DHandle>(null);
  const [legendVisible, setLegendVisible] = useState(false);
  const [is3D, setIs3D] = useState(false);
  const [has3DBeenOpened, setHas3DBeenOpened] = useState(false);
  const [highContrast, setHighContrast] = useState(false);
  const [focusMode, setFocusMode] = useState(false);
  const [focusDepth, setFocusDepth] = useState(DEFAULT_FOCUS_DEPTH);
  const [physicsMode, setPhysicsMode] = useState<PhysicsMode>("default");
  const [showClusters, setShowClusters] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isEdgeManagerOpen, setIsEdgeManagerOpen] = useState(false);
  const [graphEdges, setGraphEdges] = useState<any[]>([]);
  const [nodeMenu, setNodeMenu] = useState<{ node: any; x: number; y: number } | null>(null);
  const [editingNode, setEditingNode] = useState<any>(null);
  const [viewingNotaId, setViewingNotaId] = useState<string | null>(null);
  const [viewingTextoId, setViewingTextoId] = useState<string | null>(null);
  const [studyFlashcardId, setStudyFlashcardId] = useState<string | null>(null);
  const [viewFlashcardId, setViewFlashcardId] = useState<string | null>(null);
  const [studyDeckId, setStudyDeckId] = useState<string | null>(null);
  const [viewDeckId, setViewDeckId] = useState<string | null>(null);
  const [editEdge, setEditEdge] = useState<any>(null);
  const [addEdgeSourceId, setAddEdgeSourceId] = useState<string | null>(null);
  const [grafoInfo, setGrafoInfo] = useState<GrafoInfoDetail | null>(null);
  const [isCreateSubgrafoOpen, setIsCreateSubgrafoOpen] = useState(false);
  const [isExtractSubgrafoOpen, setIsExtractSubgrafoOpen] = useState(false);

  useEffect(() => {
    getGrafoInfo(graphId).then(setGrafoInfo).catch(() => {});
  }, [graphId]);

  const closeToolbarModals = () => {
    setIsCreateModalOpen(false);
    setIsImportJsonOpen(false);
    setIsVaultOpen(false);
    setIsDashboardOpen(false);
    setIsSettingsOpen(false);
    setIsEdgeManagerOpen(false);
    setRoadmapOpen(false);
    setGenerateGraphOpen(false);
    setAutoLinkOpen(false);
    setDuplicatesOpen(false);
    setMissingPrereqsOpen(false);
    setLearningPathOpen(false);
    setChatOpen(false);
    setCompletenessOpen(false);
    setIsCreateSubgrafoOpen(false);
    setIsExtractSubgrafoOpen(false);
  };

  const handleOpenGrafoRef = (childGrafoId: string) => {
    router.push(`/graph/${childGrafoId}`);
  };

  const handleSplitByBaralho = async () => {
    const baralhos = controller.state.filteredNodes.filter((n: any) => n.group === "BARALHO");
    if (baralhos.length === 0) {
      toast.error("Nenhum baralho encontrado neste grafo.");
      return;
    }
    const ok = window.confirm(
      `Dividir ${baralhos.length} baralho(s) em subgrafos separados?\n\nCada baralho e seus flashcards serão movidos para um novo subgrafo com o nome do baralho.`,
    );
    if (!ok) return;

    setIsSplittingBaralhos(true);
    const toastId = toast.loading(`Dividindo 0/${baralhos.length} baralhos…`);
    try {
      // BARALHO → FLASHCARD via CONTEM edges
      const contemByBaralho = new Map<string, string[]>();
      for (const e of controller.state.filteredEdges) {
        if ((e as any).type !== "CONTEM") continue;
        const src = (e as any).source;
        if (!contemByBaralho.has(src)) contemByBaralho.set(src, []);
        contemByBaralho.get(src)!.push((e as any).target);
      }

      let done = 0;
      for (const baralho of baralhos) {
        const flashcardIds = contemByBaralho.get(baralho.id) ?? [];
        await extractNodesToSubgrafo(graphId, {
          nodeIds: [baralho.id, ...flashcardIds],
          nome: baralho.label,
          tipoRelacao: "CONTEM",
        });
        done++;
        toast.loading(`Dividindo ${done}/${baralhos.length} baralhos…`, { id: toastId });
      }

      toast.success(`${baralhos.length} baralho(s) divididos com sucesso!`, { id: toastId });
      const result = await getGraphNodes(graphId);
      controller.actions.setRawNodes(result.nodes);
      controller.actions.setRawEdges(result.edges);
    } catch {
      toast.error("Erro ao dividir baralhos.", { id: toastId });
    } finally {
      setIsSplittingBaralhos(false);
    }
  };

  const handleOpenCreateNode = () => {
    closeToolbarModals();
    setIsCreateModalOpen(true);
  };

  const loadEdges = async () => {
    try {
      setGraphEdges(await getGraphEdges(graphId));
    } catch {
      toast.error("Erro ao carregar relações");
    }
  };

  // relações disponíveis desde o início (painel de propriedades)
  useEffect(() => {
    loadEdges();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [graphId]);

  // Lazy mount: só cria o contexto WebGL na primeira vez que 3D é ativado
  useEffect(() => {
    if (is3D) setHas3DBeenOpened(true);
  }, [is3D]);

  // Pausa/retoma o loop de animação ao alternar entre modos
  useEffect(() => {
    if (!has3DBeenOpened) return;
    if (is3D) {
      graph3DRef.current?.resume();
    } else {
      graph3DRef.current?.pause();
    }
  }, [is3D, has3DBeenOpened]);

  const handleOpenEdgeManager = async () => {
    closeToolbarModals();
    await loadEdges();
    setIsEdgeManagerOpen(true);
  };

  // ======================
  // LOADING
  // ======================
  if (controller.state.loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2Icon className="animate-spin" />
      </div>
    );
  }
  // contagem de nós por tipo (painel de camadas/filtro)
  const nodeStats: Record<string, number> = {};
  for (const n of controller.state.layout) {
    nodeStats[n.group] = (nodeStats[n.group] || 0) + 1;
  }

  // ======================
  // ZOOM BUTTONS (zoom around SVG center)
  // ======================
  const handleZoomButton = (delta: number) => {
    const rect = controller.svgRef.current?.getBoundingClientRect();
    const cx = rect ? rect.left + rect.width / 2 : 0;
    const cy = rect ? rect.top + rect.height / 2 : 0;
    const currentZoom = controller.state.zoom;
    const currentPan = controller.state.pan;
    const nextZoom = Math.min(3, Math.max(0.2, currentZoom + delta));
    const graphX = (cx - (rect?.left ?? 0) - currentPan.x) / currentZoom;
    const graphY = (cy - (rect?.top ?? 0) - currentPan.y) / currentZoom;
    controller.actions.setZoom(nextZoom);
    controller.actions.setPan({
      x: cx - (rect?.left ?? 0) - graphX * nextZoom,
      y: cy - (rect?.top ?? 0) - graphY * nextZoom,
    });
  };

  // ======================
  // MENU "RELACIONAR" — aparece no ponto médio entre 2 nós selecionados
  // ======================
  let relateMenuPos: { x: number; y: number } | null = null;
  if (controller.state.selectedNodeIds.size === 2) {
    const [idA, idB] = [...controller.state.selectedNodeIds];
    const a = controller.state.layout.find((n) => n.id === idA);
    const b = controller.state.layout.find((n) => n.id === idB);
    // só mostra o menu se os tipos dos dois nós tiverem relação possível
    if (a && b && canRelate(a.group, b.group)) {
      relateMenuPos = {
        x: ((a.x + b.x) / 2) * controller.state.zoom + controller.state.pan.x,
        y: ((a.y + b.y) / 2) * controller.state.zoom + controller.state.pan.y,
      };
    }
  }

  // ======================
  // GRAPH REFRESH
  // ======================
  const refreshGraph = async () => {
    const result = await getGraphNodes(graphId);

    // o controller mescla os nós novos preservando as posições dos existentes
    controller.actions.setRawNodes(result.nodes);
    controller.actions.setRawEdges(result.edges);
    // mantém a seleção: o nó selecionado é derivado do layout, então mostra os
    // dados atualizados (ex.: domínio recalculado). Some sozinho se o nó foi removido.
    await loadEdges();
  };

  // ======================
  // RELAÇÕES DO NÓ SELECIONADO (painel de propriedades)
  // ======================
  const selectedNodeId = controller.state.selectedNode?.id;
  const selectedNodeEdges = selectedNodeId
    ? graphEdges.filter(
        (e: any) => e.source === selectedNodeId || e.target === selectedNodeId
      )
    : [];

  const handleEditEdge = (edge: any) => {
    setEditEdge(edge);
    setIsEdgeManagerOpen(true);
  };

  // botão "Nova relação" do painel: abre a criação com o nó como origem
  const handleAddEdgeFromPanel = () => {
    if (!controller.state.selectedNode) return;
    setAddEdgeSourceId(controller.state.selectedNode.id);
    setIsEdgeManagerOpen(true);
  };

  const handleDeleteEdge = async (edge: any) => {
    if (!confirm("Excluir esta relação?")) return;
    try {
      await deleteEdge(edge.id, graphId);
      toast.success("Relação excluída");
      await refreshGraph();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao excluir relação");
    }
  };

  // ======================
  // DELETE NODE (exclui a entidade do app)
  // ======================
  const performDeleteNode = async (node: any, deleteConnected: boolean) => {
    controller.actions.selectNode(null);
    setIsDeletingNode(true);
    try {
      await deleteGraphNode(node.id, graphId, { deleteConnected });
      controller.actions.removeNodeFromLayout(node.id);
      toast.success("Nó excluído do aplicativo");
      await refreshGraph();
    } catch (e) {
      console.error("deleteNode error", e);
      toast.error(e instanceof Error ? e.message : "Erro ao excluir node");
    } finally {
      setIsDeletingNode(false);
    }
  };

  const deleteNodeFromApp = async (node: any) => {
    if (!node) return;
    if (node.group === "BARALHO") {
      setDeleteDeckConfirm({ node });
      return;
    }
    if (!confirm(`Excluir "${node.label}" permanentemente do aplicativo?`)) return;
    await performDeleteNode(node, false);
  };

  const handleDeleteNode = () => deleteNodeFromApp(controller.state.selectedNode);

  // ======================
  // REMOVE FROM GRAPH (mantém a entidade no app)
  // ======================
  const removeFromGraph = async (node: any) => {
    if (!node) return;

    setIsDeletingNode(true);
    try {
      await removeNodeFromGraph(node.id, graphId);
      toast.success("Removido do grafo");
      await refreshGraph();
    } catch {
      toast.error("Erro ao remover");
    } finally {
      setIsDeletingNode(false);
    }
  };

  const handleRemoveFromGraph = () => removeFromGraph(controller.state.selectedNode);

  // ======================
  // GENERATE DECK FROM CONNECTED FLASHCARDS
  // ======================
  const handleGenerateDeck = () => {
    const node = controller.state.selectedNode;
    if (!node) return;
    const layoutById = new Map(controller.state.layout.map((n: any) => [n.id, n]));
    const flashcardIds = selectedNodeEdges
      .map((e: any) => (e.source === node.id ? e.target : e.source))
      .filter((id: string) => layoutById.get(id)?.group === "FLASHCARD");
    setGenerateDeckConfirm({ node, flashcardIds });
  };

  const performGenerateDeck = async (titulo: string) => {
    if (!generateDeckConfirm) return;
    const { flashcardIds } = generateDeckConfirm;
    setIsGeneratingDeck(true);
    try {
      await createBaralhoNode(graphId, titulo, flashcardIds);
      setGenerateDeckConfirm(null);
      toast.success("Baralho criado com sucesso");
      await refreshGraph();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao criar baralho");
    } finally {
      setIsGeneratingDeck(false);
    }
  };

  // ======================
  // RENDER
  // ======================
  return (
    <div className="flex flex-col h-screen overflow-hidden">

      {/* HEADER */}
      <header className="h-10 flex items-center px-2 border-b border-primary/60">
        <Button variant="ghost" className="text-primary" onClick={() => router.push("/graph")}>
          <ArrowLeftIcon />
        </Button>

        <div className="flex-1 flex items-center justify-center gap-1.5 min-w-0">
          {grafoInfo?.parentGrafoId && (
            <>
              <button
                onClick={() => router.push(`/graph/${grafoInfo.parentGrafoId}`)}
                className="text-xs text-zinc-400 hover:text-primary truncate max-w-24"
              >
                {grafoInfo.parentNome ?? "Pai"}
              </button>
              <ChevronRightIcon className="size-3 text-zinc-400 flex-shrink-0" />
            </>
          )}
          <span className="font-semibold text-primary truncate">{controller.state.grafoNome}</span>
        </div>

        <Button variant="ghost" className="text-primary gap-1.5" onClick={() => router.push(`/vr/${graphId}`)} title="Visualizar em AR/VR">
          <GlobeIcon className="size-4" />
        </Button>

        <Button variant="ghost" className="text-primary gap-1.5" onClick={() => { closeToolbarModals(); setIsDashboardOpen(v => !v); }} title="Analytics do grafo">
          <BarChart2Icon className="size-4" />
        </Button>

        <Button variant="ghost" className="text-primary gap-1.5" onClick={() => { closeToolbarModals(); setCommunitiesOpen(v => !v); }} title={`Comunidades detectadas (${communities.length})`}>
          <NetworkIcon className="size-4" />
        </Button>

        <Button variant="ghost" className={`gap-1.5 ${gaps.length > 0 ? "text-amber-500" : "text-primary"}`} onClick={() => { closeToolbarModals(); setGapsOpen(v => !v); }} title={`Lacunas estruturais (${gaps.length})`}>
          <ZapIcon className="size-4" />
          {gaps.length > 0 && <span className="text-xs">{gaps.length}</span>}
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger render={
            <Button variant="ghost" className="gap-1.5 text-violet-600 dark:text-violet-400 font-medium hover:bg-violet-500/10 hover:text-violet-600 dark:hover:text-violet-400">
              <SparklesIcon className="size-4" />
              IA
              <ChevronDownIcon className="size-3 opacity-60" />
            </Button>
          } />
          <DropdownMenuContent align="end" className="w-64">
            <DropdownMenuLabel>Construir</DropdownMenuLabel>
            <DropdownMenuItem onClick={() => { closeToolbarModals(); setGenerateGraphOpen(true); }}>
              <WandSparklesIcon className="size-4 shrink-0 text-violet-500" />
              <div>
                <div className="font-medium">Gerar grafo por texto</div>
                <div className="text-[11px] text-muted-foreground">Cria nós a partir de qualquer material</div>
              </div>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => { closeToolbarModals(); setGenerateFromBaralhoOpen(true); }}>
              <LayersIcon className="size-4 shrink-0 text-violet-500" />
              <div>
                <div className="font-medium">Expandir grafo com baralho</div>
                <div className="text-[11px] text-muted-foreground">Adiciona tópicos e conceitos dos flashcards</div>
              </div>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => { closeToolbarModals(); setAutoLinkOpen(true); }}>
              <Link2Icon className="size-4 shrink-0 text-violet-500" />
              <div>
                <div className="font-medium">Auto-conectar nós</div>
                <div className="text-[11px] text-muted-foreground">Sugere arestas faltantes com IA</div>
              </div>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => { closeToolbarModals(); setMissingPrereqsOpen(true); }}>
              <GitBranchIcon className="size-4 shrink-0 text-violet-500" />
              <div>
                <div className="font-medium">Pré-requisitos faltantes</div>
                <div className="text-[11px] text-muted-foreground">Adiciona conceitos base que faltam</div>
              </div>
            </DropdownMenuItem>

            <DropdownMenuSeparator />
            <DropdownMenuLabel>Analisar</DropdownMenuLabel>
            <DropdownMenuItem onClick={() => { closeToolbarModals(); setCompletenessOpen(true); }}>
              <GaugeIcon className="size-4 shrink-0 text-violet-500" />
              <div>
                <div className="font-medium">Completude do conhecimento</div>
                <div className="text-[11px] text-muted-foreground">Score por assunto com lacunas</div>
              </div>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuLabel>Organizar</DropdownMenuLabel>
            <DropdownMenuItem
              onClick={() => { closeToolbarModals(); handleSplitByBaralho(); }}
              disabled={isSplittingBaralhos}
            >
              <ScissorsIcon className="size-4 shrink-0 text-violet-500" />
              <div>
                <div className="font-medium">Dividir por baralho</div>
                <div className="text-[11px] text-muted-foreground">
                  {(() => {
                    const n = controller.state.filteredNodes.filter((x: any) => x.group === "BARALHO").length;
                    return n > 0 ? `Move ${n} baralho(s) para subgrafos separados` : "Nenhum baralho neste grafo";
                  })()}
                </div>
              </div>
            </DropdownMenuItem>

            <DropdownMenuSeparator />
            <DropdownMenuLabel>Limpar</DropdownMenuLabel>
            <DropdownMenuItem onClick={() => { closeToolbarModals(); setDuplicatesOpen(true); }}>
              <CopyIcon className="size-4 shrink-0 text-violet-500" />
              <div>
                <div className="font-medium">Detectar duplicatas</div>
                <div className="text-[11px] text-muted-foreground">Identifica e mescla nós equivalentes</div>
              </div>
            </DropdownMenuItem>

            <DropdownMenuSeparator />
            <DropdownMenuLabel>Explorar</DropdownMenuLabel>
            <DropdownMenuItem onClick={() => { closeToolbarModals(); setChatOpen(true); }}>
              <MessageCircleIcon className="size-4 shrink-0 text-violet-500" />
              <div>
                <div className="font-medium">Chat com o grafo</div>
                <div className="text-[11px] text-muted-foreground">Pergunte sobre seu conhecimento</div>
              </div>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <Button
          variant="ghost"
          className="text-primary gap-1.5"
          onClick={() => { closeToolbarModals(); setIsCreateSubgrafoOpen(true); }}
          title="Criar subgrafo"
        >
          <NetworkIcon className="size-4" />
          <span className="hidden sm:inline text-xs">Subgrafo</span>
        </Button>

        {desktopApp && (
          <Button variant="ghost" className="text-primary gap-1.5" onClick={() => { closeToolbarModals(); setIsVaultOpen(true); }} title="Sincronizar com vault Markdown">
            <FolderTreeIcon className="size-4" /> Vault
          </Button>
        )}
      </header>

      {/* BODY */}
      <div className="flex flex-1 overflow-hidden">

        {/* GRAPH */}
        <div className="flex-1 relative">
          {legendVisible && <GraphLegend isDark={isDark} highContrast={highContrast} />}
          <GraphSideToolbar
            isDark={isDark}
            tool={controller.state.activeTool}
            onToolChange={controller.actions.setActiveTool}
            onOpenCreateNode={handleOpenCreateNode}
            onOpenEdgeManager={handleOpenEdgeManager}
            onOpenImportJson={() => { closeToolbarModals(); setIsImportJsonOpen(true); }}
            search={search}
            onFocusNode={controller.interactions.focusNode}
            nodeStats={nodeStats}
            hiddenTypes={controller.state.hiddenTypes}
            onToggleType={controller.actions.toggleNodeType}
            roadmapOpen={roadmapOpen}
            onToggleRoadmap={() => { const next = !roadmapOpen; closeToolbarModals(); setRoadmapOpen(next); if (!next) setRoadmapSpotlightId(null); }}
          />

          <RoadmapPanel
            open={roadmapOpen}
            onClose={() => { setRoadmapOpen(false); setRoadmapSpotlightId(null); }}
            grafoId={graphId}
            nodes={controller.state.layout}
            edges={controller.state.edges}
            onFocusNode={(n) => {
              const full = controller.state.layout.find((x) => x.id === n.id);
              if (!full) return;
              setRoadmapSpotlightId(n.id);
              controller.interactions.focusNode(full);
              controller.actions.selectNode(full);
            }}
          />
          <GraphToolbar
            legendVisible={legendVisible}
            onToggleLegend={() => setLegendVisible((v) => !v)}
            onZoomIn={() => is3D ? graph3DRef.current?.zoomIn() : handleZoomButton(0.1)}
            onZoomOut={() => is3D ? graph3DRef.current?.zoomOut() : handleZoomButton(-0.1)}
            physicsEnabled={controller.state.physicsEnabled}
            onTogglePhysics={() => controller.actions.setPhysicsEnabled((v: boolean) => !v)}
            highContrast={highContrast}
            onToggleHighContrast={() => setHighContrast((v) => !v)}
            focusMode={focusMode}
            onToggleFocus={() => setFocusMode((v) => !v)}
            showClusters={showClusters}
            onToggleShowClusters={() => setShowClusters((v) => !v)}
            onOpenSettings={() => { closeToolbarModals(); setIsSettingsOpen(true); }}
            is3D={is3D}
            onToggle3D={() => setIs3D((v) => !v)}
          />
          {has3DBeenOpened && (
            <div className={`absolute inset-0${!is3D ? " invisible pointer-events-none" : ""}`}>
              <Graph3DRenderer
                ref={graph3DRef}
                nodes={controller.state.filteredNodes}
                edges={controller.state.filteredEdges}
                isDark={isDark}
                matchedIds={combinedMatchedIds}
                selectedNodeIds={controller.state.selectedNodeIds}
                onNodeClick={controller.actions.selectNode}
                highContrast={highContrast}
                focusMode={focusMode}
                focusDepth={focusDepth}
                physicsEnabled={controller.state.physicsEnabled}
              />
            </div>
          )}
          {!is3D && (
            <GraphRenderer
              nodes={controller.state.filteredNodes}
              edges={controller.state.filteredEdges}
              zoom={controller.state.zoom}
              pan={controller.state.pan}
              isDark={isDark}
              svgRef={controller.svgRef}
              tool={controller.state.activeTool}
              selectedNodeIds={controller.state.selectedNodeIds}
              marquee={controller.interactions.marquee}
              highContrast={highContrast}
              focusMode={focusMode}
              focusDepth={focusDepth}
              matchedIds={combinedMatchedIds}
              showClusters={showClusters}
              gapBridges={gapBridges}
              highlightedCommunityIds={highlightedCommunityNodeIds}
              onNodeClick={controller.actions.selectNode}
              onNodeContextMenu={(node, x, y) => setNodeMenu({ node, x, y })}
              onNodeHover={controller.actions.setHoveredNodeId}
              onNodeDragStart={controller.interactions.startDragNode}
              onPanStart={controller.interactions.startPan}
              onMarqueeStart={controller.interactions.startMarquee}
              onWheel={controller.interactions.handleWheel}
            />
          )}

          {/* dropdown entre os dois nós selecionados */}
          {relateMenuPos && (
            <div
              className="absolute z-20 -translate-x-1/2 -translate-y-1/2"
              style={{ left: relateMenuPos.x, top: relateMenuPos.y }}
            >
              <div className="rounded-md border bg-popover text-popover-foreground shadow-md py-1 min-w-44">
                <button
                  className="w-full px-3 py-1.5 text-sm text-left hover:bg-accent hover:text-accent-foreground"
                  onClick={handleOpenEdgeManager}
                >
                  Relacionar
                </button>
                <button
                  className="w-full px-3 py-1.5 text-sm text-left hover:bg-accent hover:text-accent-foreground flex items-center gap-2"
                  onClick={() => { closeToolbarModals(); setIsExtractSubgrafoOpen(true); }}
                >
                  <ScissorsIcon className="size-3.5 text-violet-500" />
                  Extrair como subgrafo
                </button>
              </div>
            </div>
          )}
        </div>

        {/* RIGHT PANEL */}
        {controller.state.selectedNode && (
        <PropertiesPanel
          selectedNode={controller.state.selectedNode}
          connectedEdges={selectedNodeEdges}
          isDark={isDark}
          onRemoveFromGraph={handleRemoveFromGraph}
          onDeleteNode={handleDeleteNode}
          isDeleting={isDeletingNode}
          onFocusNode={controller.interactions.focusNode}
          onEditEdge={handleEditEdge}
          onDeleteEdge={handleDeleteEdge}
          onAddEdge={handleAddEdgeFromPanel}
          onEditNode={() => setEditingNode(controller.state.selectedNode)}
          onViewNota={() => setViewingNotaId(controller.state.selectedNode?.id ?? null)}
          onViewTextoBruto={() => setViewingTextoId(controller.state.selectedNode?.id ?? null)}
          onStudyFlashcard={() => setStudyFlashcardId(controller.state.selectedNode?.id ?? null)}
          onViewFlashcard={() => setViewFlashcardId(controller.state.selectedNode?.id ?? null)}
          onStudyDeck={() => setStudyDeckId(controller.state.selectedNode?.id ?? null)}
          onViewDeck={() => setViewDeckId(controller.state.selectedNode?.id ?? null)}
          onGenerateDeck={handleGenerateDeck}
          onStudyNeighborhood={() => {
            const node = controller.state.selectedNode;
            if (!node) return;
            const ids = getNeighborhoodFlashcardIds(node.id, focusDepth);
            if (ids.length === 0) { toast.error("Nenhum flashcard na vizinhança."); return; }
            setNeighborhoodStudyIds(ids);
          }}
          onGenerateInsights={() => setInsightsNode(controller.state.selectedNode ?? null)}
          onExpandNode={async () => {
            const node = controller.state.selectedNode;
            if (!node) return;
            const { expandNode } = await import("@/lib/ai-api");
            const tid = toast.loading("Expandindo nó com IA...");
            try {
              const r = await expandNode(graphId, node.id);
              const parts = [r.topicos && `${r.topicos} tópico(s)`, r.conceitos && `${r.conceitos} conceito(s)`, r.notas && `${r.notas} nota(s)`, r.flashcards && `${r.flashcards} flashcard(s)`].filter(Boolean);
              toast.success(`Criados: ${parts.join(", ") || "nenhum"}`, { id: tid });
              await refreshGraph();
            } catch (e) {
              toast.error(e instanceof Error ? e.message : "Erro ao expandir", { id: tid });
            }
          }}
          onSelectNode={(nodeId) => {
            const node = controller.state.layout.find((n) => n.id === nodeId);
            if (!node) return;
            controller.actions.selectNode(node);
            controller.interactions.focusNode(node);
          }}
          grafoId={graphId}
          grafoNome={controller.state.grafoNome}
          collapsed={rightPanelCollapsed}
          onToggleCollapse={() =>
            setRightPanelCollapsed((v) => !v)
          }
        />
        )}
      </div>
      {/* MENU DE CONTEXTO DO NÓ (clique direito) */}
      {nodeMenu && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setNodeMenu(null)}
            onContextMenu={(e) => {
              e.preventDefault();
              setNodeMenu(null);
            }}
          />
          <div
            className="fixed z-50 min-w-44 rounded-md border bg-popover text-popover-foreground shadow-md py-1"
            style={{ left: nodeMenu.x, top: nodeMenu.y }}
          >
            {nodeMenu.node?.group === "GRAFO_REF" && (
              <button
                className="w-full px-3 py-1.5 text-sm text-left font-medium text-violet-600 dark:text-violet-400 hover:bg-accent hover:text-accent-foreground"
                onClick={() => { handleOpenGrafoRef(nodeMenu.node.id); setNodeMenu(null); }}
              >
                Abrir subgrafo →
              </button>
            )}
            {nodeMenu.node?.isRoot ? (
              <div className="px-3 py-1.5 text-xs text-muted-foreground">
                Assunto-raiz do grafo. Renomeie pelo nome do grafo; só é removido ao excluir o grafo.
              </div>
            ) : (
              <>
                <button
                  className="w-full px-3 py-1.5 text-sm text-left hover:bg-accent hover:text-accent-foreground"
                  onClick={() => {
                    setEditingNode(nodeMenu.node);
                    setNodeMenu(null);
                  }}
                >
                  Editar
                </button>
                <button
                  className="w-full px-3 py-1.5 text-sm text-left hover:bg-accent hover:text-accent-foreground"
                  onClick={() => {
                    removeFromGraph(nodeMenu.node);
                    setNodeMenu(null);
                  }}
                >
                  Remover do grafo
                </button>
                <div className="my-1 h-px bg-border" />
                <button
                  className="w-full px-3 py-1.5 text-sm text-left text-red-600 dark:text-red-400 hover:bg-accent"
                  onClick={() => {
                    const node = nodeMenu.node;
                    setNodeMenu(null);
                    deleteNodeFromApp(node);
                  }}
                >
                  Excluir do aplicativo
                </button>
              </>
            )}
          </div>
        </>
      )}

      <GraphDashboard
        open={isDashboardOpen}
        onClose={() => { setIsDashboardOpen(false); setDashFilterIds(null); }}
        nodes={controller.state.layout}
        edges={controller.state.edges}
        onFilteredIdsChange={setDashFilterIds}
      />

      <GraphSettingsModal
        open={isSettingsOpen}
        onOpenChange={setIsSettingsOpen}
        options={controller.state.physicsOptions}
        onChange={controller.actions.setPhysicsOptions}
        physicsMode={physicsMode}
        onPhysicsModeChange={setPhysicsMode}
        focusDepth={focusDepth}
        onFocusDepthChange={setFocusDepth}
      />
      <CreateNodeModal
        open={isCreateModalOpen}
        onOpenChange={setIsCreateModalOpen}
        grafoId={graphId}
        parentIds={graphEntities}
        onSuccess={refreshGraph}
      />
      <ImportJsonModal
        open={isImportJsonOpen}
        onOpenChange={setIsImportJsonOpen}
        grafoId={graphId}
        onSuccess={refreshGraph}
      />
      {desktopApp && (
        <VaultSyncModal
          open={isVaultOpen}
          onOpenChange={setIsVaultOpen}
          grafoId={graphId}
          grafoNome={controller.state.grafoNome}
          onSynced={refreshGraph}
        />
      )}
      <EditNodeModal
        open={!!editingNode}
        onOpenChange={(open) => !open && setEditingNode(null)}
        grafoId={graphId}
        node={editingNode}
        onSuccess={refreshGraph}
      />
      <ViewNotaModal
        open={!!viewingNotaId}
        onOpenChange={(open) => !open && setViewingNotaId(null)}
        notaId={viewingNotaId}
        grafoId={graphId}
        grafoNome={controller.state.grafoNome}
      />
      <ViewTextoBrutoModal
        open={!!viewingTextoId}
        onOpenChange={(open) => !open && setViewingTextoId(null)}
        textoId={viewingTextoId}
        grafoId={graphId}
        grafoNome={controller.state.grafoNome}
      />
      <StudyFlashcardModal
        open={!!studyFlashcardId}
        onOpenChange={(open) => {
          if (!open) {
            setStudyFlashcardId(null);
            // a revisão pode ter mudado a maestria → recalcula o domínio
            refreshGraph();
          }
        }}
        flashcardId={studyFlashcardId}
        grafoId={graphId}
        grafoNome={controller.state.grafoNome}
      />
      <ViewFlashcardModal
        open={!!viewFlashcardId}
        onOpenChange={(open) => !open && setViewFlashcardId(null)}
        flashcardId={viewFlashcardId}
        grafoId={graphId}
        grafoNome={controller.state.grafoNome}
      />
      <NodeInsightsModal
        open={!!insightsNode}
        onOpenChange={(open) => !open && setInsightsNode(null)}
        grafoId={graphId}
        nodeId={insightsNode?.id ?? null}
        nodeLabel={insightsNode?.label}
        onAdded={refreshGraph}
      />
      <StudyDeckModal
        open={!!studyDeckId}
        onOpenChange={(open) => {
          if (!open) {
            setStudyDeckId(null);
            refreshGraph();
          }
        }}
        baralhoId={studyDeckId}
        grafoId={graphId}
        grafoNome={controller.state.grafoNome}
      />
      <ViewDeckModal
        open={!!viewDeckId}
        onOpenChange={(open) => !open && setViewDeckId(null)}
        baralhoId={viewDeckId}
        grafoId={graphId}
        grafoNome={controller.state.grafoNome}
      />
      <CommunitiesPanel
        open={communitiesOpen}
        onOpenChange={setCommunitiesOpen}
        communities={communities}
        onCreateDeck={async (community) => {
          const ids = community.nodes.filter(n => n.group === "FLASHCARD").map(n => n.id);
          try {
            await createBaralhoNode(graphId, `Baralho — ${community.label}`, ids);
            await refreshGraph();
            toast.success("Baralho criado!");
          } catch { toast.error("Erro ao criar baralho."); }
        }}
        onHighlightCommunity={setHighlightedCommunityId}
        onSummarizeCommunity={(community) => {
          setCommunitySummary({ label: community.label, nodeIds: community.nodes.map(n => n.id) });
          setCommunitiesOpen(false);
        }}
      />
      <GapDetectionModal
        open={gapsOpen}
        onOpenChange={setGapsOpen}
        grafoId={graphId}
        gaps={gaps}
        onAdded={refreshGraph}
        onHighlightGap={setHighlightedGap}
      />
      <StudyDeckModal
        open={!!neighborhoodStudyIds}
        onOpenChange={(open) => { if (!open) { setNeighborhoodStudyIds(null); refreshGraph(); } }}
        baralhoId={null}
        grafoId={graphId}
        grafoNome={controller.state.grafoNome}
        customFlashcardIds={neighborhoodStudyIds ?? undefined}
        customTitulo={`Vizinhança: ${controller.state.selectedNode?.label ?? ""}`}
      />
      <GenerateGraphModal
        open={generateGraphOpen}
        onOpenChange={setGenerateGraphOpen}
        grafoId={graphId}
        onGenerated={refreshGraph}
      />
      <GenerateGraphFromBaralhoModal
        open={generateFromBaralhoOpen}
        onOpenChange={setGenerateFromBaralhoOpen}
        grafoId={graphId}
        onGenerated={refreshGraph}
      />
      <AutoLinkModal
        open={autoLinkOpen}
        onOpenChange={setAutoLinkOpen}
        grafoId={graphId}
        onApplied={refreshGraph}
      />
      <DuplicatesModal
        open={duplicatesOpen}
        onOpenChange={setDuplicatesOpen}
        grafoId={graphId}
        onDeleted={refreshGraph}
      />
      <MissingPrereqsModal
        open={missingPrereqsOpen}
        onOpenChange={setMissingPrereqsOpen}
        grafoId={graphId}
        onAdded={refreshGraph}
      />
      <CommunitySummaryModal
        open={!!communitySummary}
        onOpenChange={(open) => { if (!open) setCommunitySummary(null); }}
        grafoId={graphId}
        communityLabel={communitySummary?.label ?? ""}
        nodeIds={communitySummary?.nodeIds ?? []}
      />
      <GraphChatModal
        open={chatOpen}
        onOpenChange={setChatOpen}
        grafoId={graphId}
      />
      <CompletenessModal
        open={completenessOpen}
        onOpenChange={setCompletenessOpen}
        grafoId={graphId}
        onGenerated={refreshGraph}
      />
      <EdgeManagerModal
        open={isEdgeManagerOpen}
        onOpenChange={(open) => {
          setIsEdgeManagerOpen(open);
          if (!open) {
            setEditEdge(null);
            setAddEdgeSourceId(null);
          }
        }}
        grafoId={graphId}
        existingEdges={graphEdges}
        initialEditEdge={editEdge}
        initialSourceId={
          addEdgeSourceId ??
          (controller.state.selectedNodeIds.size === 2
            ? [...controller.state.selectedNodeIds][0]
            : undefined)
        }
        initialTargetId={
          addEdgeSourceId
            ? undefined
            : controller.state.selectedNodeIds.size === 2
            ? [...controller.state.selectedNodeIds][1]
            : undefined
        }
        onSuccess={async () => {
          await loadEdges();
          await refreshGraph();
        }}
      />
      <CreateSubgrafoModal
        open={isCreateSubgrafoOpen}
        onClose={() => setIsCreateSubgrafoOpen(false)}
        parentGrafoId={graphId}
        onCreated={async (_grafoId, _nodeId) => {
          await refreshGraph();
          await getGrafoInfo(graphId).then(setGrafoInfo).catch(() => {});
        }}
      />
      <ExtractSubgrafoModal
        open={isExtractSubgrafoOpen}
        onClose={() => setIsExtractSubgrafoOpen(false)}
        parentGrafoId={graphId}
        selectedNodes={[...controller.state.selectedNodeIds].map((id) => {
          const n = controller.state.layout.find((l) => l.id === id);
          return { id, label: n?.label ?? id, type: n?.group ?? "" };
        })}
        onExtracted={async (_grafoId, _nodeId) => {
          controller.actions.selectNode(null);
          await refreshGraph();
          await getGrafoInfo(graphId).then(setGrafoInfo).catch(() => {});
        }}
      />

      <DeleteDeckModal
        open={!!deleteDeckConfirm}
        onOpenChange={(open) => !open && setDeleteDeckConfirm(null)}
        deckLabel={deleteDeckConfirm?.node?.label ?? ""}
        loading={isDeletingNode}
        onConfirm={async (deleteConnected) => {
          const node = deleteDeckConfirm?.node;
          setDeleteDeckConfirm(null);
          if (node) await performDeleteNode(node, deleteConnected);
        }}
      />
      <GenerateDeckModal
        open={!!generateDeckConfirm}
        onOpenChange={(open) => !open && setGenerateDeckConfirm(null)}
        defaultTitle={generateDeckConfirm?.node?.label ?? ""}
        flashcardCount={generateDeckConfirm?.flashcardIds.length ?? 0}
        loading={isGeneratingDeck}
        onConfirm={performGenerateDeck}
      />
    </div>
  );
}