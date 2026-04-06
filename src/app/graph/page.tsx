"use client";

import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import { getGraphNodes, type GraphNodeType, type GraphEdgeType } from "@/actions/graph";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeftIcon, Loader2Icon, ZoomInIcon, ZoomOutIcon, Maximize2Icon } from "lucide-react";
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
      x: width / 2 + (Math.random() - 0.5) * 200,
      y: height / 2 + (Math.random() - 0.5) * 200,
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
  const repulsion = 8000;
  const attraction = 0.005;
  const gravity = 0.01;
  const damping = 0.85;
  const idealEdgeLen = 150;

  for (let iter = 0; iter < 300; iter++) {
    const temperature = 1 - iter / 300;

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

// --- Color helpers ---
const GROUP_COLORS: Record<string, { bg: string; border: string; text: string }> = {
  ASSUNTO: { bg: "#1e293b", border: "#64748b", text: "#f1f5f9" },
  TOPICO: { bg: "#1e3a5f", border: "#3b82f6", text: "#bfdbfe" },
  CONCEITO: { bg: "#14332d", border: "#10b981", text: "#a7f3d0" },
  FLASHCARD: { bg: "#33260e", border: "#f59e0b", text: "#fef3c7" },
  NOTA: { bg: "#2e1065", border: "#8b5cf6", text: "#ede9fe" },
};

function dominioColor(dominio: number): string {
  if (dominio >= 0.7) return "#22c55e";
  if (dominio >= 0.4) return "#eab308";
  if (dominio > 0) return "#ef4444";
  return "#71717a";
}

// Relation color by semantic category
function relationColor(type: string): string {
  const hierarchy = ["PERTENCE_A", "SUBTOPICO_DE", "HERDA", "FUNDAMENTA", "APLICADO_EM"];
  const cognitive = ["TESTA_DEFINICAO", "TESTA_EXEMPLO", "TESTA_APLICACAO", "TESTA_ANALISE", "TESTA_SINTESE"];
  const concept = ["IS_A", "PART_OF", "PREREQUISITO", "DERIVA_DE", "EVOLUI_PARA", "REFORCA", "ALTERNATIVA_A", "CONTRASTA_COM", "CONFUNDE_COM"];

  if (hierarchy.includes(type)) return "#64748b";
  if (cognitive.includes(type)) return "#f59e0b";
  if (concept.includes(type)) return "#10b981";
  if (type === "RELACIONADO") return "#475569";
  return "#78716c";
}

// --- Edge type legend groups ---
const LEGEND_GROUPS: { label: string; types: { code: string; display: string }[] }[] = [
  {
    label: "Hierarquia",
    types: [
      { code: "PERTENCE_A", display: "pertence a" },
      { code: "SUBTOPICO_DE", display: "subtópico de" },
      { code: "HERDA", display: "herda" },
    ],
  },
  {
    label: "Conceito",
    types: [
      { code: "IS_A", display: "é um" },
      { code: "PREREQUISITO", display: "pré-requisito" },
      { code: "REFORCA", display: "reforça" },
      { code: "RELACIONADO", display: "relacionado" },
    ],
  },
  {
    label: "Cognitivo",
    types: [
      { code: "TESTA_DEFINICAO", display: "testa definição" },
      { code: "TESTA_EXEMPLO", display: "testa exemplo" },
      { code: "TESTA_ANALISE", display: "testa análise" },
    ],
  },
];

export default function GraphPage() {
  const router = useRouter();
  const svgRef = useRef<SVGSVGElement>(null);
  const [rawNodes, setRawNodes] = useState<GraphNodeType[]>([]);
  const [rawEdges, setRawEdges] = useState<GraphEdgeType[]>([]);
  const [loading, setLoading] = useState(true);
  const [zoom, setZoom] = useState(0.6);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [selectedNode, setSelectedNode] = useState<SimNode | null>(null);
  const [filterGroup, setFilterGroup] = useState<string | null>(null);

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
    const W = 1800;
    const H = 1200;
    return createSimulation(rawNodes, rawEdges, W, H);
  }, [rawNodes, rawEdges]);

  const filteredNodes = useMemo(
    () => (filterGroup ? nodes.filter((n) => n.group === filterGroup) : nodes),
    [nodes, filterGroup],
  );

  const visibleNodeIds = new Set(filteredNodes.map((n) => n.id));
  const filteredEdges = useMemo(
    () => edges.filter((e) => visibleNodeIds.has(e.source) && visibleNodeIds.has(e.target)),
    [edges, visibleNodeIds],
  );

  const connectedEdges = useMemo(() => {
    if (!selectedNode) return [];
    return filteredEdges.filter((e) => e.source === selectedNode.id || e.target === selectedNode.id);
  }, [selectedNode, filteredEdges]);

  const showEdgeLabels = zoom > 0.5;

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.05 : 0.05;
    setZoom((z) => Math.max(0.2, Math.min(3, z + delta)));
  }, []);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.target === e.currentTarget || ((e.target as SVGElement).tagName === "rect" && (e.target as SVGElement).dataset.type !== "node")) {
      setIsDragging(true);
      setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    }
  }, [pan]);

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (isDragging) {
        setPan({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
      }
    },
    [isDragging, dragStart],
  );

  const handleMouseUp = useCallback(() => setIsDragging(false), []);

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
      <header className="border-b px-5 py-4 dark:border-zinc-800">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => router.push("/")}>
              <ArrowLeftIcon className="mr-1 size-4" />
              Voltar
            </Button>
            <h1 className="text-lg font-semibold">Mapa de Conhecimento</h1>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setZoom((z) => Math.max(0.2, z - 0.1))}>
              <ZoomOutIcon className="size-4" />
            </Button>
            <span className="text-xs text-muted-foreground w-12 text-center">{Math.round(zoom * 100)}%</span>
            <Button variant="outline" size="sm" onClick={() => setZoom((z) => Math.min(3, z + 0.1))}>
              <ZoomInIcon className="size-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={() => { setZoom(0.6); setPan({ x: 0, y: 0 }); }}>
              <Maximize2Icon className="size-4" />
            </Button>
          </div>
        </div>
      </header>

      {/* Legend + Filters */}
      <div className="mx-auto w-full max-w-7xl px-5 py-3 flex flex-col gap-3">
        {/* Group filters */}
        <div className="flex gap-3 flex-wrap">
          {groups.map((g) => {
            const colors = GROUP_COLORS[g] || GROUP_COLORS.CONCEITO;
            return (
              <Badge
                key={g}
                variant={filterGroup === g ? "default" : "outline"}
                className="cursor-pointer gap-2 capitalize"
                onClick={() => setFilterGroup(filterGroup === g ? null : g)}
                style={filterGroup === g
                  ? { backgroundColor: colors.border, borderColor: colors.border }
                  : {}
                }
              >
                <span
                  className="inline-block size-2.5 rounded-full ring-1 ring-white/20"
                  style={{ backgroundColor: dominioColor(0.5) }}
                />
                {g.toLowerCase()}
              </Badge>
            );
          })}
        </div>

        {/* Semantic relation legend */}
        <div className="flex gap-6 flex-wrap text-xs text-muted-foreground">
          {LEGEND_GROUPS.map((group) => (
            <div key={group.label} className="flex flex-col gap-1">
              <span className="font-medium text-foreground">{group.label}</span>
              {group.types.map((t) => (
                <div key={t.code} className="flex items-center gap-2">
                  <span
                    className="inline-block w-5 h-0.5 rounded-sm"
                    style={{ backgroundColor: relationColor(t.code) }}
                  />
                  <span>{t.display}</span>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* Canvas */}
      <div className="flex-1 mx-auto w-full max-w-7xl px-5 pb-5">
        <div
          className="relative w-full rounded-xl border overflow-hidden bg-white dark:bg-zinc-950 dark:border-zinc-800"
          style={{ height: "calc(100vh - 240px)", minHeight: 500 }}
        >
          <svg
            ref={svgRef}
            className="absolute inset-0 w-full h-full"
            onWheel={handleWheel}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
          >
            <g transform={`translate(${pan.x + 400}, ${pan.y + 200}) scale(${zoom})`}>
              {/* Edges */}
              {filteredEdges.map((edge, i) => {
                const midX = (edge.sourceX + edge.targetX) / 2;
                const midY = (edge.sourceY + edge.targetY) / 2;

                return (
                  <g key={`${edge.source}-${edge.target}-${i}`}>
                    <line
                      x1={edge.sourceX}
                      y1={edge.sourceY}
                      x2={edge.targetX}
                      y2={edge.targetY}
                      stroke={relationColor(edge.type)}
                      strokeWidth={edge.peso > 0.7 ? 1.5 : 1}
                      strokeOpacity={0.4}
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
                          style={{ color: relationColor(edge.type), border: `1px solid ${relationColor(edge.type)}30` }}
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
                const colors = GROUP_COLORS[node.group] || GROUP_COLORS.CONCEITO;
                const isSelected = selectedNode?.id === node.id;

                return (
                  <g
                    key={node.id}
                    transform={`translate(${node.x}, ${node.y})`}
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedNode(node);
                    }}
                    className="cursor-pointer"
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
                      stroke={isSelected ? "#fff" : colors.border}
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
        <div className="fixed bottom-4 right-4 w-80">
          <Card className="bg-zinc-50 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800">
            <CardContent className="pt-4">
              <div className="space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground capitalize">
                      {selectedNode.tipoReal.toLowerCase()}
                    </p>
                    <h3 className="text-base font-semibold">{selectedNode.label}</h3>
                  </div>
                  <button
                    onClick={() => setSelectedNode(null)}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    ✕
                  </button>
                </div>

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

                {connectedEdges.map((edge) => {
                  const otherId = edge.source === selectedNode.id ? edge.target : edge.source;
                  const other = nodes.find((n) => n.id === otherId);
                  if (!other) return null;
                  const isOut = edge.source === selectedNode.id;
                  return (
                    <div key={`${edge.source}-${edge.target}`} className="flex items-center gap-1 text-xs">
                      <span className="text-muted-foreground">{isOut ? "→" : "←"}</span>
                      <span style={{ color: relationColor(edge.type) }} className="font-medium">
                        {edge.label}
                      </span>
                      <span className="text-foreground truncate max-w-[160px]">
                        {other.label}
                      </span>
                    </div>
                  );
                })}

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
