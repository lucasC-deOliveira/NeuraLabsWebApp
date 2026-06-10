"use client";

import { useParams, useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { toast } from "sonner";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { LeftSidebar } from "@/components/graph/LeftSidebar";
import { PropertiesPanel } from "@/components/graph/PropertiesPanel";

import {
  ArrowLeftIcon,
  Loader2Icon,
  ZoomInIcon,
  ZoomOutIcon,
} from "lucide-react";

import { useGraphController } from "@/modules/graph/presentation/controllers/useGraphController";
import { GraphRenderer } from "@/modules/graph/presentation/components/GraphRenderer";

import {
  deleteGraphNode,
  removeNodeFromGraph,
  getGraphNodes,
} from "@/actions/graph";
import { CreateNodeModal } from "@/components/graph/CreateNodeModal";

export default function GraphPage() {
  const router = useRouter();
  const params = useParams();
  const graphId = params.id as string;

  const { theme, resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark" || theme === "dark";

  const controller = useGraphController(graphId);

  const [searchQuery, setSearchQuery] = useState("");
  const [leftPanelCollapsed, setLeftPanelCollapsed] = useState(false);
  const [rightPanelCollapsed, setRightPanelCollapsed] = useState(false);
  const [isDeletingNode, setIsDeletingNode] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  const handleOpenCreateNode = () => {
    setIsCreateModalOpen(true);
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
  // ======================
  // SEARCH
  // ======================
  const searchResults = controller.state.layout
    .filter((n) =>
      n.label.toLowerCase().includes(searchQuery.toLowerCase())
    )
    .slice(0, 8);

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
  // GRAPH REFRESH
  // ======================
  const refreshGraph = async () => {
    const result = await getGraphNodes(graphId);

    controller.actions.setRawNodes(result.nodes);
    controller.actions.setRawEdges(result.edges);
    controller.actions.setLayout([]);
    controller.actions.setSelectedNode(null);
  };

  // ======================
  // DELETE NODE
  // ======================
  const handleDeleteNode = async () => {
    if (!controller.state.selectedNode) return;

    setIsDeletingNode(true);
    try {
      await deleteGraphNode(controller.state.selectedNode.id, graphId);
      toast.success("Node removido");
      await refreshGraph();
    } catch {
      toast.error("Erro ao excluir node");
    } finally {
      setIsDeletingNode(false);
    }
  };

  // ======================
  // REMOVE FROM GRAPH
  // ======================
  const handleRemoveFromGraph = async () => {
    if (!controller.state.selectedNode) return;

    setIsDeletingNode(true);
    try {
      await removeNodeFromGraph(
        controller.state.selectedNode.id,
        graphId
      );
      toast.success("Removido do grafo");
      await refreshGraph();
    } catch {
      toast.error("Erro ao remover");
    } finally {
      setIsDeletingNode(false);
    }
  };

  // ======================
  // RENDER
  // ======================
  return (
    <div className="flex flex-col h-screen overflow-hidden">

      {/* HEADER */}
      <header className="h-10 flex items-center px-2 border-b">
        <Button variant="ghost" onClick={() => router.push("/graph")}>
          <ArrowLeftIcon />
        </Button>

        <div className="flex-1 text-center font-semibold">
          {controller.state.grafoNome}
        </div>

        <div className="flex gap-2">
          <Button onClick={() => handleZoomButton(0.1)}>
            <ZoomInIcon />
          </Button>
          <Button onClick={() => handleZoomButton(-0.1)}>
            <ZoomOutIcon />
          </Button>
        </div>
      </header>

      {/* BODY */}
      <div className="flex flex-1 overflow-hidden">

        {/* LEFT SIDEBAR */}
        <LeftSidebar
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          searchResults={searchResults}
          nodeStats={{}}
          filterGroup={controller.state.filterGroup}
          onToggleFilter={controller.actions.setFilterGroup}
          collapsed={leftPanelCollapsed}
          onToggleCollapse={() =>
            setLeftPanelCollapsed((v) => !v)
          }
          onOpenCreateNode={handleOpenCreateNode}
        />

        {/* GRAPH */}
        <div className="flex-1 relative">
          <GraphRenderer
            nodes={controller.state.filteredNodes}
            edges={controller.state.filteredEdges}
            zoom={controller.state.zoom}
            pan={controller.state.pan}
            isDark={isDark}
            svgRef={controller.svgRef}
            onNodeClick={controller.actions.setSelectedNode}
            onNodeHover={controller.actions.setHoveredNodeId}
            onNodeDragStart={controller.interactions.startDragNode}
            onPanStart={controller.interactions.startPan}
            onWheel={controller.interactions.handleWheel}
          />
        </div>

        {/* RIGHT PANEL */}
        <PropertiesPanel
          selectedNode={controller.state.selectedNode}
          connectedEdges={[]}
          isDark={isDark}
          onRemoveFromGraph={handleRemoveFromGraph}
          onDeleteNode={handleDeleteNode}
          isDeleting={isDeletingNode}
          onFocusNode={controller.interactions.focusNode}
          collapsed={rightPanelCollapsed}
          onToggleCollapse={() =>
            setRightPanelCollapsed((v) => !v)
          }
        />
      </div>
      <CreateNodeModal
        open={isCreateModalOpen}
        onOpenChange={setIsCreateModalOpen}
        grafoId={graphId}
      />
    </div>
  );
}