"use client";

import {
  useCallback,
  useEffect,
  useRef,
} from "react";

export type LayoutNode = {
  id: string;
  x: number;
  y: number;
};

type Pan = { x: number; y: number };

function safe(n: any) {
  return Number.isFinite(n) ? n : 0;
}

type InteractionState = {
  type: "idle" | "pan" | "drag";
  nodeId: string | null;
};

type Props<T extends LayoutNode> = {
  layout: T[];
  setLayout: React.Dispatch<React.SetStateAction<T[]>>;

  zoom: number;
  setZoom: React.Dispatch<React.SetStateAction<number>>;

  pan: Pan;
  setPan: React.Dispatch<React.SetStateAction<Pan>>;

  svgRef: React.RefObject<SVGSVGElement | null>;
};

export function useGraphInteractions<T extends LayoutNode>({
  layout,
  setLayout,
  zoom,
  setZoom,
  pan,
  setPan,
  svgRef,
}: Props<T>) {

  const interactionRef = useRef<InteractionState>({ type: "idle", nodeId: null });
  const dragOffset = useRef({ x: 0, y: 0 });
  const layoutRef = useRef(layout);
  const panRef = useRef(pan);
  const zoomRef = useRef(zoom);

  useEffect(() => { layoutRef.current = layout; }, [layout]);
  useEffect(() => { panRef.current = pan; }, [pan]);
  useEffect(() => { zoomRef.current = zoom; }, [zoom]);

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
    const nextZoom = Math.min(3, Math.max(0.2, zoomRef.current + delta));

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
  // START DRAG NODE
  // =========================
  const startDragNode = useCallback((nodeId: string, e: PointerEvent) => {
    const node = layoutRef.current.find(n => n.id === nodeId);
    if (!node) return;

    interactionRef.current = { type: "drag", nodeId };

    const graph = screenToGraph(e.clientX, e.clientY);
    dragOffset.current = {
      x: graph.x - node.x,
      y: graph.y - node.y,
    };
  }, [screenToGraph]);

  // =========================
  // POINTER MOVE GLOBAL
  // =========================
  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      const interaction = interactionRef.current;

      if (interaction.type === "pan") {
        const next = {
          x: e.clientX - dragOffset.current.x,
          y: e.clientY - dragOffset.current.y,
        };
        panRef.current = next;
        setPan({ x: safe(next.x), y: safe(next.y) });
        return;
      }

      if (interaction.type !== "drag" || !interaction.nodeId) return;

      const graph = screenToGraph(e.clientX, e.clientY);
      setLayout(prev =>
        prev.map(node =>
          node.id === interaction.nodeId
            ? { ...node, x: graph.x - dragOffset.current.x, y: graph.y - dragOffset.current.y }
            : node
        )
      );
    };

    const onUp = () => {
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

  return { handleWheel, startDragNode, startPan, focusNode };
}