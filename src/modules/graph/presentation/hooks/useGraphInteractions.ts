"use client";

import {
  useState,
  useCallback,
  useEffect,
  useRef,
} from "react";

/**
 * Tipagem mínima esperada do node no layout
 */
export type LayoutNode = {
  id: string;
  x: number;
  y: number;
};

type Pan = { x: number; y: number };

type UseGraphInteractionsProps<T extends LayoutNode> = {
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
}: UseGraphInteractionsProps<T>) {
  // =========================
  // STATE
  // =========================
  const [draggingNodeId, setDraggingNodeId] = useState<string | null>(null);
  const dragOffsetRef = useRef({ x: 0, y: 0 });
const [mode, setMode] = useState<"idle" | "pan" | "drag">("idle");
  const layoutRef = useRef(layout);

  useEffect(() => {
    layoutRef.current = layout;
  }, [layout]);

  // =========================
  // COORD TRANSFORM
  // =========================
  const screenToGraph = useCallback(
    (clientX: number, clientY: number) => ({
      x: (clientX - pan.x - offsetX) / zoom,
      y: (clientY - pan.y - offsetY) / zoom,
    }),
    [pan.x, pan.y, zoom, offsetX, offsetY]
  );

  // =========================
  // ZOOM
  // =========================
  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      e.preventDefault();

      const delta = e.deltaY > 0 ? -0.08 : 0.08;

      setZoom((z) => {
        const next = z + delta;
        return Math.min(3, Math.max(0.2, next));
      });
    },
    [setZoom]
  );

  // =========================
  // PAN START
  // =========================
 const startPan = useCallback(
  (clientX: number, clientY: number) => {
    setMode("pan");

    setDraggingNodeId(null);

    dragOffsetRef.current = {
      x: clientX - pan.x,
      y: clientY - pan.y,
    };
  },
  [pan.x, pan.y]
);

  // =========================
  // NODE DRAG START
  // =========================
  const startDragNode = useCallback(
  (nodeId: string, clientX: number, clientY: number) => {
    const node = layoutRef.current.find((n) => n.id === nodeId);
    if (!node) return;

    setMode("drag");
    setDraggingNodeId(nodeId);

    const graphPos = screenToGraph(clientX, clientY);

    dragOffsetRef.current = {
      x: graphPos.x - node.x,
      y: graphPos.y - node.y,
    };
  },
  [screenToGraph]
);

  // =========================
  // GLOBAL DRAG HANDLER (FIXED)
  // =========================
  useEffect(() => {
    console.log("draggingNodeId", draggingNodeId);
    if (!draggingNodeId) return;

    const handleMouseMove = (e: MouseEvent) => {
  if (mode === "pan") {
    setPan({
      x: e.clientX - dragOffsetRef.current.x,
      y: e.clientY - dragOffsetRef.current.y,
    });
    return;
  }

  if (mode !== "drag" || !draggingNodeId) return;

  const graphPos = screenToGraph(e.clientX, e.clientY);

  setLayout((prev) =>
    prev.map((node) =>
      node.id === draggingNodeId
        ? {
            ...node,
            x: graphPos.x - dragOffsetRef.current.x,
            y: graphPos.y - dragOffsetRef.current.y,
          }
        : node
    )
  );
};

    const handleMouseUp = () => {
  setDraggingNodeId(null);
  setMode("idle");
};

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [draggingNodeId, setLayout, setPan, screenToGraph,mode]);

  // =========================
  // FOCUS NODE
  // =========================
  const focusNode = useCallback(
    (node: T) => {
      setPan({
        x: -node.x * zoom + offsetX,
        y: -node.y * zoom + offsetY,
      });

      setZoom((z) => Math.max(z, 0.8));
    },
    [setPan, setZoom, zoom, offsetX, offsetY]
  );

  // =========================
  // DERIVED STATE
  // =========================
  const isDragging = draggingNodeId !== null;

  // =========================
  // API
  // =========================
  return {
    handleWheel,
    startDragNode,
    startPan,

    focusNode,

    draggingNodeId,
    isDragging,
  };
}