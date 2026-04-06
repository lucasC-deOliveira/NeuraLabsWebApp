"use client";

import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { getGraphNodes, clearAllGraphNodes, deleteGraphNode, type GraphNodeType, type GraphEdgeType } from "@/actions/graph";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeftIcon, Loader2Icon, ZoomInIcon, ZoomOutIcon, Maximize2Icon, BookOpenIcon, Trash2Icon } from "lucide-react";
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
  const minGap = 80; // minimum gap between node boundaries (conservative: half-diagonal)

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

    // Collision detection — enforce strict minimum gap between node bounding boxes
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const a = nodes[i];
        const b = nodes[j];
        // Half-widths / half-heights
        const aHw = a.width / 2;
        const aHh = a.height / 2;
        const bHw = b.width / 2;
        const bHh = b.height / 2;
        let dx = b.x - a.x;
        let dy = b.y - a.y;
        // Minimum distance: sum of radii (half-diagonal for conservative coverage) + gap
        const rA = Math.sqrt(aHw * aHw + aHh * aHh);
        const rB = Math.sqrt(bHw * bHw + bHh * bHh);
        const minDist = rA + rB + minGap;
        const distSq = dx * dx + dy * dy;
        if (distSq < minDist * minDist) {
          const dist = Math.sqrt(distSq) || 0.01;
          // Push them apart aggressively — full hard separation, no velocity needed
          const overlap = minDist - dist;
          const sepX = (dx / dist) * (overlap + 2); // +2 safety margin
          const sepY = (dy / dist) * (overlap + 2);
          a.x -= sepX;
          a.y -= sepY;
          b.x += sepX;
          b.y += sepY;
          a.vx = a.vx * 0.3; // drain velocity to prevent jitter
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

// --- Node type colors — dark & light variants ---
// Each type has a distinct hue that stands out on both themes.
const NODE_TYPE_COLORS: Record<string, {
  light: { bg: string; border: string; text: string };
  dark: { bg: string; border: string; text: string };
}> = {
  ASSUNTO: {
    light: { bg: "#f1f5f9", border: "#475569", text: "#1e293b" },
    dark:  { bg: "#1e293b", border: "#94a3b8", text: "#e2e8f0" },
  },
  TOPICO: {
    light: { bg: "#dbeafe", border: "#2563eb", text: "#1e3a5f" },
    dark:  { bg: "#1e3a5f", border: "#60a5fa", text: "#bfdbfe" },
  },
  CONCEITO: {
    light: { bg: "#d1fae5", border: "#059669", text: "#064e3b" },
    dark:  { bg: "#064e3b", border: "#34d399", text: "#a7f3d0" },
  },
  FLASHCARD: {
    light: { bg: "#fef3c7", border: "#d97706", text: "#78350f" },
    dark:  { bg: "#451a03", border: "#fbbf24", text: "#fef3c7" },
  },
  NOTA: {
    light: { bg: "#ede9fe", border: "#7c3aed", text: "#4c1d95" },
    dark:  { bg: "#2e1065", border: "#a78bfa", text: "#ede9fe" },
  },
};

function dominioColor(dominio: number): string {
  if (dominio >= 0.7) return "#22c55e";
  if (dominio >= 0.4) return "#eab308";
  if (dominio > 0) return "#ef4444";
  return "#71717a";
}

// --- Relation colors — one distinct color per type, both themes ---
// Light theme uses deeper shades, dark theme uses brighter ones for visibility.
const REL_COLORS: Record<string, { light: string; dark: string }> = {
  GERA:           { light: "#dc2626", dark: "#f87171" },
  REFERENCIA:     { light: "#ca8a04", dark: "#facc15" },
  DEFINE:         { light: "#0891b2", dark: "#22d3ee" },
  EXPLICA:        { light: "#059669", dark: "#34d399" },
  APROFUNDA:      { light: "#0d9488", dark: "#2dd4bf" },
  EXEMPLIFICA:    { light: "#ea580c", dark: "#fb923c" },
  CONTRASTA:      { light: "#e11d48", dark: "#fb7185" },
  SINTETIZA:      { light: "#7c3aed", dark: "#a78bfa" },
  ALERTA_ERRO:    { light: "#dc2626", dark: "#ef4444" },
  IS_A:           { light: "#2563eb", dark: "#60a5fa" },
  PART_OF:        { light: "#0891b2", dark: "#22d3ee" },
  PREREQUISITO:   { light: "#6d28d9", dark: "#a78bfa" },
  DERIVA_DE:      { light: "#0d9488", dark: "#2dd4bf" },
  EVOLUI_PARA:    { light: "#0284c7", dark: "#38bdf8" },
  REFORCA:        { light: "#059669", dark: "#34d399" },
  ALTERNATIVA_A:  { light: "#ea580c", dark: "#fb923c" },
  CONTRASTA_COM:  { light: "#e11d48", dark: "#fb7185" },
  CONFUNDE_COM:   { light: "#c026d3", dark: "#e879f9" },
  ANTI_PADRAO_DE: { light: "#dc2626", dark: "#f87171" },
  MEDIDO_POR:     { light: "#0891b2", dark: "#22d3ee" },
  OBJETIVO_DE:    { light: "#7c3aed", dark: "#a78bfa" },
  PERTENCE_A:     { light: "#64748b", dark: "#94a3b8" },
  FUNDAMENTA:     { light: "#4f46e5", dark: "#818cf8" },
  APLICADO_EM:    { light: "#0d9488", dark: "#2dd4bf" },
  SUBTOPICO_DE:   { light: "#64748b", dark: "#94a3b8" },
  RELACIONADO:    { light: "#475569", dark: "#94a3b8" },
  DEPENDE_DE:     { light: "#7c3aed", dark: "#a78bfa" },
  HERDA:          { light: "#4f46e5", dark: "#818cf8" },
  TESTA_DEFINICAO:{ light: "#d97706", dark: "#fbbf24" },
  TESTA_EXEMPLO:  { light: "#ca8a04", dark: "#facc15" },
  TESTA_APLICACAO:{ light: "#ea580c", dark: "#fb923c" },
  TESTA_ANALISE:  { light: "#e11d48", dark: "#fb7185" },
  TESTA_SINTESE:  { light: "#7c3aed", dark: "#c084fc" },
};

function getRelColor(type: string, dark: boolean): string {
  const entry = REL_COLORS[type];
  return entry ? (dark ? entry.dark : entry.light) : dark ? "#94a3b8" : "#64748b";
}

function getNodeColors(type: string, dark: boolean) {
  const entry = NODE_TYPE_COLORS[type];
  if (!entry) return dark ? NODE_TYPE_COLORS.CONCEITO.dark : NODE_TYPE_COLORS.CONCEITO.light;
  return dark ? entry.dark : entry.light;
}

// --- Legend groups ---
const NODE_TYPE_DISPLAY: Record<string, { label: string; icon: string }> = {
  ASSUNTO:   { label: "Assunto",   icon: "●" },
  TOPICO:    { label: "Tópico",    icon: "●" },
  CONCEITO:  { label: "Conceito",  icon: "●" },
  FLASHCARD: { label: "Flashcard", icon: "●" },
  NOTA:      { label: "Nota",      icon: "●" },
};

const RELATION_LEGEND: { code: string; display: string }[] = [
  { code: "PERTENCE_A",     display: "pertence a" },
  { code: "SUBTOPICO_DE",   display: "subtópico de" },
  { code: "HERDA",          display: "herda" },
  { code: "IS_A",           display: "é um" },
  { code: "PREREQUISITO",   display: "pré-requisito" },
  { code: "REFORCA",        display: "reforça" },
  { code: "GERA",           display: "gera" },
  { code: "DEFINE",         display: "define" },
  { code: "EXPLICA",        display: "explica" },
  { code: "EXEMPLIFICA",    display: "exemplifica" },
  { code: "ALTERNATIVA_A",  display: "alternativa" },
  { code: "CONTRASTA_COM",  display: "contrasta com" },
  { code: "TESTA_DEFINICAO", display: "testa definição" },
  { code: "TESTA_EXEMPLO",  display: "testa exemplo" },
  { code: "TESTA_ANALISE",  display: "testa análise" },
  { code: "RELACIONADO",    display: "relacionado" },
  { code: "DEPENDE_DE",     display: "depende de" },
  { code: "EVOLUI_PARA",    display: "evolui para" },
  { code: "DERIVA_DE",      display: "deriva de" },
  { code: "APROFUNDA",      display: "aprofunda" },
  { code: "SINTETIZA",      display: "sintetiza" },
  { code: "CONFUNDE_COM",   display: "confunde com" },
  { code: "ALERTA_ERRO",    display: "alerta erro" },
  { code: "APLICADO_EM",    display: "aplicado em" },
  { code: "FUNDAMENTA",     display: "fundamenta" },
  { code: "MEDIDO_POR",     display: "medido por" },
  { code: "OBJETIVO_DE",    display: "objetivo de" },
  { code: "ANTI_PADRAO_DE", display: "anti-padrão" },
];

export default function GraphPage() {
  const router = useRouter();
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
  const [isClearing, setIsClearing] = useState(false);

  const handleClearGraph = async () => {
    if (!confirm("Tem certeza que deseja apagar todos os nos e relacoes do grafo? Esta acao nao pode ser desfeita.")) return;
    setIsClearing(true);
    try {
      const { count } = await clearAllGraphNodes();
      toast.success(`Grafo limpo — ${count} nos removidos`);
      setRawNodes([]);
      setRawEdges([]);
      setLayout([]);
      setSelectedNode(null);
    } catch (e) {
      console.error(e);
      toast.error("Erro ao limpar o grafo");
    } finally {
      setIsClearing(false);
    }
  };

  const [isDeletingNode, setIsDeletingNode] = useState(false);

  const handleDeleteNode = async () => {
    if (!selectedNode) return;
    try {
      setIsDeletingNode(true);
      await deleteGraphNode(selectedNode.id);
      toast.success(`Node "${selectedNode.label}" removido`);
      // Reload the graph
      const result = await getGraphNodes();
      setRawNodes(result.nodes);
      setRawEdges(result.edges);
      setSelectedNode(null);
    } catch (e) {
      console.error(e);
      toast.error("Erro ao remover o node");
    } finally {
      setIsDeletingNode(false);
    }
  };

  useEffect(() => {
    async function load() {
      try {
        const result = await getGraphNodes();
        setRawNodes(result.nodes);
        setRawEdges(result.edges);
      } catch (e) {
        toast.error("Erro ao carregar grafo");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const { nodes, edges } = useMemo(() => {
    if (rawNodes.length === 0) return { nodes: [] as SimNode[], edges: [] as SimEdge[] };
    const W = 3000;
    const H = 2000;
    return createSimulation(rawNodes, rawEdges, W, H);
  }, [rawNodes, rawEdges]);

  // Initialize layout state from simulation result (only once)
  useEffect(() => {
    if (layout.length === 0 && nodes.length > 0) {
      setLayout([...nodes]);
    }
  }, [nodes, layout.length]);

  const filteredNodes = useMemo(
    () => (filterGroup ? layout.filter((n) => n.group === filterGroup) : layout),
    [layout, filterGroup],
  );

  const visibleNodeIds = new Set(filteredNodes.map((n) => n.id));
  const filteredEdges = useMemo(() => {
    return edges.map((e) => {
      const src = layout.find((n) => n.id === e.source);
      const tgt = layout.find((n) => n.id === e.target);
      return { ...e, sourceX: src?.x ?? e.sourceX, sourceY: src?.y ?? e.sourceY, targetX: tgt?.x ?? e.targetX, targetY: tgt?.y ?? e.targetY };
    }).filter((e) => visibleNodeIds.has(e.source) && visibleNodeIds.has(e.target));
  }, [edges, layout, visibleNodeIds]);

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
      if (!group) {
        group = { type: edge.type, label: edge.label, items: [] };
        map.set(key, group);
      }
      group.items.push({ edge, other, dir });
    }
    return [...map.entries()];
  }, [connectedEdges, selectedNode, layout]);

  // Track which node's expanded state we're viewing using a map
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
    if (nodeSet === undefined) return true; // default: expanded
    return nodeSet.has(gKey);
  }, [selectedNode, nodeExpansionMap]);

  const showEdgeLabels = zoom > 0.5;

  // Resolve dark mode: "system" → detect via resolvedTheme
  const isDark = resolvedTheme === "dark" || (theme === "dark" && !resolvedTheme);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.05 : 0.05;
    setZoom((z) => Math.max(0.2, Math.min(3, z + delta)));
  }, []);

  const handleSvgMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      setDraggingNode("__pan__");
      setDragOffset({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    }
  }, [pan]);

  const handleNodeMouseDown = useCallback((e: React.MouseEvent, nodeId: string) => {
    e.stopPropagation();
    setDraggingNode(nodeId);
    const svgX = (e.clientX - pan.x - 400) / zoom;
    const svgY = (e.clientY - pan.y - 200) / zoom;
    const nodePos = layout.find((n) => n.id === nodeId);
    if (nodePos) {
      setDragOffset({ x: svgX - nodePos.x, y: svgY - nodePos.y });
    }
  }, [layout, pan, zoom]);

  const handleSvgMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!draggingNode) return;
      if (draggingNode === "__pan__") {
        setPan({ x: e.clientX - dragOffset.x, y: e.clientY - dragOffset.y });
        return;
      }
      const svgX = (e.clientX - pan.x - 400) / zoom;
      const svgY = (e.clientY - pan.y - 200) / zoom;
      setLayout((prev) =>
        prev.map((n) =>
          n.id === draggingNode
            ? { ...n, x: svgX - dragOffset.x, y: svgY - dragOffset.y }
            : n,
        ),
      );
    },
    [draggingNode, dragOffset, pan, zoom],
  );

  const handleSvgMouseUp = useCallback(() => setDraggingNode(null), []);

  const groups = useMemo(() => {
    const set = new Set(rawNodes.map((n) => n.type));
    return [...set];
  }, [rawNodes]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-zinc-900">
        <Loader2Icon className="size-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-zinc-50 dark:bg-zinc-900">
      {/* Header */}
      <header className="border-b px-3 sm:px-5 py-3 sm:py-4 dark:border-zinc-800">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-2">
          <div className="flex items-center gap-2 sm:gap-3">
            <Button variant="ghost" size="sm" onClick={() => router.push("/")}>
              <ArrowLeftIcon className="mr-1 size-4" />
              <span className="hidden sm:inline">Voltar</span>
            </Button>
            <h1 className="text-base sm:text-lg font-semibold truncate">Mapa de Conhecimento</h1>
          </div>
          <div className="flex items-center gap-1.5 sm:gap-2">
            <Button variant="outline" size="icon-sm" onClick={() => setZoom((z) => Math.max(0.2, z - 0.1))}>
              <ZoomOutIcon className="size-3.5 sm:size-4" />
            </Button>
            <span className="text-[10px] sm:text-xs text-muted-foreground w-8 sm:w-12 text-center">{Math.round(zoom * 100)}%</span>
            <Button variant="outline" size="icon-sm" onClick={() => setZoom((z) => Math.min(3, z + 0.1))}>
              <ZoomInIcon className="size-3.5 sm:size-4" />
            </Button>
            <Button variant="outline" size="icon-sm" onClick={() => { setZoom(0.6); setPan({ x: 0, y: 0 }); }}>
              <Maximize2Icon className="size-3.5 sm:size-4" />
            </Button>
            <Button variant="outline" size="icon-sm" onClick={handleClearGraph} disabled={isClearing || rawNodes.length === 0}>
              <Trash2Icon className="size-3.5 sm:size-4 text-red-500" />
            </Button>
          </div>
        </div>
      </header>

      {/* Legend + Filters */}
      <div className="mx-auto w-full max-w-7xl px-3 sm:px-5 py-2 sm:py-3 flex flex-col gap-2 sm:gap-3">
        {/* Node type filter badges */}
        <div className="flex gap-2 sm:gap-3 flex-wrap items-center">
          {groups.map((g) => {
            const colors = getNodeColors(g, isDark);
            return (
              <Badge
                key={g}
                variant={filterGroup === g ? "default" : "outline"}
                className="cursor-pointer gap-1.5 sm:gap-2 capitalize text-xs"
                onClick={() => setFilterGroup(filterGroup === g ? null : g)}
                style={filterGroup === g
                  ? { backgroundColor: colors.border, borderColor: colors.border, color: colors.text }
                  : { borderColor: colors.border, color: colors.text }
                }
              >
                <span
                  className="inline-block size-2 sm:size-2.5 rounded-full"
                  style={{ backgroundColor: colors.border }}
                />
                <span className="hidden sm:inline">{NODE_TYPE_DISPLAY[g]?.label ?? g.toLowerCase()}</span>
                <span className="sm:hidden">{g.slice(0, 3)}</span>
              </Badge>
            );
          })}
        </div>

        {/* Node type legend */}
        <div className="flex gap-4 sm:gap-6 flex-wrap text-xs">
          <span className="font-medium text-foreground">Nós:</span>
          {Object.entries(NODE_TYPE_DISPLAY).map(([type, { label }]) => {
            const colors = getNodeColors(type, isDark);
            return (
              <div key={type} className="flex items-center gap-2">
                <span
                  className="inline-block w-5 h-3 rounded-sm"
                  style={{ backgroundColor: colors.bg, border: `1.5px solid ${colors.border}` }}
                />
                <span className="text-muted-foreground">{label}</span>
              </div>
            );
          })}
        </div>

        {/* Relation legend */}
        <div className="flex gap-4 sm:gap-6 flex-wrap text-xs text-muted-foreground">
          <span className="font-medium text-foreground">Relações:</span>
          {RELATION_LEGEND.map((t) => (
            <div key={t.code} className="flex items-center gap-2">
              <span
                className="inline-block w-5 h-0.5 rounded-sm"
                style={{ backgroundColor: getRelColor(t.code, isDark) }}
              />
              <span>{t.display}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Canvas */}
      <div className="flex-1 mx-auto w-full max-w-7xl px-3 sm:px-5 pb-3 sm:pb-5">
        <div
          className="relative w-full rounded-xl border overflow-hidden bg-white dark:bg-zinc-950 dark:border-zinc-800"
          style={{ height: "calc(100vh - 200px)", minHeight: 400 }}
        >
          <svg
            ref={svgRef}
            className="absolute inset-0 w-full h-full"
            onWheel={handleWheel}
            onMouseDown={handleSvgMouseDown}
            onMouseMove={handleSvgMouseMove}
            onMouseUp={handleSvgMouseUp}
            onMouseLeave={handleSvgMouseUp}
          >
            <g transform={`translate(${pan.x + 400}, ${pan.y + 200}) scale(${zoom})`}>
              {/* Edges */}
              {filteredEdges.map((edge, i) => {
                const midX = (edge.sourceX + edge.targetX) / 2;
                const midY = (edge.sourceY + edge.targetY) / 2;
                const relColor = getRelColor(edge.type, isDark);

                return (
                  <g key={`${edge.source}-${edge.target}-${i}`}>
                    <line
                      x1={edge.sourceX}
                      y1={edge.sourceY}
                      x2={edge.targetX}
                      y2={edge.targetY}
                      stroke={relColor}
                      strokeWidth={edge.peso > 0.7 ? 1.5 : 1}
                      strokeOpacity={isDark ? 0.6 : 0.5}
                    />
                    {showEdgeLabels && (
                      <foreignObject
                        x={midX - 35}
                        y={midY - 8}
                        width={70}
                        height={16}
                      >
                        <div
                          className="flex items-center justify-center text-[9px] leading-tight font-mono truncate px-1 py-0.5 rounded bg-white/80 dark:bg-zinc-900/80"
                          style={{ color: relColor, border: `1px solid ${relColor}40` }}
                        >
                          {edge.label}
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

                return (
                  <g
                    key={node.id}
                    transform={`translate(${node.x}, ${node.y})`}
                    onMouseDown={(e) => handleNodeMouseDown(e, node.id)}
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedNode(node);
                    }}
                    className="cursor-grab active:cursor-grabbing"
                  >
                    {/* Glow for low dominio */}
                    {node.dominio < 0.4 && node.tipoReal !== "FLASHCARD" && (
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

                    {/* Main rect */}
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

                    {/* Label */}
                    <text
                      textAnchor="middle"
                      dominantBaseline="central"
                      fill={colors.text}
                      fontSize={node.tipoReal === "ASSUNTO" ? 13 : 11}
                      fontWeight={node.tipoReal === "ASSUNTO" ? 600 : 400}
                    >
                      {node.label.length > 20 ? `${node.label.slice(0, 20)}…` : node.label}
                    </text>

                    {/* Dominio dot */}
                    <circle
                      cx={node.width / 2 - 8}
                      cy={-node.height / 2}
                      r={4}
                      fill={dominioColor(node.dominio)}
                    />
                  </g>
                );
              })}
            </g>
          </svg>
        </div>
      </div>

      {/* Selected Node Panel */}
      {selectedNode && (
        <div className="fixed bottom-3 sm:bottom-4 right-3 sm:right-4 w-[calc(100%-1.5rem)] sm:w-80 sm:max-w-sm max-h-[calc(100vh-1.5rem)] overflow-y-auto">
          <Card className="bg-zinc-50 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800">
            <CardContent className="pt-4">
              <div className="space-y-2">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground capitalize">
                          {selectedNode.tipoReal.toLowerCase()}
                        </p>
                        <h3 className="text-base font-semibold">{selectedNode.label}</h3>
                      </div>
                    </div>
                    {selectedNode.tipoReal === "FLASHCARD" && (
                      <Button
                        size="sm"
                        className="mt-2 w-full gap-1.5"
                        onClick={() => router.push(`/study?flashcard=${selectedNode.id}`)}
                      >
                        <BookOpenIcon className="size-3.5" />
                        Estudar
                      </Button>
                    )}
                  </div>
                  <button
                    onClick={() => setSelectedNode(null)}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    ✕
                  </button>
                </div>

                <Button
                  size="sm"
                  variant="destructive"
                  onClick={handleDeleteNode}
                  disabled={isDeletingNode}
                  className="w-full gap-1.5 text-xs"
                >
                  <Trash2Icon className="size-3.5" />
                  {isDeletingNode ? "Removendo..." : "Remover este no"}
                </Button>

                <div className="flex items-center gap-3">
                  <span className="text-xs text-muted-foreground">Domínio:</span>
                  <div className="flex-1 h-2 rounded-full bg-zinc-200 dark:bg-zinc-800">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${selectedNode.dominio * 100}%`,
                        backgroundColor: dominioColor(selectedNode.dominio),
                      }}
                    />
                  </div>
                  <span className="text-xs font-mono">
                    {Math.round(selectedNode.dominio * 100)}%
                  </span>
                </div>

                <div className="max-h-60 overflow-y-auto space-y-1">
                  {groupedEdges.map(([key, group]) => {
                    const expanded = isGroupExpanded(key);
                    const count = group.items.length;

                    return (
                      <div key={key} className="space-y-0.5">
                        <button
                          onClick={() => toggleGroup(key)}
                          className="flex items-center gap-2 text-xs w-full text-left py-0.5"
                          aria-expanded={expanded}
                        >
                          <span
                            className={`transition-transform text-muted-foreground ${expanded ? "rotate-90" : ""}`}
                          >
                            ▶
                          </span>
                          <span style={{ color: getRelColor(group.type, isDark) }} className="font-medium capitalize">
                            {group.label}{count > 1 ? ` (${count})` : ""}
                          </span>
                        </button>

                        {expanded && (
                          <div className="ml-5 space-y-0.5">
                            {group.items.map(({ other, dir }, idx) => (
                              <div key={`${key}-${idx}`} className="flex items-center gap-1.5 text-xs">
                                <span className="text-muted-foreground">{dir === "out" ? "→" : "←"}</span>
                                <span className="text-foreground truncate max-w-[160px]">
                                  {other.label}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {selectedNode.pergunta && (
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {selectedNode.pergunta}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
