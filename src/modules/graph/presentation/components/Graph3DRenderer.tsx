"use client";

import { useCallback, useEffect, useRef, useMemo, useState, forwardRef, useImperativeHandle } from "react";
import ForceGraph3D from "react-force-graph-3d";
import * as THREE from "three";
import { NODE_TYPE_COLORS } from "@/modules/graph/constants/graph-ui.constants";
import { getRelationColor } from "@/modules/graph/presentation/services/graph-style.service";
import type { SimNode, SimEdge } from "@/modules/graph/infra/layout/force-layout.engine";

export interface Graph3DHandle {
  zoomIn: () => void;
  zoomOut: () => void;
}

interface Graph3DRendererProps {
  nodes: SimNode[];
  edges: SimEdge[];
  isDark: boolean;
  matchedIds: Set<string> | null;
  selectedNodeIds: Set<string>;
  onNodeClick: (node: SimNode) => void;
  highContrast?: boolean;
  focusMode?: boolean;
  focusDepth?: number;
  physicsEnabled?: boolean;
}

// Formas 3D que correspondem às formas da legenda 2D
const SHAPE_CFG: Record<string, { type: "sphere" | "ellipsoid" | "box"; w: number; h: number; d: number }> = {
  ASSUNTO:     { type: "sphere",    w: 8,  h: 8,  d: 8 },
  TOPICO:      { type: "ellipsoid", w: 10, h: 5,  d: 5 },
  CONCEITO:    { type: "box",       w: 12, h: 6,  d: 3 },
  NOTA:        { type: "box",       w: 6,  h: 11, d: 3 },
  FLASHCARD:   { type: "box",       w: 8,  h: 8,  d: 3 },
  TEXTO_BRUTO: { type: "box",       w: 10, h: 5,  d: 3 },
  BARALHO:     { type: "box",       w: 10, h: 7,  d: 3 },
};

const BG_DARK  = "#0a0a0a";
const BG_LIGHT = "#ffffff";

function makeLinkSprite(label: string, peso: number, color: string): THREE.Sprite {
  const W = 192, H = 36;
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "rgba(0,0,0,0.45)";
  ctx.beginPath();
  ctx.roundRect(2, 2, W - 4, H - 4, 6);
  ctx.fill();
  const pesoStr = peso !== 1 ? ` ×${peso.toFixed(1)}` : "";
  ctx.font = "bold 15px system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = color;
  ctx.fillText(label + pesoStr, W / 2, H / 2);
  const tex = new THREE.CanvasTexture(canvas);
  const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false });
  const sprite = new THREE.Sprite(mat);
  sprite.scale.set(12, 2.3, 1);
  return sprite;
}

function makeLabelSprite(text: string, color: string): THREE.Sprite {
  const W = 256, H = 48;
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;
  const label = text.length > 18 ? text.slice(0, 17) + "…" : text;
  ctx.font = "bold 20px system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = color;
  ctx.fillText(label, W / 2, H / 2);
  const tex = new THREE.CanvasTexture(canvas);
  const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false });
  const sprite = new THREE.Sprite(mat);
  sprite.scale.set(18, 3.5, 1);
  return sprite;
}

function buildNodeObj(node: any, bgColor: string, borderColor: string, textColor: string): THREE.Group {
  const cfg = SHAPE_CFG[node.group] ?? { type: "box", w: 8, h: 6, d: 3 };
  const group = new THREE.Group();

  const fillMat = new THREE.MeshLambertMaterial({ color: new THREE.Color(bgColor) });
  let mesh: THREE.Mesh;
  if (cfg.type === "sphere") {
    mesh = new THREE.Mesh(new THREE.SphereGeometry(cfg.w / 2, 28, 18), fillMat);
  } else if (cfg.type === "ellipsoid") {
    mesh = new THREE.Mesh(new THREE.SphereGeometry(1, 28, 18), fillMat);
    mesh.scale.set(cfg.w / 2, cfg.h / 2, cfg.d / 2);
  } else {
    mesh = new THREE.Mesh(new THREE.BoxGeometry(cfg.w, cfg.h, cfg.d), fillMat);
  }
  group.add(mesh);

  const edgeMat = new THREE.MeshBasicMaterial({
    color: new THREE.Color(borderColor),
    wireframe: false,
    transparent: true,
    opacity: 0.6,
    side: THREE.BackSide,
  });
  let border: THREE.Mesh;
  if (cfg.type === "sphere") {
    border = new THREE.Mesh(new THREE.SphereGeometry(cfg.w / 2 + 0.4, 28, 18), edgeMat);
  } else if (cfg.type === "ellipsoid") {
    border = new THREE.Mesh(new THREE.SphereGeometry(1.12, 28, 18), edgeMat);
    border.scale.set(cfg.w / 2, cfg.h / 2, cfg.d / 2);
  } else {
    border = new THREE.Mesh(new THREE.BoxGeometry(cfg.w + 0.6, cfg.h + 0.6, cfg.d + 0.6), edgeMat);
  }
  group.add(border);

  const labelY = cfg.type === "sphere" ? cfg.w / 2 + 4 : cfg.h / 2 + 3.5;
  const sprite = makeLabelSprite(node.label ?? "", textColor);
  sprite.position.set(0, labelY, 0);
  group.add(sprite);

  return group;
}

