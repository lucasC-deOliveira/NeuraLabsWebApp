import { useEffect, useMemo, useRef, useState } from "react";
import { useGraphData } from "../hooks/useGraphData";
import { useGraphLayout } from "../hooks/useGraphLayout";
import { SimNode } from "../../infra/layout/force-layout.engine";
import { useGraphInteractions } from "../hooks/useGraphInteractions";
import { getFilteredEdges, getFilteredNodes } from "../../domain/selectors/graph.selectors";

export function useGraphController(graphId: string) {
  const svgRef = useRef<SVGSVGElement | null>(null);

  const {
    rawNodes,
    rawEdges,
    loading,
    grafoNome,
    setGrafoNome,
    zoom,
    setZoom,
    pan,
    setPan,
    setRawNodes,
    setRawEdges,
  } = useGraphData(graphId);

  const { nodes, edges } = useGraphLayout(rawNodes, rawEdges);

  const [layout, setLayout] = useState<SimNode[]>([]);
  const [selectedNode, setSelectedNode] = useState<any>(null);
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const [filterGroup, setFilterGroup] = useState<string | null>(null);

  const interactions = useGraphInteractions({
    layout,
    setLayout,
    zoom,
    setZoom,
    pan,
    setPan,
    svgRef,
  });

  // init layout
  useEffect(() => {
    if (nodes.length > 0 && layout.length === 0) {
      setLayout(nodes);
    }
    console.log("Layout initialized");
  }, [nodes]);

  const visibleNodeIds = useMemo(
    () => new Set(layout.map(n => n.id)),
    [layout]
  );

  const filteredNodes = useMemo(
    () => getFilteredNodes(layout, filterGroup),
    [layout, filterGroup]
  );

  const filteredEdges = useMemo(
    () => getFilteredEdges(edges, layout, visibleNodeIds),
    [edges, layout, visibleNodeIds]
  );

  return {
    svgRef,
    state: {
      layout,
      filteredNodes,
      filteredEdges,
      selectedNode,
      hoveredNodeId,
      filterGroup,
      zoom,
      pan,
      loading,
      grafoNome,
    },
    actions: {
      setSelectedNode,
      setHoveredNodeId,
      setFilterGroup,
      setLayout,
      setGrafoNome,
      setZoom,
      setPan,
      setRawNodes,
      setRawEdges,
    },
    interactions,
  };
}