"use client";

import { useCallback, useEffect, useRef, useState, type Dispatch, type MutableRefObject, type RefObject, type SetStateAction } from "react";
import { getNodesInRect } from "../../domain/selectors/graph.selectors";

export type LayoutNode = {
  id: string;
  x: number;
  y: number;
};

export type MarqueeRect = { x1: number; y1: number; x2: number; y2: number };

type Pan = { x: number; y: number };

function safe(n: number): number {
  return Number.isFinite(n) ? n : 0;
}

type InteractionState = {
  type: "idle" | "pan" | "drag" | "marquee";
  nodeId: string | null;
};

// Todo o estado mutável da interação num único ref estável (evita reconciliação
// do React a ~60/s durante pan/drag; as funções de módulo abaixo o mutam direto).
interface InteractionCore<T extends LayoutNode> {
  interaction: InteractionState;
  dragOffset: Pan;
  dragStart: { graph: Pan; positions: Map<string, Pan> };
  marquee: MarqueeRect | null;
  layout: T[];
  pan: Pan;
  zoom: number;
  selected?: Set<string>;
  onMarqueeSelect?: (ids: string[]) => void;
}

type Props<T extends LayoutNode> = {
  layout: T[];
  setLayout: Dispatch<SetStateAction<T[]>>;
  zoom: number;
  setZoom: Dispatch<SetStateAction<number>>;
  pan: Pan;
  setPan: Dispatch<SetStateAction<Pan>>;
  svgRef: RefObject<HTMLElement | null>;
  // seleção múltipla: nós que se movem juntos ao arrastar um deles
  selectedNodeIds?: Set<string>;
  onMarqueeSelect?: (ids: string[]) => void;
};

export interface GraphInteractionApi<T extends LayoutNode> {
  handleWheel: (e: WheelEvent) => void;
  startDragNode: (nodeId: string, e: PointerEvent) => void;
  startPan: (clientX: number, clientY: number) => void;
  startMarquee: (clientX: number, clientY: number) => void;
  marquee: MarqueeRect | null;
  focusNode: (node: T) => void;
}

type CoreRef<T extends LayoutNode> = MutableRefObject<InteractionCore<T>>;
type ScreenToGraph = (viewportX: number, viewportY: number) => Pan;

function initCore<T extends LayoutNode>(layout: T[], pan: Pan, zoom: number, selected: Set<string> | undefined, onMarqueeSelect: ((ids: string[]) => void) | undefined): InteractionCore<T> {
  return {
    interaction: { type: "idle", nodeId: null },
    dragOffset: { x: 0, y: 0 },
    dragStart: { graph: { x: 0, y: 0 }, positions: new Map() },
    marquee: null,
    layout, pan, zoom, selected, onMarqueeSelect,
  };
}

// A escrita no ref fica numa fn de módulo (fora do escopo do hook) — a regra
// react-hooks/immutability proíbe mutar core.current.prop dentro do effect.
function syncCore<T extends LayoutNode>(core: CoreRef<T>, patch: Partial<InteractionCore<T>>): void {
  Object.assign(core.current, patch);
}

function useSyncCore<T extends LayoutNode>(core: CoreRef<T>, layout: T[], pan: Pan, zoom: number, selected: Set<string> | undefined, onMarqueeSelect: ((ids: string[]) => void) | undefined): void {
  useEffect(() => syncCore(core, { layout }), [core, layout]);
  useEffect(() => syncCore(core, { pan }), [core, pan]);
  useEffect(() => syncCore(core, { zoom }), [core, zoom]);
  useEffect(() => syncCore(core, { selected }), [core, selected]);
  useEffect(() => syncCore(core, { onMarqueeSelect }), [core, onMarqueeSelect]);
}

// coords de viewport → coords do grafo, usando o rect real do SVG (zoom-around-cursor
// preciso independente de largura da sidebar / altura do header).
function toGraph<T extends LayoutNode>(vx: number, vy: number, svgRef: RefObject<HTMLElement | null>, core: CoreRef<T>): Pan {
  const rect = svgRef.current?.getBoundingClientRect();
  const left = rect?.left ?? 0;
  const top = rect?.top ?? 0;
  return { x: (vx - left - core.current.pan.x) / core.current.zoom, y: (vy - top - core.current.pan.y) / core.current.zoom };
}