function getNodeColors(
  nodeId: string,
  nodeGroup: string,
  selectedNodeIds: Set<string>,
  effectiveMatchedIds: Set<string> | null,
  isDark: boolean,
  highContrast: boolean,
): { bg: string; border: string; text: string } {
  if (selectedNodeIds.has(nodeId)) {
    return { bg: "#1d4ed8", border: "#3b82f6", text: "#ffffff" };
  }
  if (effectiveMatchedIds !== null && !effectiveMatchedIds.has(nodeId)) {
    return isDark
      ? { bg: "#1f2937", border: "#374151", text: "#4b5563" }
      : { bg: "#e5e7eb", border: "#d1d5db", text: "#9ca3af" };
  }
  if (highContrast) {
    return isDark
      ? { bg: "#1e1b4b", border: "#6366f1", text: "#c7d2fe" }
      : { bg: "#e0e7ff", border: "#6366f1", text: "#312e81" };
  }
  const entry = NODE_TYPE_COLORS[nodeGroup as keyof typeof NODE_TYPE_COLORS];
  const palette = isDark ? entry?.dark : entry?.light;
  return {
    bg:     palette?.bg     ?? "#312e81",
    border: palette?.border ?? "#6366f1",
    text:   palette?.text   ?? (isDark ? "#c7d2fe" : "#1e1b4b"),
  };
}

