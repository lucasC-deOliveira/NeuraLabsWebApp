"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { getNodesInRect } from "../../domain/selectors/graph.selectors";

export type LayoutNode = {
  id: string;
  x: number;
  y: number;
};

export type MarqueeRect = { x1: number; y1: number; x2: number; y2: number };

type Pan = { x: number; y: number };

function safe(n: any) {
  return Number.isFinite(n) ? n : 0;
}

type InteractionState = {
  type: "idle" | "pan" | "drag" | "marquee";
  nodeId: string | null;
};

type Props<T extends LayoutNode> = {
  layout: T[];
  setLayout: React.Dispatch<React.SetStateAction<T[]>>;

  zoom: number;
  setZoom: React.Dispatch<React.SetStateAction<number>>;

  pan: Pan;
  setPan: React.Dispatch<React.SetStateAction<Pan>>;

  svgRef: React.RefObject<HTMLElement | null>;

  // seleção múltipla: nós que se movem juntos ao arrastar um deles
  selectedNodeIds?: Set<string>;
  onMarqueeSelect?: (ids: string[]) => void;
};

export function useGraphInteractions<T extends LayoutNode>({
  layout,
  setLayout,
  zoom,
  setZoom,
  pan,
  setPan,
  svgRef,
  selectedNodeIds,
  onMarqueeSelect,
}: Props<T>) {

  const interactionRef = useRef<InteractionState>({ type: "idle", nodeId: null });
  const dragOffset = useRef({ x: 0, y: 0 });
  const layoutRef = useRef(layout);
  const panRef = useRef(pan);
  const zoomRef = useRef(zoom);
  const selectedRef = useRef(selectedNodeIds);
  const onMarqueeSelectRef = useRef(onMarqueeSelect);

  // drag: posição inicial do ponteiro e dos nós do grupo arrastado
  const dragStart = useRef<{
    graph: { x: number; y: number };
    positions: Map<string, { x: number; y: number }>;
  }>({ graph: { x: 0, y: 0 }, positions: new Map() });

  // marquee em coordenadas do grafo
  const [marquee, setMarquee] = useState<MarqueeRect | null>(null);
  const marqueeRef = useRef<MarqueeRect | null>(null);

  useEffect(() => { layoutRef.current = layout; }, [layout]);
  useEffect(() => { panRef.current = pan; }, [pan]);
  useEffect(() => { zoomRef.current = zoom; }, [zoom]);
  useEffect(() => { selectedRef.current = selectedNodeIds; }, [selectedNodeIds]);
  useEffect(() => { onMarqueeSelectRef.current = onMarqueeSelect; }, [onMarqueeSelect]);

  // =========================
  // COORD TRANSFORM
  // Converts viewport-absolute mouse coords to graph coords using the SVG's
  // actual bounding rect so that zoom-around-cursor stays accurate regardless
  // of sidebar width or header height.
  // =========================
  const screenToGraph = useCallback((viewportX: number, viewportY: number) => {
    const rect = svgRef.current?.getBoundingClientRect();
    const left = rect?.left ?? 0;
    const top = rect?.top ?? 0;
    return {
      x: (viewportX - left - panRef.current.x) / zoomRef.current,
      y: (viewportY - top - panRef.current.y) / zoomRef.current,
    };
  }, [svgRef]);

  // =========================
  // WHEEL ZOOM (zoom around cursor)
  // =========================
  const handleWheel = useCallback((e: WheelEvent) => {
    e.preventDefault();
    if (interactionRef.current.type !== "idle") return;

    const delta = e.deltaY > 0 ? -0.08 : 0.08;
    const nextZoom = Math.min(20, Math.max(0.2, zoomRef.current + delta));

    const graph = screenToGraph(e.clientX, e.clientY);

    setZoom(nextZoom);
    setPan({
      x: safe(e.clientX - (svgRef.current?.getBoundingClientRect().left ?? 0) - graph.x * nextZoom),
      y: safe(e.clientY - (svgRef.current?.getBoundingClientRect().top ?? 0) - graph.y * nextZoom),
    });
  }, [screenToGraph, setZoom, setPan, svgRef]);

  // =========================
  // START PAN
  // =========================
  const startPan = useCallback((clientX: number, clientY: number) => {
    interactionRef.current = { type: "pan", nodeId: null };
    dragOffset.current = {
      x: clientX - panRef.current.x,
      y: clientY - panRef.current.y,
    };
  }, []);

  // =========================
  // START DRAG NODE (move o grupo selecionado quando o nó faz parte dele)
  // =========================
  const startDragNode = useCallback((nodeId: string, e: PointerEvent) => {
    const node = layoutRef.current.find(n => n.id === nodeId);
    if (!node) return;
    // O Assunto-raiz é fixo no centro — não pode ser arrastado.
    if ((node as any).isRoot) return;

    interactionRef.current = { type: "drag", nodeId };

    const selected = selectedRef.current;
    const groupIds =
      selected && selected.has(nodeId) && selected.size > 1
        ? [...selected]
        : [nodeId];

    const positions = new Map<string, { x: number; y: number }>();
    for (const n of layoutRef.current) {
      if (groupIds.includes(n.id)) positions.set(n.id, { x: n.x, y: n.y });
    }

    dragStart.current = {
      graph: screenToGraph(e.clientX, e.clientY),
      positions,
    };
  }, [screenToGraph]);

  // =========================
  // START MARQUEE (seleção por retângulo)
  // =========================
  const startMarquee = useCallback((clientX: number, clientY: number) => {
    const g = screenToGraph(clientX, clientY);
    interactionRef.current = { type: "marquee", nodeId: null };
    const rect = { x1: g.x, y1: g.y, x2: g.x, y2: g.y };
    marqueeRef.current = rect;
    setMarquee(rect);
  }, [screenToGraph]);

  // =========================
  // POINTER MOVE GLOBAL
  // =========================
  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      const interaction = interactionRef.current;

      if (interaction.type === "pan") {
        // Only update the ref — GraphRenderer's bypass reads panRef via its
        // own S.current.pan and schedules RAF directly. Calling setPan here
        // would trigger React reconciliation on every pointermove (~60/s),
        // adding ~1-2ms of overhead per frame even though no draw is needed.
        panRef.current = {
          x: e.clientX - dragOffset.current.x,
          y: e.clientY - dragOffset.current.y,
        };
        return;
      }

      if (interaction.type === "marquee") {
        const prev = marqueeRef.current;
        if (!prev) return;
        const g = screenToGraph(e.clientX, e.clientY);
        const rect = { x1: prev.x1, y1: prev.y1, x2: g.x, y2: g.y };
        marqueeRef.current = rect;
        setMarquee(rect);
        return;
      }

      if (interaction.type !== "drag" || !interaction.nodeId) return;

      const graph = screenToGraph(e.clientX, e.clientY);
      const dx = graph.x - dragStart.current.graph.x;
      const dy = graph.y - dragStart.current.graph.y;
      setLayout(prev =>
        prev.map(node => {
          const start = dragStart.current.positions.get(node.id);
          return start ? { ...node, x: start.x + dx, y: start.y + dy } : node;
        })
      );
    };

    const onUp = () => {
      if (interactionRef.current.type === "pan") {
        // Commit final pan to React state once (on release) so other
        // consumers (focusNode, screenToGraph after pan) get the correct value.
        setPan({ x: safe(panRef.current.x), y: safe(panRef.current.y) });
      }
      if (interactionRef.current.type === "marquee" && marqueeRef.current) {
        const ids = getNodesInRect(layoutRef.current, marqueeRef.current);
        onMarqueeSelectRef.current?.(ids);
        marqueeRef.current = null;
        setMarquee(null);
      }
      interactionRef.current = { type: "idle", nodeId: null };
    };

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
  }, [setLayout, setPan, screenToGraph]);

  // =========================
  // FOCUS NODE (center in SVG viewport)
  // =========================
  const focusNode = useCallback((node: T) => {
    const rect = svgRef.current?.getBoundingClientRect();
    const cx = rect ? rect.width / 2 : 500;
    const cy = rect ? rect.height / 2 : 300;
    setPan({
      x: -node.x * zoomRef.current + cx,
      y: -node.y * zoomRef.current + cy,
    });
    setZoom(Math.max(zoomRef.current, 0.8));
  }, [svgRef, setPan, setZoom]);

  return { handleWheel, startDragNode, startPan, startMarquee, marquee, focusNode };
}