function applyWheel<T extends LayoutNode>(e: WheelEvent, core: CoreRef<T>, svgRef: RefObject<HTMLElement | null>, screenToGraph: ScreenToGraph, setZoom: Dispatch<SetStateAction<number>>, setPan: Dispatch<SetStateAction<Pan>>): void {
  e.preventDefault();
  if (core.current.interaction.type !== "idle") return;
  const delta = e.deltaY > 0 ? -0.08 : 0.08;
  const nextZoom = Math.min(20, Math.max(0.2, core.current.zoom + delta));
  const graph = screenToGraph(e.clientX, e.clientY);
  const rect = svgRef.current?.getBoundingClientRect();
  setZoom(nextZoom);
  setPan({
    x: safe(e.clientX - (rect?.left ?? 0) - graph.x * nextZoom),
    y: safe(e.clientY - (rect?.top ?? 0) - graph.y * nextZoom),
  });
}

function beginPan<T extends LayoutNode>(clientX: number, clientY: number, core: CoreRef<T>): void {
  core.current.interaction = { type: "pan", nodeId: null };
  core.current.dragOffset = { x: clientX - core.current.pan.x, y: clientY - core.current.pan.y };
}

// move o grupo selecionado quando o nó arrastado faz parte dele.
function beginDrag<T extends LayoutNode>(nodeId: string, e: PointerEvent, core: CoreRef<T>, screenToGraph: ScreenToGraph): void {
  const node = core.current.layout.find((n) => n.id === nodeId);
  // o Assunto-raiz é fixo no centro — não arrasta.
  if (!node || (node as T & { isRoot?: boolean }).isRoot) return;
  core.current.interaction = { type: "drag", nodeId };
  const selected = core.current.selected;
  const groupIds = selected && selected.has(nodeId) && selected.size > 1 ? [...selected] : [nodeId];
  const positions = new Map<string, Pan>();
  for (const n of core.current.layout) {
    if (groupIds.includes(n.id)) positions.set(n.id, { x: n.x, y: n.y });
  }
  core.current.dragStart = { graph: screenToGraph(e.clientX, e.clientY), positions };
}

function beginMarquee<T extends LayoutNode>(clientX: number, clientY: number, core: CoreRef<T>, screenToGraph: ScreenToGraph, setMarquee: (m: MarqueeRect | null) => void): void {
  const g = screenToGraph(clientX, clientY);
  core.current.interaction = { type: "marquee", nodeId: null };
  const rect = { x1: g.x, y1: g.y, x2: g.x, y2: g.y };
  core.current.marquee = rect;
  setMarquee(rect);
}

function centerOn<T extends LayoutNode>(node: T, svgRef: RefObject<HTMLElement | null>, core: CoreRef<T>, setPan: Dispatch<SetStateAction<Pan>>, setZoom: Dispatch<SetStateAction<number>>): void {
  const rect = svgRef.current?.getBoundingClientRect();
  const cx = rect ? rect.width / 2 : 500;
  const cy = rect ? rect.height / 2 : 300;
  setPan({ x: -node.x * core.current.zoom + cx, y: -node.y * core.current.zoom + cy });
  setZoom(Math.max(core.current.zoom, 0.8));
}

// Só muta o pan no ref — o GraphRenderer lê panRef e agenda RAF direto; chamar
// setPan aqui reconciliaria o React a cada pointermove (~60/s) sem necessidade.
function panMove<T extends LayoutNode>(e: PointerEvent, core: CoreRef<T>): void {
  core.current.pan = { x: e.clientX - core.current.dragOffset.x, y: e.clientY - core.current.dragOffset.y };
}

function marqueeMove<T extends LayoutNode>(e: PointerEvent, core: CoreRef<T>, screenToGraph: ScreenToGraph, setMarquee: (m: MarqueeRect | null) => void): void {
  const prev = core.current.marquee;
  if (!prev) return;
  const g = screenToGraph(e.clientX, e.clientY);
  const rect = { x1: prev.x1, y1: prev.y1, x2: g.x, y2: g.y };
  core.current.marquee = rect;
  setMarquee(rect);
}

