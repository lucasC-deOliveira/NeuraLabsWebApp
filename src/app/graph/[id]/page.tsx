"use client";

import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { useRouter, useParams } from "next/navigation";
import { useTheme } from "next-themes";
import {
  getGraphNodes,
  deleteGrafo,
  deleteGraphNode,
  removeNodeFromGraph,
  getGrafoInfo,
  updateGrafoNome,
  type GraphNodeType,
  type GraphEdgeType,
  saveGraphVisualState,
  loadGraphVisualState,
  getParentOptions,
  getGraphEdges,
} from "@/actions/graph";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { CreateNodeModal } from "@/components/graph/CreateNodeModal";
import { EdgeManagerModal } from "@/components/graph/EdgeManagerModal";
import { LeftSidebar } from "@/components/graph/LeftSidebar";
import { PropertiesPanel } from "@/components/graph/PropertiesPanel";
import { Separator } from "@/components/ui/separator";
import {
  ArrowLeftIcon,
  Loader2Icon,
  ZoomInIcon,
  ZoomOutIcon,
  Maximize2Icon,
  BookOpenIcon,
  Trash2Icon,
  SearchIcon,
  EyeIcon,
  EyeOffIcon,
  InfoIcon,
  PlusIcon,
  LinkIcon,
} from "lucide-react";
import { toast } from "sonner";

// --- Semantic relation label mapping ---
const RELATION_LABELS: Record<string, string> = {
  GERA: "gera",
  REFERENCIA: "referência",
  DEFINE: "define",
  EXPLICA: "explica",
  APROFUNDA: "aprofunda",
  EXEMPLIFICA: "exemplifica",
  CONTRASTA: "contrasta",
  SINTETIZA: "sintetiza",
  ALERTA_ERRO: "alerta erro",
  IS_A: "é um",
  PART_OF: "parte de",
  PREREQUISITO: "pré-requisito",
  DERIVA_DE: "deriva de",
  EVOLUI_PARA: "evolui para",
  REFORCA: "reforça",
  ALTERNATIVA_A: "alternativa",
  CONTRASTA_COM: "contrasta com",
  CONFUNDE_COM: "confunde com",
  ANTI_PADRAO_DE: "anti-padrão",
  MEDIDO_POR: "medido por",
  OBJETIVO_DE: "objetivo de",
  PERTENCE_A: "pertence a",
  FUNDAMENTA: "fundamenta",
  APLICADO_EM: "aplicado em",
  SUBTOPICO_DE: "subtópico de",
  RELACIONADO: "relacionado",
  DEPENDE_DE: "depende de",
  HERDA: "herda",
  TESTA_DEFINICAO: "testa definição",
  TESTA_EXEMPLO: "testa exemplo",
  TESTA_APLICACAO: "testa aplicação",
  TESTA_ANALISE: "testa análise",
  TESTA_SINTESE: "testa síntese",
};

const RELATION_GROUPS = [
  {
    title: "Nota → Conceito",
    types: ["DEFINE", "EXPLICA", "APROFUNDA", "EXEMPLIFICA", "CONTRASTA", "SINTETIZA", "ALERTA_ERRO"],
  },
  {
    title: "Conceito ↔ Conceito",
    types: ["IS_A", "PART_OF", "PREREQUISITO", "DERIVA_DE", "EVOLUI_PARA", "REFORCA", "ALTERNATIVA_A", "CONTRASTA_COM", "CONFUNDE_COM", "ANTI_PADRAO_DE", "MEDIDO_POR", "OBJETIVO_DE"],
  },
  {
    title: "Conceito ↔ Tópico",
    types: ["PERTENCE_A", "FUNDAMENTA", "APLICADO_EM"],
  },
  {
    title: "Tópico ↔ Tópico",
    types: ["SUBTOPICO_DE", "RELACIONADO", "DEPENDE_DE", "EVOLUI_PARA"],
  },
  {
    title: "Tópico ↔ Matéria",
    types: ["PERTENCE_A", "APLICADO_EM"],
  },
];

// --- Force simulation node / edge types (internal, for layout) ---
interface SimNode {
  id: string;
  label: string;
  group: string;
  dominio: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  tipoReal: string;
  parentId?: string;
  pergunta?: string;
  prioridadeRevisao: number;
  width: number;
  height: number;
}

interface SimEdge {
  source: string;
  target: string;
  label: string;
  type: string;
  peso: number;
  sourceX: number;
  sourceY: number;
  targetX: number;
  targetY: number;
}

