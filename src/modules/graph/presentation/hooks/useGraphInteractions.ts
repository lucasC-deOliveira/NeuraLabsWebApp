"use client";

import {
  useState,
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

  offsetX?: number;
  offsetY?: number;
};

export function useGraphInteractions<T extends LayoutNode>({
  layout,
  setLayout,
  zoom,
  setZoom,
  pan,
  setPan,
  offsetX = 400,
  offsetY = 200,
}: Props<T>) {

  // =========================
  // SINGLE SOURCE OF TRUTH
  // =========================
  const interactionRef = useRef<InteractionState>({
    type: "idle",
    nodeId: null,
  });

  const dragOffset = useRef({ x: 0, y: 0 });
  const layoutRef = useRef(layout);
  const panRef = useRef(pan);
  const zoomRef = useRef(zoom);

  useEffect(() => {
    layoutRef.current = layout;
  }, [layout]);

  useEffect(() => {
    panRef.current = pan;
  }, [pan]);

  useEffect(() => {
    zoomRef.current = zoom;
  }, [zoom]);

  // =========================
  // COORD TRANSFORM
  // =========================
  const screenToGraph = (x: number, y: number) => {
    return {
      x: (x - panRef.current.x - offsetX) / zoomRef.current,
      y: (y - panRef.current.y - offsetY) / zoomRef.current,
    };
  };

  // =========================
  // WHEEL (ZOOM FIXED)
  // =========================
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();

    if (interactionRef.current.type !== "idle") return;

    const zoomIntensity = 0.08;
    const delta = e.deltaY > 0 ? -zoomIntensity : zoomIntensity;

    const nextZoom = Math.min(3, Math.max(0.2, zoomRef.current + delta));

    const mouseX = e.clientX;
    const mouseY = e.clientY;

    const graph = screenToGraph(mouseX, mouseY);

    const nextPan = {
      x: mouseX - graph.x * nextZoom,
      y: mouseY - graph.y * nextZoom,
    };

    setZoom(nextZoom);
    setPan({
      x: safe(nextPan.x),
      y: safe(nextPan.y),
    });
  }, [setZoom, setPan]);

  // =========================
  // START PAN
  // =========================
  const startPan = useCallback((e: React.PointerEvent) => {
    interactionRef.current = {
      type: "pan",
      nodeId: null,
    };

    dragOffset.current = {
      x: e.clientX - panRef.current.x,
      y: e.clientY - panRef.current.y,
    };
  }, []);

  // =========================
  // START DRAG NODE
  // =========================
  const startDragNode = useCallback((nodeId: string, e: React.PointerEvent) => {
    const node = layoutRef.current.find(n => n.id === nodeId);
    if (!node) return;

    interactionRef.current = {
      type: "drag",
      nodeId,
    };

    const graph = screenToGraph(e.clientX, e.clientY);

    dragOffset.current = {
      x: graph.x - node.x,
      y: graph.y - node.y,
    };
  }, []);

  // =========================
  // POINTER MOVE GLOBAL
  // =========================
  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      const interaction = interactionRef.current;

      // ================= PAN =================
      if (interaction.type === "pan") {
        const next = {
          x: e.clientX - dragOffset.current.x,
          y: e.clientY - dragOffset.current.y,
        };

        panRef.current = next;

        setPan({
          x: safe(next.x),
          y: safe(next.y),
        });

        return;
      }

      // ================= DRAG NODE =================
      if (interaction.type !== "drag" || !interaction.nodeId) return;

      const graph = screenToGraph(e.clientX, e.clientY);

      setLayout(prev =>
        prev.map(node =>
          node.id === interaction.nodeId
            ? {
                ...node,
                x: graph.x - dragOffset.current.x,
                y: graph.y - dragOffset.current.y,
              }
            : node
        )
      );
    };

    const onUp = () => {
      interactionRef.current = {
        type: "idle",
        nodeId: null,
      };
    };

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);

    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
  }, [setLayout, setPan]);

  // =========================
  // FOCUS NODE
  // =========================
  const focusNode = useCallback((node: T) => {
    setPan({
      x: -node.x * zoomRef.current + offsetX,
      y: -node.y * zoomRef.current + offsetY,
    });

    setZoom(Math.max(zoomRef.current, 0.8));
  }, [setPan, setZoom]);

  return {
    handleWheel,
    startDragNode,
    startPan,
    focusNode,
  };
}