function moveNode<T extends LayoutNode>(node: T, positions: Map<string, Pan>, dx: number, dy: number): T {
  const start = positions.get(node.id);
  return start ? { ...node, x: start.x + dx, y: start.y + dy } : node;
}

function dragMove<T extends LayoutNode>(e: PointerEvent, core: CoreRef<T>, screenToGraph: ScreenToGraph, setLayout: Dispatch<SetStateAction<T[]>>): void {
  const { nodeId } = core.current.interaction;
  if (!nodeId) return;
  const graph = screenToGraph(e.clientX, e.clientY);
  const dx = graph.x - core.current.dragStart.graph.x;
  const dy = graph.y - core.current.dragStart.graph.y;
  setLayout((prev) => prev.map((n) => moveNode(n, core.current.dragStart.positions, dx, dy)));
}

function handleMove<T extends LayoutNode>(e: PointerEvent, core: CoreRef<T>, screenToGraph: ScreenToGraph, setLayout: Dispatch<SetStateAction<T[]>>, setMarquee: (m: MarqueeRect | null) => void): void {
  const t = core.current.interaction.type;
  if (t === "pan") return panMove(e, core);
  if (t === "marquee") return marqueeMove(e, core, screenToGraph, setMarquee);
  if (t === "drag") dragMove(e, core, screenToGraph, setLayout);
}

function handleUp<T extends LayoutNode>(core: CoreRef<T>, setPan: Dispatch<SetStateAction<Pan>>, setMarquee: (m: MarqueeRect | null) => void): void {
  const t = core.current.interaction.type;
  // commit final do pan no state React (na soltura) p/ os outros consumidores.
  if (t === "pan") setPan({ x: safe(core.current.pan.x), y: safe(core.current.pan.y) });
  else if (t === "marquee" && core.current.marquee) {
    const ids = getNodesInRect(core.current.layout, core.current.marquee);
    core.current.onMarqueeSelect?.(ids);
    core.current.marquee = null;
    setMarquee(null);
  }
  core.current.interaction = { type: "idle", nodeId: null };
}

function usePointerListeners<T extends LayoutNode>(core: CoreRef<T>, screenToGraph: ScreenToGraph, setLayout: Dispatch<SetStateAction<T[]>>, setPan: Dispatch<SetStateAction<Pan>>, setMarquee: (m: MarqueeRect | null) => void): void {
  useEffect(() => {
    const onMove = (e: PointerEvent): void => handleMove(e, core, screenToGraph, setLayout, setMarquee);
    const onUp = (): void => handleUp(core, setPan, setMarquee);
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return (): void => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
  }, [core, screenToGraph, setLayout, setPan, setMarquee]);
}

export function useGraphInteractions<T extends LayoutNode>(
  { layout, setLayout, zoom, setZoom, pan, setPan, svgRef, selectedNodeIds, onMarqueeSelect }: Props<T>,
): GraphInteractionApi<T> {
  const [marquee, setMarquee] = useState<MarqueeRect | null>(null);
  const core = useRef<InteractionCore<T>>(initCore(layout, pan, zoom, selectedNodeIds, onMarqueeSelect));
  useSyncCore(core, layout, pan, zoom, selectedNodeIds, onMarqueeSelect);

  const screenToGraph = useCallback<ScreenToGraph>((vx, vy) => toGraph(vx, vy, svgRef, core), [svgRef]);
  const handleWheel = useCallback((e: WheelEvent) => applyWheel(e, core, svgRef, screenToGraph, setZoom, setPan), [svgRef, screenToGraph, setZoom, setPan]);
  const startPan = useCallback((cx: number, cy: number) => beginPan(cx, cy, core), []);
  const startDragNode = useCallback((id: string, e: PointerEvent) => beginDrag(id, e, core, screenToGraph), [screenToGraph]);
  const startMarquee = useCallback((cx: number, cy: number) => beginMarquee(cx, cy, core, screenToGraph, setMarquee), [screenToGraph]);
  const focusNode = useCallback((node: T) => centerOn(node, svgRef, core, setPan, setZoom), [svgRef, setPan, setZoom]);
  usePointerListeners(core, screenToGraph, setLayout, setPan, setMarquee);

  return { handleWheel, startDragNode, startPan, startMarquee, marquee, focusNode };
}