// --- Force simulation (own implementation, no D3) ---
function createSimulation(
  rawNodes: GraphNodeType[],
  rawEdges: GraphEdgeType[],
  width: number,
  height: number,
): { nodes: SimNode[]; edges: SimEdge[] } {
  const nodes: SimNode[] = rawNodes.map((n) => {
    const labelLen = n.label.length;
    return {
      id: n.id,
      label: n.label,
      group: n.type,
      dominio: n.nivelDominio,
      prioridadeRevisao: n.prioridadeRevisao,
      parentId: n.parentId,
      pergunta: n.pergunta,
      tipoReal: n.type,
      x: width / 2 + (Math.random() - 0.5) * 600,
      y: height / 2 + (Math.random() - 0.5) * 400,
      vx: 0,
      vy: 0,
      width: Math.max(60, Math.min(200, labelLen * 7 + 24)),
      height: n.type === "FLASHCARD" ? 56 : n.type === "ASSUNTO" ? 48 : 40,
    };
  });

  const edges: SimEdge[] = rawEdges.map((e) => ({
    source: e.source,
    target: e.target,
    label: RELATION_LABELS[e.type] ?? e.type,
    type: e.type,
    peso: e.peso,
    sourceX: 0,
    sourceY: 0,
    targetX: 0,
    targetY: 0,
  }));

  const nodeMap = new Map(nodes.map((n) => [n.id, n]));
  const repulsion = 12000;
  const attraction = 0.004;
  const gravity = 0.008;
  const damping = 0.9;
  const idealEdgeLen = 200;
  const minGap = 80;

  for (let iter = 0; iter < 500; iter++) {
    const temperature = 1 - iter / 500;

    // Repulsion between all pairs
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const a = nodes[i];
        const b = nodes[j];
        let dx = a.x - b.x;
        let dy = a.y - b.y;
        let dist = Math.sqrt(dx * dx + dy * dy) || 1;
        let force = repulsion / (dist * dist);
        let fx = (dx / dist) * force;
        let fy = (dy / dist) * force;
        a.vx += fx;
        a.vy += fy;
        b.vx -= fx;
        b.vy -= fy;
      }
    }

    // Attraction along edges
    for (const edge of edges) {
      const a = nodeMap.get(edge.source);
      const b = nodeMap.get(edge.target);
      if (!a || !b) continue;
      let dx = b.x - a.x;
      let dy = b.y - a.y;
      let dist = Math.sqrt(dx * dx + dy * dy) || 1;
      let force = (dist - idealEdgeLen) * attraction;
      let fx = (dx / dist) * force;
      let fy = (dy / dist) * force;
      a.vx += fx;
      a.vy += fy;
      b.vx -= fx;
      b.vy -= fy;
    }

    // Gravity toward center
    for (const node of nodes) {
      node.vx += (width / 2 - node.x) * gravity;
      node.vy += (height / 2 - node.y) * gravity;
    }

    // Collision detection
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const a = nodes[i];
        const b = nodes[j];
        const aHw = a.width / 2;
        const aHh = a.height / 2;
        const bHw = b.width / 2;
        const bHh = b.height / 2;
        let dx = b.x - a.x;
        let dy = b.y - a.y;
        const rA = Math.sqrt(aHw * aHw + aHh * aHh);
        const rB = Math.sqrt(bHw * bHw + bHh * bHh);
        const minDist = rA + rB + minGap;
        const distSq = dx * dx + dy * dy;
        if (distSq < minDist * minDist) {
          const dist = Math.sqrt(distSq) || 0.01;
          const overlap = minDist - dist;
          const sepX = (dx / dist) * (overlap + 2);
          const sepY = (dy / dist) * (overlap + 2);
          a.x -= sepX;
          a.y -= sepY;
          b.x += sepX;
          b.y += sepY;
          a.vx = a.vx * 0.3;
          a.vy = a.vy * 0.3;
          b.vx = b.vx * 0.3;
          b.vy = b.vy * 0.3;
        }
      }
    }

    // Update positions
    for (const node of nodes) {
      node.vx *= damping;
      node.vy *= damping;
      node.x += node.vx * temperature;
      node.y += node.vy * temperature;
      node.x = Math.max(node.width / 2, Math.min(width - node.width / 2, node.x));
      node.y = Math.max(node.height / 2, Math.min(height - node.height / 2, node.y));
    }
  }

  // Update edge coordinates
  for (const edge of edges) {
    const a = nodeMap.get(edge.source);
    const b = nodeMap.get(edge.target);
    if (a && b) {
      edge.sourceX = a.x;
      edge.sourceY = a.y;
      edge.targetX = b.x;
      edge.targetY = b.y;
    }
  }

  return { nodes, edges };
}

// --- Node type colors (same as graph page) ---
const NODE_TYPE_COLORS: Record<string, { light: { bg: string; border: string; text: string }; dark: { bg: string; border: string; text: string } }> = {
  ASSUNTO: {
    light: { bg: "#f1f5f9", border: "#475569", text: "#1e293b" },
    dark: { bg: "#1e293b", border: "#94a3b8", text: "#e2e8f0" },
  },
  TOPICO: {
    light: { bg: "#dbeafe", border: "#2563eb", text: "#1e3a5f" },
    dark: { bg: "#1e3a5f", border: "#60a5fa", text: "#bfdbfe" },
  },
  CONCEITO: {
    light: { bg: "#d1fae5", border: "#059669", text: "#064e3b" },
    dark: { bg: "#064e3b", border: "#34d399", text: "#a7f3d0" },
  },
  FLASHCARD: {
    light: { bg: "#fef3c7", border: "#d97706", text: "#78350f" },
    dark: { bg: "#451a03", border: "#fbbf24", text: "#fef3c7" },
  },
  NOTA: {
    light: { bg: "#ede9fe", border: "#7c3aed", text: "#4c1d95" },
    dark: { bg: "#2e1065", border: "#a78bfa", text: "#ede9fe" },
  },
};