export const Graph3DRenderer = forwardRef<Graph3DHandle, Graph3DRendererProps>(function Graph3DRenderer(
  {
    nodes,
    edges,
    isDark,
    matchedIds,
    selectedNodeIds,
    onNodeClick,
    highContrast = false,
    focusMode = false,
    focusDepth = 1,
    physicsEnabled = true,
  },
  ref,
) {
  const containerRef = useRef<HTMLDivElement>(null);
  const fgRef = useRef<any>(null);
  const [dims, setDims] = useState({ w: 800, h: 600 });

  useImperativeHandle(ref, () => ({
    zoomIn: () => {
      const pos = fgRef.current?.cameraPosition();
      if (pos) fgRef.current.cameraPosition({ z: pos.z * 0.75 }, undefined, 300);
    },
    zoomOut: () => {
      const pos = fgRef.current?.cameraPosition();
      if (pos) fgRef.current.cameraPosition({ z: pos.z * 1.33 }, undefined, 300);
    },
  }), []);

  // Reheat a simulação apenas quando física passa de desligada → ligada
  const prevPhysicsRef = useRef(physicsEnabled);
  useEffect(() => {
    if (physicsEnabled && !prevPhysicsRef.current && fgRef.current) {
      fgRef.current.d3ReheatSimulation();
    }
    prevPhysicsRef.current = physicsEnabled;
  }, [physicsEnabled]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const measure = () => {
      const r = el.getBoundingClientRect();
      if (r.width > 0 && r.height > 0) setDims({ w: Math.floor(r.width), h: Math.floor(r.height) });
    };
    measure();
    const obs = new ResizeObserver(measure);
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  // BFS a partir dos nós selecionados até focusDepth graus
  const focusMatchedIds = useMemo<Set<string> | null>(() => {
    if (!focusMode || selectedNodeIds.size === 0) return null;
    const adj = new Map<string, string[]>();
    for (const e of edges) {
      if (!adj.has(e.source)) adj.set(e.source, []);
      if (!adj.has(e.target)) adj.set(e.target, []);
      adj.get(e.source)!.push(e.target);
      adj.get(e.target)!.push(e.source);
    }
    const visited = new Set<string>(selectedNodeIds);
    let frontier = [...selectedNodeIds];
    for (let d = 0; d < focusDepth; d++) {
      const next: string[] = [];
      for (const id of frontier) {
        for (const nb of adj.get(id) ?? []) {
          if (!visited.has(nb)) { visited.add(nb); next.push(nb); }
        }
      }
      frontier = next;
      if (frontier.length === 0) break;
    }
    return visited;
  }, [focusMode, selectedNodeIds, edges, focusDepth]);

  // Intersecção de matchedIds (busca) + focusMatchedIds (focus mode)
  const effectiveMatchedIds = useMemo<Set<string> | null>(() => {
    if (!focusMatchedIds && !matchedIds) return null;
    if (!focusMatchedIds) return matchedIds;
    if (!matchedIds) return focusMatchedIds;
    return new Set([...matchedIds].filter((id) => focusMatchedIds.has(id)));
  }, [matchedIds, focusMatchedIds]);

  const graphData = useMemo(() => ({
    nodes: nodes.map(({ id, label, group, dominio, tipoReal, pergunta, prioridadeRevisao }) => ({
      id, label, group, dominio, tipoReal, pergunta, prioridadeRevisao,
    })),
    links: edges.map((e) => ({ source: e.source, target: e.target, type: e.type, label: e.label, peso: e.peso })),
  }), [nodes, edges]);

  const nodeThreeObject = useCallback((node: any) => {
    const c = getNodeColors(node.id, node.group, selectedNodeIds, effectiveMatchedIds, isDark, highContrast);
    return buildNodeObj(node, c.bg, c.border, c.text);
  }, [isDark, effectiveMatchedIds, selectedNodeIds, highContrast]);

  const getLinkWidth = useCallback((link: any) => Math.min(0.6 + (link.peso ?? 1) * 0.7, 4), []);

  const getLinkSprite = useCallback((link: any) => {
    const color = getRelationColor(link.type, isDark);
    return makeLinkSprite(link.label ?? link.type, link.peso ?? 1, color);
  }, [isDark]);

  const updateLinkSpritePos = useCallback((obj: THREE.Object3D, { start, end }: { start: any; end: any }) => {
    obj.position.set((start.x + end.x) / 2, (start.y + end.y) / 2, (start.z + end.z) / 2);
  }, []);

  const getLinkColor = useCallback((link: any) => {
    const active = effectiveMatchedIds;
    if (active) {
      const s = typeof link.source === "object" ? link.source.id : link.source;
      const t = typeof link.target === "object" ? link.target.id : link.target;
      if (!active.has(s) || !active.has(t)) {
        return isDark ? "rgba(55,65,81,0.15)" : "rgba(209,213,219,0.15)";
      }
    }
    return getRelationColor(link.type, isDark) + "aa";
  }, [isDark, effectiveMatchedIds]);

  const bg = isDark ? BG_DARK : BG_LIGHT;

  return (
    <div ref={containerRef} className="absolute inset-0 overflow-hidden" style={{ background: bg }}>
      <ForceGraph3D
        ref={fgRef}
        graphData={graphData}
        width={dims.w}
        height={dims.h}
        backgroundColor={bg}
        nodeThreeObject={nodeThreeObject}
        nodeThreeObjectExtend={false}
        linkColor={getLinkColor}
        linkWidth={getLinkWidth}
        linkOpacity={0.8}
        linkThreeObject={getLinkSprite}
        linkThreeObjectExtend={true}
        linkPositionUpdate={updateLinkSpritePos}
        linkDirectionalArrowLength={4}
        linkDirectionalArrowRelPos={1}
        onNodeClick={(node: any) => onNodeClick(node as SimNode)}
        nodeLabel="label"
        d3AlphaDecay={physicsEnabled ? 0.02 : 1}
        d3VelocityDecay={0.3}
        enableNodeDrag
        enableNavigationControls
        showNavInfo={false}
      />
    </div>
  );
});
