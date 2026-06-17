"use client";

import { useParams, useRouter } from "@/lib/navigation";
import { useTheme } from "next-themes";
import { toast } from "sonner";
import { useEffect, useMemo, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { PropertiesPanel } from "@/components/graph/PropertiesPanel";

import { ArrowLeftIcon, Loader2Icon, FolderTreeIcon, BarChart2Icon, GlobeIcon, NetworkIcon, ZapIcon, WandSparklesIcon, Link2Icon, CopyIcon, GitBranchIcon } from "lucide-react";
import { CommunitiesPanel } from "@/components/graph/CommunitiesPanel";
import { GapDetectionModal } from "@/components/graph/GapDetectionModal";
import { GenerateGraphModal } from "@/components/graph/GenerateGraphModal";
import { AutoLinkModal } from "@/components/graph/AutoLinkModal";
import { DuplicatesModal } from "@/components/graph/DuplicatesModal";
import { CommunitySummaryModal } from "@/components/graph/CommunitySummaryModal";
import { MissingPrereqsModal } from "@/components/graph/MissingPrereqsModal";
import { detectCommunities, detectGaps, type Community, type StructuralGap } from "@/lib/graph-communities";
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

import {
  deleteGraphNode,
  removeNodeFromGraph,
  getGraphNodes,
  getGraphEdges,
  deleteEdge,
} from "@/lib/graph-api";
import { CreateNodeModal } from "@/components/graph/CreateNodeModal";
import { ImportJsonModal } from "@/components/graph/ImportJsonModal";
import { EdgeManagerModal } from "@/components/graph/EdgeManagerModal";
import { EditNodeModal } from "@/components/graph/EditNodeModal";
import { ViewNotaModal } from "@/components/graph/ViewNotaModal";
import { ViewTextoBrutoModal } from "@/components/graph/ViewTextoBrutoModal";
import { StudyFlashcardModal } from "@/components/graph/StudyFlashcardModal";
import { ViewFlashcardModal } from "@/components/graph/ViewFlashcardModal";
import { NodeInsightsModal } from "@/components/graph/NodeInsightsModal";
import { StudyDeckModal } from "@/components/graph/StudyDeckModal";
import { ViewDeckModal } from "@/components/graph/ViewDeckModal";
import { VaultSyncModal } from "@/components/graph/VaultSyncModal";
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
  // IA automática
  const [autoLinkOpen, setAutoLinkOpen] = useState(false);
  const [duplicatesOpen, setDuplicatesOpen] = useState(false);
  const [missingPrereqsOpen, setMissingPrereqsOpen] = useState(false);
  const [communitySummary, setCommunitySummary] = useState<{ label: string; nodeIds: string[] } | null>(null);

  // P3 — detecta comunidades a partir do layout atual
  const communities = useMemo<Community[]>(() => {
    if (controller.state.layout.length < 3) return [];
    return detectCommunities(controller.state.layout, controller.state.edges);
  }, [controller.state.layout, controller.state.edges]);

  // P1 — detecta lacunas entre comunidades
  const gaps = useMemo<StructuralGap[]>(
    () => detectGaps(communities, controller.state.edges),
    [communities, controller.state.edges],
  );

  // P5 — coordenadas das pontes para overlay no renderer
  const gapBridges = useMemo(
    () => gapsOpen
      ? gaps.map(g => ({ x1: g.bridgeA.x, y1: g.bridgeA.y, x2: g.bridgeB.x, y2: g.bridgeB.y, colorA: g.communityA.color, colorB: g.communityB.color }))
      : [],
    [gaps, gapsOpen],
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
  const deleteNodeFromApp = async (node: any) => {
    if (!node) return;
    if (!confirm(`Excluir “${node.label}” permanentemente do aplicativo?`)) return;

    setIsDeletingNode(true);
    try {
      await deleteGraphNode(node.id, graphId);
      toast.success("Nó excluído do aplicativo");
      await refreshGraph();
    } catch {
      toast.error("Erro ao excluir node");
    } finally {
      setIsDeletingNode(false);
    }
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
  // RENDER
  // ======================
  return (
    <div className="flex flex-col h-screen overflow-hidden">

      {/* HEADER */}
      <header className="h-10 flex items-center px-2 border-b border-primary/60">
        <Button variant="ghost" className="text-primary" onClick={() => router.push("/graph")}>
          <ArrowLeftIcon />
        </Button>

        <div className="flex-1 text-center font-semibold text-primary">
          {controller.state.grafoNome}
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

        <Button variant="ghost" className="text-primary gap-1.5" onClick={() => { closeToolbarModals(); setGenerateGraphOpen(v => !v); }} title="Gerar grafo a partir de texto">
          <WandSparklesIcon className="size-4" />
        </Button>

        <Button variant="ghost" className="text-primary gap-1.5" onClick={() => { closeToolbarModals(); setAutoLinkOpen(v => !v); }} title="Auto-conectar nós relacionados com IA">
          <Link2Icon className="size-4" />
        </Button>

        <Button variant="ghost" className="text-primary gap-1.5" onClick={() => { closeToolbarModals(); setDuplicatesOpen(v => !v); }} title="Detectar nós duplicados">
          <CopyIcon className="size-4" />
        </Button>

        <Button variant="ghost" className="text-primary gap-1.5" onClick={() => { closeToolbarModals(); setMissingPrereqsOpen(v => !v); }} title="Detectar pré-requisitos faltantes">
          <GitBranchIcon className="size-4" />
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
              <div className="rounded-md border bg-popover text-popover-foreground shadow-md py-1 min-w-32">
                <button
                  className="w-full px-3 py-1.5 text-sm text-left hover:bg-accent hover:text-accent-foreground"
                  onClick={handleOpenEdgeManager}
                >
                  Relacionar
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
        // origem do botão "Nova relação" do painel, ou os 2 nós selecionados
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
    </div>
  );
}