const NODE_TYPE_DISPLAY: Record<string, { label: string }> = {
  ASSUNTO: { label: "Assunto" },
  TOPICO: { label: "Tópico" },
  CONCEITO: { label: "Conceito" },
  FLASHCARD: { label: "Flashcard" },
  NOTA: { label: "Nota" },
};

function getNodeColors(type: string, dark: boolean) {
  const entry = NODE_TYPE_COLORS[type];
  if (!entry) return dark ? NODE_TYPE_COLORS.CONCEITO.dark : NODE_TYPE_COLORS.CONCEITO.light;
  return dark ? entry.dark : entry.light;
}

function getRelColor(type: string, dark: boolean): string {
  const REL_COLORS: Record<string, { light: string; dark: string }> = {
    GERA: { light: "#dc2626", dark: "#f87171" },
    REFERENCIA: { light: "#ca8a04", dark: "#facc15" },
    DEFINE: { light: "#0891b2", dark: "#22d3ee" },
    EXPLICA: { light: "#059669", dark: "#34d399" },
    APROFUNDA: { light: "#0d9488", dark: "#2dd4bf" },
    EXEMPLIFICA: { light: "#ea580c", dark: "#fb923c" },
    CONTRASTA: { light: "#e11d48", dark: "#fb7185" },
    SINTETIZA: { light: "#7c3aed", dark: "#a78bfa" },
    ALERTA_ERRO: { light: "#dc2626", dark: "#ef4444" },
    IS_A: { light: "#2563eb", dark: "#60a5fa" },
    PART_OF: { light: "#0891b2", dark: "#22d3ee" },
    PREREQUISITO: { light: "#6d28d9", dark: "#a78bfa" },
    DERIVA_DE: { light: "#0d9488", dark: "#2dd4bf" },
    EVOLUI_PARA: { light: "#0284c7", dark: "#38bdf8" },
    REFORCA: { light: "#059669", dark: "#34d399" },
    ALTERNATIVA_A: { light: "#ea580c", dark: "#fb923c" },
    CONTRASTA_COM: { light: "#e11d48", dark: "#fb7185" },
    CONFUNDE_COM: { light: "#c026d3", dark: "#e879f9" },
    ANTI_PADRAO_DE: { light: "#dc2626", dark: "#f87171" },
    MEDIDO_POR: { light: "#0891b2", dark: "#22d3ee" },
    OBJETIVO_DE: { light: "#7c3aed", dark: "#a78bfa" },
    PERTENCE_A: { light: "#64748b", dark: "#94a3b8" },
    FUNDAMENTA: { light: "#4f46e5", dark: "#818cf8" },
    APLICADO_EM: { light: "#0d9488", dark: "#2dd4bf" },
    SUBTOPICO_DE: { light: "#64748b", dark: "#94a3b8" },
    RELACIONADO: { light: "#475569", dark: "#94a3b8" },
    DEPENDE_DE: { light: "#7c3aed", dark: "#a78bfa" },
    HERDA: { light: "#4f46e5", dark: "#818cf8" },
    TESTA_DEFINICAO: { light: "#d97706", dark: "#fbbf24" },
    TESTA_EXEMPLO: { light: "#ca8a04", dark: "#facc15" },
    TESTA_APLICACAO: { light: "#ea580c", dark: "#fb923c" },
    TESTA_ANALISE: { light: "#e11d48", dark: "#fb7185" },
    TESTA_SINTESE: { light: "#7c3aed", dark: "#c084fc" },
  };
  const entry = REL_COLORS[type];
  return entry ? (dark ? entry.dark : entry.light) : dark ? "#94a3b8" : "#64748b";
}

function dominioColor(dominio: number): string {
  if (dominio >= 0.7) return "#22c55e";
  if (dominio >= 0.4) return "#eab308";
  if (dominio > 0) return "#ef4444";
  return "#71717a";
}

