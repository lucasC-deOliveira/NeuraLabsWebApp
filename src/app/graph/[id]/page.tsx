"use client";

import { useParams, useRouter } from "@/lib/navigation";
import { useTheme } from "next-themes";
import { toast } from "sonner";
import { useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { PropertiesPanel } from "@/components/graph/PropertiesPanel";

import { ArrowLeftIcon, Loader2Icon, FolderTreeIcon, BarChart2Icon } from "lucide-react";

import { useGraphController } from "@/modules/graph/presentation/controllers/useGraphController";
import { GraphRenderer } from "@/modules/graph/presentation/components/GraphRenderer";
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

  const combinedMatchedIds = useMemo(() => {
    const a = dashFilterIds;
    const b = search.matchedIds;
    if (!a && !b) return null;
    if (a && b) return new Set([...a].filter(id => b.has(id)));
    return a ?? b ?? null;
  }, [dashFilterIds, search.matchedIds]);
  const desktopApp = isDesktop();
  const [legendVisible, setLegendVisible] = useState(false);
  const [highContrast, setHighContrast] = useState(false);
  const [focusMode, setFocusMode] = useState(false);
  const [focusDepth, setFocusDepth] = useState(DEFAULT_FOCUS_DEPTH);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isEdgeManagerOpen, setIsEdgeManagerOpen] = useState(false);
  const [graphEdges, setGraphEdges] = useState<any[]>([]);
  const [nodeMenu, setNodeMenu] = useState<{ node: any; x: number; y: number } | null>(null);
  const [editingNode, setEditingNode] = useState<any>(null);
  const [viewingNotaId, setViewingNotaId] = useState<string | null>(null);
  const [studyFlashcardId, setStudyFlashcardId] = useState<string | null>(null);
  const [viewFlashcardId, setViewFlashcardId] = useState<string | null>(null);
  const [studyDeckId, setStudyDeckId] = useState<string | null>(null);
  const [viewDeckId, setViewDeckId] = useState<string | null>(null);
  const [editEdge, setEditEdge] = useState<any>(null);
  const [addEdgeSourceId, setAddEdgeSourceId] = useState<string | null>(null);

  const handleOpenCreateNode = () => {
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

  const handleOpenEdgeManager = async () => {
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

        <Button variant="ghost" className="text-primary gap-1.5" onClick={() => setIsDashboardOpen(v => !v)} title="Analytics do grafo">
          <BarChart2Icon className="size-4" />
        </Button>

        {desktopApp && (
          <Button variant="ghost" className="text-primary gap-1.5" onClick={() => setIsVaultOpen(true)} title="Sincronizar com vault Markdown">
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
            onOpenImportJson={() => setIsImportJsonOpen(true)}
            search={search}
            onFocusNode={controller.interactions.focusNode}
            nodeStats={nodeStats}
            hiddenTypes={controller.state.hiddenTypes}
            onToggleType={controller.actions.toggleNodeType}
            roadmapOpen={roadmapOpen}
            onToggleRoadmap={() => setRoadmapOpen((v) => !v)}
          />

          <RoadmapPanel
            open={roadmapOpen}
            onClose={() => setRoadmapOpen(false)}
            nodes={controller.state.layout}
            edges={controller.state.edges}
            onFocusNode={(n) => {
              const full = controller.state.layout.find((x) => x.id === n.id);
              if (!full) return;
              controller.interactions.focusNode(full);
              controller.actions.selectNode(full);
            }}
          />
          <GraphToolbar
            legendVisible={legendVisible}
            onToggleLegend={() => setLegendVisible((v) => !v)}
            onZoomIn={() => handleZoomButton(0.1)}
            onZoomOut={() => handleZoomButton(-0.1)}
            physicsEnabled={controller.state.physicsEnabled}
            onTogglePhysics={() =>
              controller.actions.setPhysicsEnabled((v: boolean) => !v)
            }
            highContrast={highContrast}
            onToggleHighContrast={() => setHighContrast((v) => !v)}
            focusMode={focusMode}
            onToggleFocus={() => setFocusMode((v) => !v)}
            onOpenSettings={() => setIsSettingsOpen(true)}
          />
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
            onNodeClick={controller.actions.selectNode}
            onNodeContextMenu={(node, x, y) => setNodeMenu({ node, x, y })}
            onNodeHover={controller.actions.setHoveredNodeId}
            onNodeDragStart={controller.interactions.startDragNode}
            onPanStart={controller.interactions.startPan}
            onMarqueeStart={controller.interactions.startMarquee}
            onWheel={controller.interactions.handleWheel}
          />

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
          onStudyFlashcard={() => setStudyFlashcardId(controller.state.selectedNode?.id ?? null)}
          onViewFlashcard={() => setViewFlashcardId(controller.state.selectedNode?.id ?? null)}
          onStudyDeck={() => setStudyDeckId(controller.state.selectedNode?.id ?? null)}
          onViewDeck={() => setViewDeckId(controller.state.selectedNode?.id ?? null)}
          onGenerateInsights={() => setInsightsNode(controller.state.selectedNode ?? null)}
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