export default function GraphPage() {
  const router = useRouter();
  const params = useParams();
  const graphId = params.id as string;

  const svgRef = useRef<SVGSVGElement>(null);
  const { theme, resolvedTheme } = useTheme();
  const [rawNodes, setRawNodes] = useState<GraphNodeType[]>([]);
  const [rawEdges, setRawEdges] = useState<GraphEdgeType[]>([]);
  const [loading, setLoading] = useState(true);
  const [zoom, setZoom] = useState(0.6);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [draggingNode, setDraggingNode] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [selectedNode, setSelectedNode] = useState<SimNode | null>(null);
  const [filterGroup, setFilterGroup] = useState<string | null>(null);
  const [layout, setLayout] = useState<SimNode[]>([]);
  const [isDeletingNode, setIsDeletingNode] = useState(false);
  const [showEdgeLabels, setShowEdgeLabels] = useState(false);
  const [showLegend, setShowLegend] = useState(false);
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const [showCreateNodeModal, setShowCreateNodeModal] = useState(false);
  const [showEdgeManagerModal, setShowEdgeManagerModal] = useState(false);
  const [parentOptions, setParentOptions] = useState<{ assuntos: { id: string; nome: string }[]; topicos: { id: string; nome: string }[]; conceitos: { id: string; nome: string }[] }>({
    assuntos: [],
    topicos: [],
    conceitos: [],
  });

  // Search
  const [searchQuery, setSearchQuery] = useState("");
  const [grafoNome, setGrafoNome] = useState<string>("Mapa de Conhecimento");

  // Graph name editing
  const [isEditingGraphName, setIsEditingGraphName] = useState(false);
  const [editingGraphName, setEditingGraphName] = useState(grafoNome);
  const [loadingParentOptions, setLoadingParentOptions] = useState(false);
  const [graphEdges, setGraphEdges] = useState<Array<{
    id: string;
    source: string;
    target: string;
    tipoRelacao: string;
    peso: number;
    sourceLabel: string;
    targetLabel: string;
  }>>([]);

  // Panel visibility states
  const [leftPanelCollapsed, setLeftPanelCollapsed] = useState(false);
  const [rightPanelCollapsed, setRightPanelCollapsed] = useState(false);
  const [activeLeftTab, setActiveLeftTab] = useState<"tools" | "search" | "layers">("tools");

  const isDark = resolvedTheme === "dark" || (theme === "dark" && !resolvedTheme);

  const handleClearGraph = async () => {
    if (!confirm(`Apagar este grafo? Esta acao nao pode ser desfeita.`)) return;
    try {
      await deleteGrafo(graphId);
      toast.success("Grafo removido");
      router.push("/graph");
    } catch (e) {
      console.error(e);
      toast.error("Erro ao remover o grafo");
    }
  };

  const handleSaveGraphName = async () => {
    if (!editingGraphName.trim() || editingGraphName === grafoNome) {
      setIsEditingGraphName(false);
      setEditingGraphName(grafoNome);
      return;
    }
    try {
      await updateGrafoNome(graphId, editingGraphName.trim());
      setEditingGraphName(editingGraphName.trim());
      setGrafoNome(editingGraphName.trim());
      setIsEditingGraphName(false);
      toast.success("Nome do grafo atualizado");
    } catch (e) {
      console.error(e);
      toast.error("Erro ao atualizar nome do grafo");
      setEditingGraphName(grafoNome);
      setIsEditingGraphName(false);
    }
  };

  const handleRemoveNodeFromGraph = async () => {
    if (!selectedNode) return;
    try {
      setIsDeletingNode(true);
      await removeNodeFromGraph(selectedNode.id, graphId);
      toast.success(`Node "${selectedNode.label}" removido do grafo`);
      const result = await getGraphNodes(graphId);
      setRawNodes(result.nodes);
      setRawEdges(result.edges);
      setLayout([]);
      setSelectedNode(null);
    } catch (e) {
      console.error(e);
      toast.error(e instanceof Error ? e.message : "Erro ao remover node do grafo");
    } finally {
      setIsDeletingNode(false);
    }
  };

  const handleDeleteNode = async () => {
    if (!selectedNode) return;
    try {
      setIsDeletingNode(true);
      const result = await deleteGraphNode(selectedNode.id, graphId);
      toast.success(`Node "${selectedNode.label}" excluído permanentemente`);
      const result2 = await getGraphNodes(graphId);
      setRawNodes(result2.nodes);
      setRawEdges(result2.edges);
      setLayout([]);
      setSelectedNode(null);
    } catch (e) {
      console.error(e);
      toast.error(e instanceof Error ? e.message : "Erro ao excluir node");
    } finally {
      setIsDeletingNode(false);
    }
  };

  // Load graph data
  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const result = await getGraphNodes(graphId);
        // Apply saved visual state
        const saved = await loadGraphVisualState(graphId);
        if (saved) {
          setZoom(saved.zoom);
          setPan(saved.pan);
        }
        setRawNodes(result.nodes);
        setRawEdges(result.edges);

        // Load edges
        const edgesResult = await fetch(`/api/graph/edge?grafoId=${graphId}`).then(r => r.json());
        if (edgesResult.edges) {
          setGraphEdges(edgesResult.edges);
        }
      } catch (e) {
        toast.error("Erro ao carregar grafo");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [graphId]);

  // Load graph name
  useEffect(() => {
    async function loadGrafoName() {
      try {
        const info = await getGrafoInfo(graphId);
        if (info) {
          setGrafoNome(info.nome);
          if (!isEditingGraphName) {
            setEditingGraphName(info.nome);
          }
        }
      } catch (e) {
        console.error("Erro ao carregar nome do grafo:", e);
      }
    }
    loadGrafoName();
  }, [graphId]);

  // Sync editingGraphName when grafoNome changes from external source
  useEffect(() => {
    if (!isEditingGraphName) {
      setEditingGraphName(grafoNome);
    }
  }, [grafoNome, isEditingGraphName]);

  // Load parent options for dropdowns
  useEffect(() => {
    async function loadParentOptions() {
      setLoadingParentOptions(true);
      try {
        const options = await getParentOptions();
        setParentOptions(options);
      } catch (e) {
        console.error("Erro ao carregar opções de pai:", e);
      } finally {
        setLoadingParentOptions(false);
      }
    }
    if (showCreateNodeModal) {
      loadParentOptions();
    }
  }, [showCreateNodeModal]);

  // Search results based on searchQuery
  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase();
    return layout
      .filter((n) => n.label.toLowerCase().includes(q))
      .map((n) => ({
        id: n.id,
        label: n.label,
        type: n.tipoReal,
      }))
      .slice(0, 8);
  }, [searchQuery, layout]);

  const handleNodeCreated = () => {
    // Reload graph data
    getGraphNodes(graphId).then((result) => {
      setRawNodes(result.nodes);
      setRawEdges(result.edges);
      setLayout([]); // Reset layout to force recalculation with new nodes
      setSelectedNode(null);
      // Also reload edges
      return fetch(`/api/graph/edge?grafoId=${graphId}`).then(r => r.json());
    }).then((data) => {
      if (data.edges) setGraphEdges(data.edges);
    }).catch(console.error);
  };

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.05 : 0.05;
    setZoom((z) => Math.max(0.2, Math.min(3, z + delta)));
  }, []);

  const startDragNode = useCallback((nodeId: string, clientX: number, clientY: number) => {
    const nodePos = layout.find((n) => n.id === nodeId);
    if (!nodePos) return;
    const svgX = (clientX - pan.x - 400) / zoom;
    const svgY = (clientY - pan.y - 200) / zoom;
    setDraggingNode(nodeId);
    setDragOffset({ x: svgX - nodePos.x, y: svgY - nodePos.y });
  }, [layout, pan, zoom]);

  const startPan = useCallback((clientX: number, clientY: number) => {
    setDraggingNode("__pan__");
    setDragOffset({ x: clientX - pan.x, y: clientY - pan.y });
  }, [pan]);

  // Native mouse handlers on window for reliable drag
  useEffect(() => {
    if (!draggingNode) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (draggingNode === "__pan__") {
        setPan({ x: e.clientX - dragOffset.x, y: e.clientY - dragOffset.y });
      } else {
        const svgX = (e.clientX - pan.x - 400) / zoom;
        const svgY = (e.clientY - pan.y - 200) / zoom;
        setLayout((prev) => prev.map((n) => n.id === draggingNode ? { ...n, x: svgX - dragOffset.x, y: svgY - dragOffset.y } : n));
      }
    };

    const handleMouseUp = () => setDraggingNode(null);

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [draggingNode, dragOffset, pan, zoom]);

  const focusNode = useCallback((node: SimNode) => {
    setPan({ x: -node.x * zoom + 400, y: -node.y * zoom + 200 });
    setZoom((z) => Math.max(z, 0.8));
    setSelectedNode(node);
    setSearchQuery("");
  }, [zoom]);

  // Save positions after drag ends
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!draggingNode) {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = setTimeout(async () => {
        const positions: Record<string, { x: number; y: number }> = {};
        layout.forEach((n) => { positions[n.id] = { x: n.x, y: n.y }; });
        await saveGraphVisualState(graphId, { zoom, pan });
      }, 500);
    }
  }, [draggingNode]);

  const { nodes, edges } = useMemo(() => {
    if (rawNodes.length === 0) return { nodes: [] as SimNode[], edges: [] as SimEdge[] };
    return createSimulation(rawNodes, rawEdges, 3000, 2000);
  }, [rawNodes, rawEdges]);

  useEffect(() => {
    if (layout.length === 0 && nodes.length > 0) setLayout([...nodes]);
  }, [nodes, layout.length]);

  // Node counts by type for stats
  const nodeStats = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const n of rawNodes) counts[n.type] = (counts[n.type] || 0) + 1;
    return counts;
  }, [rawNodes]);

  // Filtered nodes based on filterGroup
  const filteredNodes = useMemo(() => {
    let result = filterGroup ? layout.filter((n) => n.group === filterGroup) : layout;
    if (hoveredNodeId || selectedNode) {
      // We handle dimming in render
      return result;
    }
    return result;
  }, [layout, filterGroup, hoveredNodeId, selectedNode]);

  const visibleNodeIds = new Set(filteredNodes.map((n) => n.id));
  const filteredEdges = useMemo(() => {
    return edges.map((e) => {
      const src = layout.find((n) => n.id === e.source);
      const tgt = layout.find((n) => n.id === e.target);
      return { ...e, sourceX: src?.x ?? e.sourceX, sourceY: src?.y ?? e.sourceY, targetX: tgt?.x ?? e.targetX, targetY: tgt?.y ?? e.targetY };
    }).filter((e) => visibleNodeIds.has(e.source) && visibleNodeIds.has(e.target));
  }, [edges, layout, visibleNodeIds]);

  // Highlight neighbors when hovering
  const connectedNodeIds = useMemo(() => {
    const activeId = hoveredNodeId ?? selectedNode?.id;
    if (!activeId) return new Set<string>();
    const ids = new Set<string>([activeId]);
    for (const e of edges) {
      if (e.source === activeId) ids.add(e.target);
      if (e.target === activeId) ids.add(e.source);
    }
    return ids;
  }, [hoveredNodeId, selectedNode, edges]);

  const connectedEdges = useMemo(() => {
    if (!selectedNode) return [];
    return filteredEdges.filter((e) => e.source === selectedNode.id || e.target === selectedNode.id);
  }, [selectedNode, filteredEdges]);

  // Group edges by relation type
  const groupedEdges = useMemo(() => {
    const map = new Map<string, { type: string; label: string; items: { edge: SimEdge; other: SimNode; dir: "out" | "in" }[] }>();
    for (const edge of connectedEdges) {
      const otherId = edge.source === selectedNode!.id ? edge.target : edge.source;
      const other = layout.find((n) => n.id === otherId);
      if (!other) continue;
      const dir: "out" | "in" = edge.source === selectedNode!.id ? "out" : "in";
      const key = `${edge.type}-${dir}`;
      let group = map.get(key);
      if (!group) { group = { type: edge.type, label: edge.label, items: [] }; map.set(key, group); }
      group.items.push({ edge, other, dir });
    }
    return [...map.entries()];
  }, [connectedEdges, selectedNode, layout]);

  const [nodeExpansionMap, setNodeExpansionMap] = useState<Record<string, Set<string>>>({});

  const toggleGroup = useCallback((gKey: string) => {
    const nodeId = selectedNode?.id;
    if (!nodeId) return;
    setNodeExpansionMap((prev) => {
      const current = prev[nodeId] ?? null;
      const updated = new Set(current);
      if (updated.has(gKey)) updated.delete(gKey);
      else updated.add(gKey);
      return { ...prev, [nodeId]: updated };
    });
  }, [selectedNode]);

  const isGroupExpanded = useCallback((gKey: string) => {
    const nodeId = selectedNode?.id;
    if (!nodeId) return false;
    const nodeSet = nodeExpansionMap[nodeId];
    return nodeSet === undefined ? true : nodeSet.has(gKey);
  }, [selectedNode, nodeExpansionMap]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-zinc-950">
        <Loader2Icon className="size-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-zinc-50 dark:bg-zinc-950">
      {/* Top Menu Bar - With Legend Area */}
      <header className="bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 flex flex-col flex-shrink-0">
        {/* Main Header Row */}
        <div className="h-10 flex items-center px-2 gap-2">
          <Button variant="ghost" size="sm" onClick={() => router.push("/graph")} className="h-7 px-2">
            <ArrowLeftIcon className="size-4 mr-1" />
            <span className="text-sm">Voltar</span>
          </Button>

          <div className="h-6 w-px bg-zinc-200 dark:bg-zinc-700" />

          {/* Center: Graph Title */}
          <div className="flex-1 flex justify-center">
            {isEditingGraphName ? (
              <input
                type="text"
                value={editingGraphName}
                onChange={(e) => setEditingGraphName(e.target.value)}
                onBlur={handleSaveGraphName}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSaveGraphName();
                  if (e.key === "Escape") {
                    setIsEditingGraphName(false);
                    setEditingGraphName(grafoNome);
                  }
                }}
                autoFocus
                className="px-2 py-0.5 text-sm font-semibold text-center bg-transparent border-b-2 border-primary outline-none min-w-[150px] max-w-[300px]"
              />
            ) : (
              <h1
                className="font-semibold text-sm truncate max-w-[300px] text-center cursor-pointer hover:text-primary transition-colors"
                onClick={() => setIsEditingGraphName(true)}
                title="Clique para editar o nome"
              >
                {grafoNome}
              </h1>
            )}
          </div>

          {/* Right: Node Stats & Controls */}
          <div className="flex items-center gap-2">
            {/* Node Stats Legend */}
            {rawNodes.length > 0 && (
              <>
                <div className="h-4 w-px bg-zinc-200 dark:bg-zinc-700" />
                <div className="flex items-center gap-3 text-[11px] text-zinc-600 dark:text-zinc-400">
                  {Object.entries(nodeStats).map(([type, count]) => (
                    <span key={type} className="flex items-center gap-1.5">
                      <div className="size-2 rounded-full" style={{ backgroundColor: getNodeColors(type, isDark).border }} />
                      <span>{NODE_TYPE_DISPLAY[type]?.label ?? type.toLowerCase()}</span>
                      <span className="font-mono">{count}</span>
                    </span>
                  ))}
                </div>
              </>
            )}

            {/* Zoom Controls */}
            <div className="flex items-center gap-1 bg-zinc-100 dark:bg-zinc-800 rounded-md p-0.5">
              <Button variant="ghost" size="icon-sm" className="h-6 w-6" onClick={() => setZoom((z) => Math.max(0.2, z - 0.1))}>
                <ZoomOutIcon className="size-3" />
              </Button>
              <span className="text-xs font-mono w-10 text-center">{Math.round(zoom * 100)}%</span>
              <Button variant="ghost" size="icon-sm" className="h-6 w-6" onClick={() => setZoom((z) => Math.min(3, z + 0.1))}>
                <ZoomInIcon className="size-3" />
              </Button>
              <Button variant="ghost" size="icon-sm" className="h-6 w-6" onClick={() => { setZoom(0.6); setPan({ x: 0, y: 0 }); }} title="Resetar visualização">
                <Maximize2Icon className="size-3" />
              </Button>
            </div>

            <div className="h-4 w-px bg-zinc-200 dark:bg-zinc-700" />

            {/* Toggle Edge Labels */}
            <Button
              variant={showEdgeLabels ? "secondary" : "ghost"}
              size="icon-sm"
              className="h-7 w-7"
              onClick={() => setShowEdgeLabels(v => !v)}
              title={showEdgeLabels ? "Ocultar rótulos" : "Mostrar rótulos"}
            >
              {showEdgeLabels ? <EyeIcon className="size-3.5" /> : <EyeOffIcon className="size-3.5" />}
            </Button>

            {/* Toggle Legend */}
            <Button
              variant={showLegend ? "secondary" : "ghost"}
              size="icon-sm"
              className="h-7 w-7"
              onClick={() => setShowLegend(v => !v)}
              title="Mostrar legenda"
            >
              <InfoIcon className="size-3.5" />
            </Button>

            {/* <Button variant="default" size="sm" className="h-7 px-2 gap-1" onClick={() => setShowCreateNodeModal(true)}>
              <PlusIcon className="size-3" />
              <span className="text-xs">Nó</span>
            </Button> */}
          </div>
        </div>

      </header>

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar */}
        <LeftSidebar
          onOpenCreateNode={() => setShowCreateNodeModal(true)}
          onOpenEdgeManager={() => setShowEdgeManagerModal(true)}
          onDeleteGraph={handleClearGraph}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          searchResults={searchResults}
          onFocusNode={(node) => {
            const simNode = layout.find((n) => n.id === node.id);
            if (simNode) focusNode(simNode);
          }}
          nodeStats={nodeStats}
          filterGroup={filterGroup}
          onToggleFilter={setFilterGroup}
          getNodeColor={(type) => {
            const colors: Record<string, string> = {
              ASSUNTO: "#475569",
              TOPICO: "#2563eb",
              CONCEITO: "#059669",
              FLASHCARD: "#d97706",
              NOTA: "#7c3aed",
            };
            return colors[type] || "#64748b";
          }}
          getTypeLabel={(type) => NODE_TYPE_DISPLAY[type]?.label || type}
          collapsed={leftPanelCollapsed}
          onToggleCollapse={() => setLeftPanelCollapsed(!leftPanelCollapsed)}
        />

        {/* Graph Canvas */}
        <div className="flex-1 relative overflow-hidden">
          <svg
            ref={svgRef}
            className="absolute inset-0 w-full h-full"
            onWheel={handleWheel}
            onMouseDown={(e) => {
              if (e.target === e.currentTarget || (e.target as SVGElement).tagName === "rect") {
                startPan(e.clientX, e.clientY);
                setSelectedNode(null);
              }
            }}
          >
            <g transform={`translate(${pan.x + 400}, ${pan.y + 200}) scale(${zoom})`}>
              {/* Grid background */}
              <defs>
                <pattern id="smallGrid" width="20" height="20" patternUnits="userSpaceOnUse">
                  <path d="M 20 0 L 0 0 0 20" fill="none" stroke={isDark ? "#18181b" : "#f4f4f5"} strokeWidth="0.5" />
                </pattern>
                <pattern id="grid" width="100" height="100" patternUnits="userSpaceOnUse">
                  <rect width="100" height="100" fill="url(#smallGrid)" />
                  <path d="M 100 0 L 0 0 0 100" fill="none" stroke={isDark ? "#1f1f26" : "#ececec"} strokeWidth="1" />
                </pattern>
              </defs>
              <rect x={-3000} y={-2000} width={6000} height={4000} fill="url(#grid)" />

              {/* Edges */}
              {filteredEdges.map((edge, i) => {
                const midX = (edge.sourceX + edge.targetX) / 2;
                const midY = (edge.sourceY + edge.targetY) / 2;
                const relColor = getRelColor(edge.type, isDark);

                const dx = edge.targetX - edge.sourceX;
                const dy = edge.targetY - edge.sourceY;
                const len = Math.sqrt(dx * dx + dy * dy) || 1;
                const nx = dx / len;
                const ny = dy / len;
                const arrowX = edge.targetX - nx * 15;
                const arrowY = edge.targetY - ny * 15;

                return (
                  <g key={`${edge.source}-${edge.target}-${i}`}>
                    <line
                      x1={edge.sourceX}
                      y1={edge.sourceY}
                      x2={arrowX}
                      y2={arrowY}
                      stroke={relColor}
                      strokeWidth={edge.peso > 0.7 ? 1.5 : 1}
                      strokeOpacity={isDark ? 0.5 : 0.4}
                    />
                    <polygon
                      points={`${arrowX},${arrowY} ${arrowX - nx * 8 - ny * 4},${arrowY - ny * 8 + nx * 4} ${arrowX - nx * 8 + ny * 3},${arrowY - ny * 8 - nx * 3}`}
                      fill={relColor}
                      fillOpacity={isDark ? 0.5 : 0.4}
                    />
                    {showEdgeLabels && (
                      <foreignObject x={midX - 35} y={midY - 8} width={70} height={16}>
                        <div
                          className="flex items-center justify-center text-[9px] leading-tight font-mono truncate px-1 py-0.5 rounded bg-white/80 dark:bg-zinc-900/80"
                          style={{ color: relColor, border: `1px solid ${relColor}40` }}
                        >
                          {RELATION_LABELS[edge.type] || edge.type}
                        </div>
                      </foreignObject>
                    )}
                  </g>
                );
              })}

              {/* Nodes */}
              {filteredNodes.map((node) => {
                const colors = getNodeColors(node.group, isDark);
                const isSelected = selectedNode?.id === node.id;
                const isHovered = hoveredNodeId === node.id;
                const isConnected = connectedNodeIds.size > 0 && connectedNodeIds.has(node.id);
                const dimmed = connectedNodeIds.size > 0 && !isConnected;

                return (
                  <g
                    key={node.id}
                    transform={`translate(${node.x}, ${node.y})`}
                    onMouseDown={(e) => {
                      e.stopPropagation();
                      startDragNode(node.id, e.clientX, e.clientY);
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedNode(node);
                    }}
                    onMouseEnter={() => setHoveredNodeId(node.id)}
                    onMouseLeave={() => setHoveredNodeId(null)}
                    className="cursor-grab active:cursor-grabbing"
                    style={{ transition: "opacity 150ms", opacity: dimmed ? 0.15 : 1 }}
                  >
                    {node.dominio < 0.4 && node.tipoReal !== "FLASHCARD" && !dimmed && (
                      <rect
                        x={-node.width / 2 - 3}
                        y={-node.height / 2 - 3}
                        width={node.width + 6}
                        height={node.height + 6}
                        rx={8}
                        fill="none"
                        stroke="#ef4444"
                        strokeWidth={1}
                        strokeOpacity={0.4}
                      />
                    )}

                    {isHovered && !isSelected && (
                      <rect
                        x={-node.width / 2 - 2}
                        y={-node.height / 2 - 2}
                        width={node.width + 4}
                        height={node.height + 4}
                        rx={7}
                        fill="none"
                        stroke={colors.border}
                        strokeWidth={2}
                        strokeOpacity={0.6}
                      />
                    )}

                    <rect
                      x={-node.width / 2}
                      y={-node.height / 2}
                      width={node.width}
                      height={node.height}
                      rx={6}
                      fill={colors.bg}
                      stroke={isSelected ? (isDark ? "#f1f5f9" : "#0f172a") : colors.border}
                      strokeWidth={isSelected ? 2.5 : 1.5}
                    />

                    <text
                      textAnchor="middle"
                      dominantBaseline="central"
                      fill={colors.text}
                      fontSize={node.tipoReal === "ASSUNTO" ? 13 : 11}
                      fontWeight={node.tipoReal === "ASSUNTO" ? 600 : 400}
                    >
                      {node.label.length > 20 ? `${node.label.slice(0, 20)}…` : node.label}
                    </text>

                    <circle cx={node.width / 2 - 8} cy={-node.height / 2} r={4} fill={dominioColor(node.dominio)} />
                  </g>
                );
              })}
            </g>
          </svg>

          {/* Legend Overlay - Positioned at bottom inside graph canvas */}
          {showLegend && (
            <div className="absolute bottom-0 left-0 right-0 bg-white/95 dark:bg-zinc-900/95 border-t border-zinc-200 dark:border-zinc-800 shadow-lg overflow-x-auto">
              <div className="py-2 px-3 text-xs">
                <div className="flex gap-6 flex-wrap">
                  {RELATION_GROUPS.map((group) => (
                    <div key={group.title} className="flex flex-col gap-1 min-w-[180px]">
                      <span className="font-semibold text-zinc-700 dark:text-zinc-300 text-[10px] uppercase tracking-wide">
                        {group.title}
                      </span>
                      <div className="flex flex-wrap gap-1">
                        {group.types.map((type) => {
                          const color = getRelColor(type, isDark);
                          return (
                            <span
                              key={type}
                              className="px-1.5 py-0.5 bg-zinc-100 dark:bg-zinc-800 rounded text-[10px] font-mono flex items-center gap-1.5 whitespace-nowrap"
                              title={RELATION_LABELS[type] || type}
                            >
                              <span className="size-2 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
                              {RELATION_LABELS[type] || type}
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right Properties Panel */}
        <PropertiesPanel
          selectedNode={selectedNode}
          connectedEdges={connectedEdges}
          isDark={isDark}
          getNodeColors={getNodeColors}
          getRelColor={getRelColor}
          RELATION_LABELS={RELATION_LABELS}
          onRemoveFromGraph={handleRemoveNodeFromGraph}
          onDeleteNode={handleDeleteNode}
          isDeleting={isDeletingNode}
          onFocusNode={focusNode}
          collapsed={rightPanelCollapsed}
          onToggleCollapse={() => setRightPanelCollapsed(!rightPanelCollapsed)}
        />
      </div>

      {/* Bottom Status Bar */}
      <footer className="h-5 bg-white dark:bg-zinc-900 border-t border-zinc-200 dark:border-zinc-800 flex items-center px-2 gap-3 text-[10px] text-zinc-500 flex-shrink-0">
        <span className="font-mono">{Math.round(zoom * 100)}%</span>
        <span className="text-zinc-400">|</span>
        <span>Nós: {rawNodes.length}</span>
        <span className="text-zinc-400">|</span>
        <span>Edges: {filteredEdges.length}</span>
        <div className="flex-1" />
        {selectedNode && (
          <span className="truncate max-w-[200px]">{selectedNode.label}</span>
        )}
      </footer>

      {/* Create Node Modal */}
      <CreateNodeModal
        open={showCreateNodeModal}
        onOpenChange={setShowCreateNodeModal}
        grafoId={graphId}
        parentIds={parentOptions}
        onSuccess={handleNodeCreated}
      />

      {/* Edge Manager Modal */}
      <EdgeManagerModal
        open={showEdgeManagerModal}
        onOpenChange={setShowEdgeManagerModal}
        grafoId={graphId}
        existingEdges={graphEdges}
        onSuccess={() => {
          // Reload edges after changes
          fetch(`/api/graph/edge?grafoId=${graphId}`)
            .then(r => r.json())
            .then(data => {
              if (data.edges) setGraphEdges(data.edges);
            });
        }}
      />
    </div>
  );
}
