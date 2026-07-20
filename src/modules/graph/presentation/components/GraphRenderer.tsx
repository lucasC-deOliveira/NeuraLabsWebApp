"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  getNodeColors, getNodeShape, getRelationColor, truncateLabel,
} from "@/modules/graph/presentation/services/graph-style.service";
import { computeEdgeCurve } from "@/modules/graph/presentation/services/edge-geometry.service";
import { RELATION_LABELS } from "@/modules/graph/constants/graph-ui.constants";
import { heatmapColor } from "@/modules/graph/domain/services/heatmap-color";
import { useColorTheme } from "@/components/color-theme-provider";

// ─── types ────────────────────────────────────────────────────────────────────
export type GraphTool = "select" | "marquee" | "hand";
type MarqueeRect = { x1: number; y1: number; x2: number; y2: number };

type Props = {
  nodes: any[];
  edges: any[];
  zoom: number;
  pan: { x: number; y: number };
  isDark: boolean;
  svgRef: React.RefObject<any>;
  tool: GraphTool;
  selectedNodeIds: Set<string>;
  marquee: MarqueeRect | null;
  highContrast?: boolean;
  // Colore cada nó pelo domínio (nivelDominio) em vez do tipo: o mapa de calor.
  heatmap?: boolean;
  focusMode?: boolean;
  focusDepth?: number;
  matchedIds?: Set<string> | null;
  showClusters?: boolean;
  gapBridges?: any[];
  highlightedCommunityIds?: Set<string> | null;
  onNodeClick: (node: any, additive?: boolean) => void;
  onNodeDoubleClick?: (node: any) => void;
  onNodeContextMenu?: (node: any, clientX: number, clientY: number) => void;
  onNodeDragStart: (nodeId: string, e: PointerEvent) => void;
  onPanStart: (clientX: number, clientY: number) => void;
  onMarqueeStart: (clientX: number, clientY: number, additive?: boolean) => void;
  onWheel: (e: WheelEvent) => void;
  onNodeHover: (nodeId: string | null) => void;
};

const TOOL_CURSORS: Record<GraphTool, string> = {
  select: "default", marquee: "crosshair", hand: "grab",
};

// ─── LOD thresholds ───────────────────────────────────────────────────────────
const ZOOM_DOT    = 0.18; // below: 3px dot per node (14k dots = fast)
const ZOOM_SIMPLE = 0.30; // below: filled rect/circle, no label (mesmo limiar das arestas)
const ZOOM_EDGE   = 0.30; // below: skip edges entirely
const ZOOM_BEZIER = 0.60; // below: straight line; above: full bezier + arrow
const MAX_EDGES   = 800;  // cap bezier edge draw regardless of zoom
const CULL_MARGIN = 200;  // graph-space margin around viewport

// ─── Canvas helpers ───────────────────────────────────────────────────────────
function rrect(ctx: CanvasRenderingContext2D, x:number,y:number,w:number,h:number,r:number) {
  ctx.beginPath();
  ctx.moveTo(x+r,y); ctx.arcTo(x+w,y,x+w,y+h,r); ctx.arcTo(x+w,y+h,x,y+h,r);
  ctx.arcTo(x,y+h,x,y,r); ctx.arcTo(x,y,x+w,y,r); ctx.closePath();
}

// Diamond (losango) centered at origin, spanning the node's bounding box.
function diamond(ctx: CanvasRenderingContext2D, hw:number, hh:number) {
  ctx.beginPath();
  ctx.moveTo(0,-hh); ctx.lineTo(hw,0); ctx.lineTo(0,hh); ctx.lineTo(-hw,0); ctx.closePath();
}

function isHit(n: any, gx: number, gy: number) {
  const shape = getNodeShape(n.group);
  const dx = gx-n.x, dy = gy-n.y, hw = n.width/2, hh = n.height/2;
  if (shape === "circle")  return dx*dx + dy*dy <= hw*hw;
  if (shape === "ellipse") return (dx*dx)/(hw*hw) + (dy*dy)/(hh*hh) <= 1;
  if (shape === "diamond") return Math.abs(dx)/hw + Math.abs(dy)/hh <= 1;
  return Math.abs(dx) <= hw && Math.abs(dy) <= hh;
}

// ─── Node draw (3 LOD levels) ─────────────────────────────────────────────────
function drawDot(ctx: CanvasRenderingContext2D, n: any, sel: boolean, isDark: boolean, zoom: number, hcColor: string | null) {
  const c = getNodeColors(n.group, isDark);
  ctx.fillStyle = hcColor ?? (sel ? (isDark ? "#60a5fa" : "#2563eb") : c.border);
  // BARALHO nodes: larger dot so they stand out as landmarks at low zoom
  const r = n.group === "BARALHO"
    ? Math.max(3, 8/zoom)
    : Math.max(1.5, 3/zoom);
  ctx.fillRect(n.x - r, n.y - r, r*2, r*2);
}

function drawSimple(ctx: CanvasRenderingContext2D, n: any, sel: boolean, hov: boolean, isDark: boolean, zoom: number, hcColor: string | null) {
  const c = getNodeColors(n.group, isDark);
  // HC mode: primary at ~20% for fill, 100% for border — same hue, clearly distinct.
  const borderCol = hcColor ?? (sel ? (isDark?"#60a5fa":"#2563eb") : hov ? (isDark?"#93c5fd":"#3b82f6") : c.border);
  const hw = n.width/2, hh = n.height/2;
  ctx.fillStyle = hcColor ? hcColor + "33" : c.bg;
  ctx.shadowColor  = isDark || hcColor ? borderCol + "55" : "rgba(0,0,0,0.22)";
  ctx.shadowBlur   = isDark || hcColor ? 8 : 6;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = isDark || hcColor ? 0 : 2;
  ctx.fillRect(n.x - hw, n.y - hh, n.width, n.height);
  ctx.shadowColor = "rgba(0,0,0,0)";
  ctx.strokeStyle = borderCol;
  ctx.lineWidth   = (sel ? 3.5 : hov ? 2.5 : 1.8) / zoom;
  ctx.strokeRect(n.x - hw, n.y - hh, n.width, n.height);
}

function drawFull(ctx: CanvasRenderingContext2D, n: any, sel: boolean, hov: boolean, isDark: boolean, hcColor: string | null) {
  const base = getNodeColors(n.group, isDark);
  // HC mode: primary colour at ~20% opacity for fill, 100% for border — same hue but clearly distinct.
  const c = hcColor
    ? { bg: hcColor + "33", border: hcColor, text: isDark ? "#ffffff" : "#000000" }
    : base;
  const shape = getNodeShape(n.group);
  const hw = n.width/2, hh = n.height/2;
  ctx.save(); ctx.translate(n.x, n.y);
  ctx.fillStyle   = c.bg;
  ctx.strokeStyle = sel ? (isDark?"#60a5fa":"#2563eb") : hov ? (isDark?"#93c5fd":"#3b82f6") : c.border;
  ctx.lineWidth   = sel ? 4.5 : hov ? 3.5 : 3;
  switch (shape) {
    case "circle":        ctx.beginPath(); ctx.arc(0,0,hw,0,Math.PI*2); break;
    case "ellipse":       ctx.beginPath(); ctx.ellipse(0,0,hw,hh,0,0,Math.PI*2); break;
    case "square":        rrect(ctx,-hw,-hh,hw*2,hh*2,14); break;
    case "rect-vertical": rrect(ctx,-hw,-hh,hw*2,hh*2,6);  break;
    case "diamond":       diamond(ctx, hw, hh); break;
    default:              rrect(ctx,-hw,-hh,hw*2,hh*2,8);
  }
  // Drop-shadow: glow using border colour in dark/HC mode; elevation shadow in light mode.
  ctx.shadowColor  = isDark || hcColor ? c.border + "55" : "rgba(0,0,0,0.22)";
  ctx.shadowBlur   = isDark || hcColor ? 10 : 8;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = isDark || hcColor ? 0 : 3;
  ctx.fill();
  ctx.shadowColor = "rgba(0,0,0,0)";
  ctx.stroke();
  ctx.font = "12px system-ui,-apple-system,sans-serif";
  ctx.fillStyle = c.text; ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.fillText(truncateLabel(n.label ?? "", n.group, n.width), 0, 0);
  ctx.restore();
}

// ─── Edge draw ────────────────────────────────────────────────────────────────
const AL = 9, AW = 4.5;

// ─── Cluster blob helpers ─────────────────────────────────────────────────────

function convexHull(pts: {x: number; y: number}[]): {x: number; y: number}[] {
  if (pts.length <= 2) return [...pts];
  const s = [...pts].sort((a, b) => a.x !== b.x ? a.x - b.x : a.y - b.y);
  const cross = (o: {x:number;y:number}, a: {x:number;y:number}, b: {x:number;y:number}) =>
    (a.x-o.x)*(b.y-o.y) - (a.y-o.y)*(b.x-o.x);
  const lo: {x:number;y:number}[] = [];
  for (const p of s) { while (lo.length>=2 && cross(lo[lo.length-2],lo[lo.length-1],p)<=0) lo.pop(); lo.push(p); }
  const hi: {x:number;y:number}[] = [];
  for (let i=s.length-1;i>=0;i--) { const p=s[i]; while (hi.length>=2 && cross(hi[hi.length-2],hi[hi.length-1],p)<=0) hi.pop(); hi.push(p); }
  lo.pop(); hi.pop();
  return [...lo, ...hi];
}

function drawClusterBlob(
  ctx: CanvasRenderingContext2D,
  groupNodes: any[],
  fill: string,
  stroke: string,
  zoom: number,
  pad = 52,
) {
  if (groupNodes.length === 0) return;
  const PAD = pad;

  if (groupNodes.length === 1) {
    const n = groupNodes[0];
    const r = Math.max(n.width ?? 80, n.height ?? 40) / 2 + PAD;
    ctx.beginPath();
    ctx.arc(n.x, n.y, r, 0, Math.PI * 2);
    ctx.fillStyle = fill; ctx.fill();
    ctx.strokeStyle = stroke; ctx.lineWidth = 2 / zoom;
    ctx.setLineDash([8/zoom, 5/zoom]); ctx.stroke(); ctx.setLineDash([]);
    return;
  }

  const gcx = groupNodes.reduce((a: number, n: any) => a + n.x, 0) / groupNodes.length;
  const gcy = groupNodes.reduce((a: number, n: any) => a + n.y, 0) / groupNodes.length;
  const hull = convexHull(groupNodes.map((n: any) => ({x: n.x, y: n.y})));

  const expanded = hull.map(p => {
    const node = groupNodes.find((n: any) => n.x === p.x && n.y === p.y);
    const r = node ? Math.max(node.width ?? 80, node.height ?? 40) / 2 : 40;
    const dx = p.x - gcx, dy = p.y - gcy;
    const d = Math.hypot(dx, dy) || 1;
    return { x: p.x + (dx/d)*(r+PAD), y: p.y + (dy/d)*(r+PAD) };
  });

  const cnt = expanded.length;
  const firstMid = { x:(expanded[cnt-1].x+expanded[0].x)/2, y:(expanded[cnt-1].y+expanded[0].y)/2 };
  ctx.beginPath();
  ctx.moveTo(firstMid.x, firstMid.y);
  for (let i = 0; i < cnt; i++) {
    const c = expanded[i], nx = expanded[(i+1)%cnt];
    ctx.quadraticCurveTo(c.x, c.y, (c.x+nx.x)/2, (c.y+nx.y)/2);
  }
  ctx.closePath();
  ctx.fillStyle = fill; ctx.fill();
  ctx.strokeStyle = stroke; ctx.lineWidth = 2.5 / zoom;
  ctx.setLineDash([8/zoom, 5/zoom]); ctx.stroke(); ctx.setLineDash([]);
}

function drawEdgeLine(ctx: CanvasRenderingContext2D, src: any, tgt: any, color: string, zoom: number) {
  ctx.strokeStyle = color; ctx.lineWidth = 0.8/zoom; ctx.globalAlpha = 0.45;
  ctx.beginPath(); ctx.moveTo(src.x, src.y); ctx.lineTo(tgt.x, tgt.y); ctx.stroke();
  ctx.globalAlpha = 1;
}

function drawEdgeBezier(ctx: CanvasRenderingContext2D, edge: any, nodeById: Map<string,any>, isDark: boolean, zoom: number, hcColor: string | null) {
  const src = nodeById.get(edge.source), tgt = nodeById.get(edge.target);
  if (!src || !tgt) return;
  const { p0, p2, cx, cy, qx, qy, angle, endTangent } = computeEdgeCurve(src, tgt);
  const color = hcColor ?? getRelationColor(edge.type, isDark);
  const bx = p2.x - endTangent.x*AL, by = p2.y - endTangent.y*AL;
  const px = -endTangent.y, py = endTangent.x;
  ctx.save();
  ctx.strokeStyle = color; ctx.fillStyle = color; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(p0.x,p0.y); ctx.quadraticCurveTo(cx,cy,bx,by); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(p2.x,p2.y);
  ctx.lineTo(bx+px*AW,by+py*AW); ctx.lineTo(bx-px*AW,by-py*AW);
  ctx.closePath(); ctx.fill();
  if (zoom > 0.6) {
    const label = RELATION_LABELS[edge.type] ?? "";
    if (label) {
      ctx.save();
      ctx.translate(qx,qy); ctx.rotate(angle*Math.PI/180);
      ctx.font = "9px system-ui,sans-serif"; ctx.fillStyle = color;
      ctx.textAlign = "center"; ctx.textBaseline = "alphabetic";
      ctx.fillText(label, 0, -5);
      ctx.restore();
    }
  }
  ctx.restore();
}

// ─── Component ────────────────────────────────────────────────────────────────
export function GraphRenderer({
  nodes, edges, zoom, pan, isDark, svgRef, tool,
  selectedNodeIds, marquee, highContrast = false, heatmap = false,
  focusMode = false, focusDepth = 1, matchedIds = null,
  showClusters = false,
  onNodeClick, onNodeDoubleClick, onNodeContextMenu, onNodeDragStart,
  onPanStart, onMarqueeStart, onWheel, onNodeHover,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // ── All mutable draw state in one ref ─────────────────────────────────────
  // Resolve --primary CSS var to hex. Reads directly from <html> (where themes
  // define the variable) and uses a 1×1 canvas to parse any CSS color format
  // (rgb, oklch, color(srgb ...), etc.) into sRGB — avoids regex fragility when
  // Chromium returns wide-gamut color notations instead of rgb().
  const { colorTheme } = useColorTheme();
  const primaryHex = useMemo(() => {
    const fallback = isDark ? "#e4e4e7" : "#18181b";
    try {
      const raw = getComputedStyle(document.documentElement)
        .getPropertyValue("--primary").trim();
      if (!raw) return fallback;
      const canvas = document.createElement("canvas");
      canvas.width = canvas.height = 1;
      const ctx2d = canvas.getContext("2d");
      if (!ctx2d) return fallback;
      ctx2d.fillStyle = raw;
      ctx2d.fillRect(0, 0, 1, 1);
      const [r, g, b, a] = ctx2d.getImageData(0, 0, 1, 1).data;
      if (a === 0) return fallback;
      return "#" + [r, g, b].map(v => v.toString(16).padStart(2, "0")).join("");
    } catch {
      return fallback;
    }
  }, [isDark, colorTheme]);

  // BFS from selected nodes up to focusDepth hops
  const focusBfsIds = useMemo<Set<string> | null>(() => {
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
      for (const id of frontier)
        for (const nb of adj.get(id) ?? [])
          if (!visited.has(nb)) { visited.add(nb); next.push(nb); }
      frontier = next;
    }
    return visited;
  }, [focusMode, selectedNodeIds, edges, focusDepth]);

  // Intersect BFS result with matchedIds (search), when both active
  const effectiveMatchedIds = useMemo<Set<string> | null>(() => {
    if (!focusBfsIds && !matchedIds) return null;
    if (!focusBfsIds) return matchedIds;
    if (!matchedIds) return focusBfsIds;
    return new Set([...matchedIds].filter(id => focusBfsIds.has(id)));
  }, [matchedIds, focusBfsIds]);

  const S = useRef({
    nodes, edges, zoom, pan, isDark, tool, highContrast, heatmap, primaryHex,
    showClusters,
    selectedNodeIds, marquee,
    effectiveMatchedIds: effectiveMatchedIds as Set<string> | null,
    hoveredId:   null as string | null,
    nodeById:    new Map<string, any>(),
    prevNodes:   nodes as any[],
    prevEdges:   edges as any[],
    visNodes:    [] as any[], // cached visible nodes for hit-testing
    hideEdges:   false,
    panActive:   false,
    panOffset:   { x: 0, y: 0 },
    showTimer:   0,
    canvasW:     0,
    canvasH:     0,
  });

  // Sync state refs during render (O(1) pointer assignments)
  const s = S.current;
  const nodesChanged = nodes !== s.prevNodes;
  const edgesChanged = edges !== s.prevEdges;
  if (nodesChanged) {
    s.nodeById  = new Map(nodes.map((n:any) => [n.id, n]));
    s.prevNodes = nodes;
  }
  if (edgesChanged) {
    s.prevEdges = edges;
  }
  s.nodes = nodes; s.edges = edges; s.zoom = zoom;
  // Don't overwrite pan during active bypass — hover re-renders would reset
  // S.current.pan to the stale React prop, making the graph jump mid-pan.
  if (!s.panActive) s.pan = pan;
  s.isDark = isDark; s.tool = tool; s.highContrast = highContrast; s.heatmap = heatmap; s.primaryHex = primaryHex;
  s.showClusters = showClusters;
  s.selectedNodeIds = selectedNodeIds; s.marquee = marquee;
  s.effectiveMatchedIds = effectiveMatchedIds;

  // ── Stable RAF-based draw ─────────────────────────────────────────────────
  const rafRef = useRef(0);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const {
      nodes, edges, nodeById, zoom, pan, isDark, highContrast, heatmap, primaryHex,
      showClusters,
      selectedNodeIds, hoveredId, marquee, hideEdges, effectiveMatchedIds,
      canvasW, canvasH,
    } = S.current;
    const hcColor = highContrast ? primaryHex : null;
    // Override de cor por nó: no mapa de calor cada nó vem do seu domínio; senão,
    // segue o alto-contraste (um tom só) ou a cor por tipo (null).
    const nodeOverride = (n: any): string | null =>
      heatmap ? heatmapColor(typeof n.nivelDominio === "number" ? n.nivelDominio : 0) : hcColor;

    const dpr = window.devicePixelRatio || 1;
    const w   = canvasW  || canvas.clientWidth  || 1;
    const h   = canvasH  || canvas.clientHeight || 1;

    if (canvas.width  !== Math.round(w*dpr)) canvas.width  = Math.round(w*dpr);
    if (canvas.height !== Math.round(h*dpr)) canvas.height = Math.round(h*dpr);

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);

    // Grid
    const gs = 32*zoom, ox = ((pan.x%gs)+gs)%gs, oy = ((pan.y%gs)+gs)%gs;
    ctx.strokeStyle = isDark ? "rgba(129,140,248,0.15)" : "rgba(99,102,241,0.16)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let x = ox-gs; x < w+gs; x+=gs) { ctx.moveTo(x,0); ctx.lineTo(x,h); }
    for (let y = oy-gs; y < h+gs; y+=gs) { ctx.moveTo(0,y); ctx.lineTo(w,y); }
    ctx.stroke();

    ctx.save();
    ctx.translate(pan.x, pan.y);
    ctx.scale(zoom, zoom);

    // Viewport cull
    const gL = -pan.x/zoom - CULL_MARGIN, gT = -pan.y/zoom - CULL_MARGIN;
    const gR = (w-pan.x)/zoom + CULL_MARGIN, gB = (h-pan.y)/zoom + CULL_MARGIN;
    const vis = nodes.length <= 300 ? nodes : nodes.filter((n:any) => {
      const hw=n.width/2, hh=n.height/2;
      return n.x+hw>=gL && n.x-hw<=gR && n.y+hh>=gT && n.y-hh<=gB;
    });

    // LOD: at very low zoom, FLASHCARD nodes are sub-pixel — skip them
    const drawNodes = (zoom < ZOOM_DOT && nodes.length > 1000)
      ? vis.filter((n:any) => n.group !== "FLASHCARD")
      : vis;
    S.current.visNodes = drawNodes;

    // Cluster regions — beneath edges and nodes.
    // Hierárquico: uma região por ASSUNTO (cluster principal), por TOPICO
    // (subcluster) e por CONCEITO (minicluster), aninhadas — do maior (assunto,
    // mais externo e translúcido) ao menor (conceito, mais interno e opaco).
    // Folhas (flashcard/baralho/etc.) nunca têm região própria; entram na do
    // conceito. Cai no agrupamento por TIPO se a hierarquia não foi derivada.
    if (showClusters && zoom >= ZOOM_DOT) {
      const hasHierarchy = vis.some((n) => Array.isArray(n.subtreeIds));
      if (hasHierarchy) {
        // do nível mais externo (assunto) ao mais interno (conceito)
        const LEVELS = [
          { level: 0, type: "ASSUNTO",  pad: 104, fillA: "12", strokeA: "3d" },
          { level: 1, type: "TOPICO",   pad: 68,  fillA: "1c", strokeA: "55" },
          { level: 2, type: "CONCEITO", pad: 38,  fillA: "24", strokeA: "6e" },
        ];
        for (const lv of LEVELS) {
          const groups = new Map<string, any[]>();
          for (const n of vis) {
            const sid = n.subtreeIds?.[lv.level];
            if (!sid) continue;
            if (!groups.has(sid)) groups.set(sid, []);
            groups.get(sid)!.push(n);
          }
          // Cada região é colorida pelo NÓ ESTRUTURAL que a possui (o nó cujo id é
          // o sid do subtree), não pela cor fixa do nível: folhas (flashcard/nota/
          // baralho/prova/questão) só orbitam e não definem cor; e hierarquias que
          // pulam níveis (ex.: conceito direto sob assunto) recebem a cor certa.
          for (const [sid, gNodes] of groups) {
            const ownerType = nodeById.get(sid)?.group ?? lv.type;
            const c = getNodeColors(ownerType, isDark);
            drawClusterBlob(ctx, gNodes, c.border + lv.fillA, c.border + lv.strokeA, zoom, lv.pad);
          }
        }
      } else {
        const groups = new Map<string, any[]>();
        for (const n of vis) {
          if (!n.group) continue;
          if (!groups.has(n.group)) groups.set(n.group, []);
          groups.get(n.group)!.push(n);
        }
        for (const [group, gNodes] of groups) {
          const c = getNodeColors(group, isDark);
          drawClusterBlob(ctx, gNodes, c.border + "1f", c.border + "66", zoom);
        }
      }
    }

    // Edges with LOD — never drawn during pan (hideEdges)
    if (!hideEdges && zoom >= ZOOM_EDGE) {
      const visIds = new Set<string>(vis.map((n:any) => n.id));
      const visEdges = edges.length <= 300 ? edges
        : edges.filter((e:any) => visIds.has(e.source) && visIds.has(e.target));

      if (zoom < ZOOM_BEZIER) {
        const cap = Math.min(visEdges.length, MAX_EDGES);
        for (let i = 0; i < cap; i++) {
          const e = visEdges[i];
          const src = nodeById.get(e.source), tgt = nodeById.get(e.target);
          if (!src || !tgt) continue;
          if (effectiveMatchedIds &&
              (!effectiveMatchedIds.has(e.source) || !effectiveMatchedIds.has(e.target))) continue;
          drawEdgeLine(ctx, src, tgt, hcColor ?? getRelationColor(e.type, isDark), zoom);
        }
      } else {
        const cap = Math.min(visEdges.length, MAX_EDGES);
        for (let i = 0; i < cap; i++) {
          const e = visEdges[i];
          if (effectiveMatchedIds &&
              (!effectiveMatchedIds.has(e.source) || !effectiveMatchedIds.has(e.target))) continue;
          drawEdgeBezier(ctx, e, nodeById, isDark, zoom, hcColor);
        }
      }
    }

    // Nodes
    for (const n of drawNodes) {
      const sel = selectedNodeIds.has(n.id);
      const hov = n.id === hoveredId;
      const dimNode = effectiveMatchedIds && !effectiveMatchedIds.has(n.id);
      if (dimNode) ctx.globalAlpha = 0.1;
      const nc = nodeOverride(n);
      if (zoom < ZOOM_DOT) {
        drawDot(ctx, n, sel, isDark, zoom, nc);
      } else if (zoom < ZOOM_SIMPLE) {
        drawSimple(ctx, n, sel, hov, isDark, zoom, nc);
      } else {
        drawFull(ctx, n, sel, hov, isDark, nc);
      }
      if (dimNode) ctx.globalAlpha = 1;
    }

    // Marquee
    if (marquee) {
      const mx=Math.min(marquee.x1,marquee.x2), my=Math.min(marquee.y1,marquee.y2);
      const mw=Math.abs(marquee.x2-marquee.x1), mh=Math.abs(marquee.y2-marquee.y1);
      ctx.fillStyle   = isDark?"rgba(96,165,250,0.12)":"rgba(37,99,235,0.08)";
      ctx.strokeStyle = isDark?"#60a5fa":"#2563eb";
      ctx.lineWidth   = 1.5/zoom;
      ctx.setLineDash([5/zoom,4/zoom]);
      ctx.fillRect(mx,my,mw,mh); ctx.strokeRect(mx,my,mw,mh);
      ctx.setLineDash([]);
    }

    ctx.restore();
  }, []); // stable — reads only from S.current

  const scheduleRedraw = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(draw);
  }, [draw]);

  // ── Forward canvas to svgRef ──────────────────────────────────────────────
  useEffect(() => {
    if (svgRef && canvasRef.current) {
      (svgRef as React.MutableRefObject<HTMLCanvasElement|null>).current = canvasRef.current;
    }
  });

  // ── Resize observer ───────────────────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ro = new ResizeObserver(() => {
      S.current.canvasW = canvas.clientWidth;
      S.current.canvasH = canvas.clientHeight;
      scheduleRedraw();
    });
    ro.observe(canvas);
    S.current.canvasW = canvas.clientWidth;
    S.current.canvasH = canvas.clientHeight;
    return () => ro.disconnect();
  }, [scheduleRedraw]);

  // ── Wheel ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const h = (e: WheelEvent) => { e.preventDefault(); onWheel(e); };
    canvas.addEventListener("wheel", h, { passive: false });
    return () => canvas.removeEventListener("wheel", h);
  }, [onWheel]);

  // ── Pan bypass: update S.current.pan immediately → RAF draw ──────────────
  // Eliminates React render latency (2 frames → 1 frame) during pan
  useEffect(() => {
    const onGlobalMove = (e: PointerEvent) => {
      if (!S.current.panActive) return;
      S.current.pan = {
        x: e.clientX - S.current.panOffset.x,
        y: e.clientY - S.current.panOffset.y,
      };
      S.current.hideEdges = true;
      clearTimeout(S.current.showTimer);
      S.current.showTimer = window.setTimeout(() => {
        S.current.hideEdges = false;
        scheduleRedraw();
      }, 150);
      scheduleRedraw();
    };
    const onGlobalUp = () => { S.current.panActive = false; };
    window.addEventListener("pointermove", onGlobalMove, { passive: true });
    window.addEventListener("pointerup",   onGlobalUp,   { passive: true });
    return () => {
      window.removeEventListener("pointermove", onGlobalMove);
      window.removeEventListener("pointerup",   onGlobalUp);
    };
  }, [scheduleRedraw]);

  // ── Redraw on data/visual changes ────────────────────────────────────────
  // Pan/zoom handled by bypass above; only non-pan state triggers this path
  useEffect(() => { scheduleRedraw(); }, [nodes, edges, isDark, highContrast, primaryHex, showClusters, selectedNodeIds, marquee, effectiveMatchedIds, scheduleRedraw]);
  useEffect(() => {
    // zoom change: hide edges briefly then show
    S.current.hideEdges = true;
    clearTimeout(S.current.showTimer);
    S.current.showTimer = window.setTimeout(() => {
      S.current.hideEdges = false;
      scheduleRedraw();
    }, 150);
    scheduleRedraw();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [zoom]);

  // ── Hover (throttled hit test on visible nodes only) ──────────────────────
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  useEffect(() => { S.current.hoveredId = hoveredId; scheduleRedraw(); }, [hoveredId, scheduleRedraw]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let lastCheck = 0;
    const onMove = (e: PointerEvent) => {
      if (S.current.panActive) return; // skip hover during pan — prevents re-renders that reset S.current.pan
      const now = performance.now();
      if (now - lastCheck < 16) return;
      lastCheck = now;
      const rect = canvas.getBoundingClientRect();
      const gx = (e.clientX - rect.left - S.current.pan.x) / S.current.zoom;
      const gy = (e.clientY - rect.top  - S.current.pan.y) / S.current.zoom;
      const searchNodes = S.current.visNodes.length > 0 ? S.current.visNodes : S.current.nodes;
      let hit: any = null;
      for (let i = searchNodes.length - 1; i >= 0; i--) {
        if (isHit(searchNodes[i], gx, gy)) { hit = searchNodes[i]; break; }
      }
      const id = hit?.id ?? null;
      canvas.style.cursor = hit && S.current.tool === "select"
        ? "pointer" : TOOL_CURSORS[S.current.tool as GraphTool];
      if (id !== S.current.hoveredId) {
        setHoveredId(id);
        onNodeHover(id);
      }
    };
    canvas.addEventListener("pointermove", onMove, { passive: true });
    return () => canvas.removeEventListener("pointermove", onMove);
  }, [onNodeHover]);

  // ── Pointer events ────────────────────────────────────────────────────────
  const pointerDownPos = useRef<{x:number;y:number}|null>(null);
  const didDrag = useRef(false);

  const toGraph = (clientX: number, clientY: number) => {
    const rect = canvasRef.current!.getBoundingClientRect();
    return {
      gx: (clientX - rect.left - S.current.pan.x) / S.current.zoom,
      gy: (clientY - rect.top  - S.current.pan.y) / S.current.zoom,
    };
  };

  const startDirectPan = useCallback((clientX: number, clientY: number) => {
    S.current.panActive = true;
    S.current.panOffset = { x: clientX - S.current.pan.x, y: clientY - S.current.pan.y };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="w-full h-full"
      style={{ display: "block" }}

      onPointerDown={(e) => {
        pointerDownPos.current = { x: e.clientX, y: e.clientY };
        didDrag.current = false;
        // Botão do meio = pan em qualquer ferramenta (o marquee na V tirou o
        // pan do arrasto em área vazia; o meio é a saída universal).
        if (e.button === 1 || tool === "hand") {
          startDirectPan(e.clientX, e.clientY);
          onPanStart(e.clientX, e.clientY);
          return;
        }
        if (tool === "marquee") { onMarqueeStart(e.clientX, e.clientY, e.shiftKey); return; }
        const { gx, gy } = toGraph(e.clientX, e.clientY);
        const hit = S.current.visNodes.find((n:any) => isHit(n, gx, gy))
                 ?? S.current.nodes.find((n:any) => isHit(n, gx, gy));
        if (hit) {
          (e.currentTarget as HTMLCanvasElement).setPointerCapture(e.pointerId);
          onNodeDragStart(hit.id, e.nativeEvent);
        } else {
          // Ferramenta V em área vazia: arrasto = seleção múltipla (estilo
          // Figma); Shift soma à seleção atual. Pan fica no H e no botão do meio.
          onMarqueeStart(e.clientX, e.clientY, e.shiftKey);
        }
      }}

      onPointerMove={(e) => {
        if (pointerDownPos.current) {
          const dx = e.clientX - pointerDownPos.current.x;
          const dy = e.clientY - pointerDownPos.current.y;
          if (Math.hypot(dx, dy) > 4) didDrag.current = true;
        }
      }}

      onClick={(e) => {
        if (tool !== "select" || didDrag.current) return;
        const { gx, gy } = toGraph(e.clientX, e.clientY);
        const hit = S.current.visNodes.find((n:any) => isHit(n, gx, gy))
                 ?? S.current.nodes.find((n:any) => isHit(n, gx, gy));
        hit ? onNodeClick(hit, e.ctrlKey || e.metaKey || e.shiftKey) : onNodeClick(null);
      }}

      onDoubleClick={(e) => {
        if (!onNodeDoubleClick || didDrag.current) return;
        const { gx, gy } = toGraph(e.clientX, e.clientY);
        const hit = S.current.visNodes.find((n:any) => isHit(n, gx, gy))
                 ?? S.current.nodes.find((n:any) => isHit(n, gx, gy));
        if (hit) onNodeDoubleClick(hit);
      }}

      onContextMenu={(e) => {
        e.preventDefault();
        if (!onNodeContextMenu) return;
        const { gx, gy } = toGraph(e.clientX, e.clientY);
        const hit = S.current.visNodes.find((n:any) => isHit(n, gx, gy));
        if (hit) onNodeContextMenu(hit, e.clientX, e.clientY);
      }}

      onPointerLeave={() => {
        if (S.current.hoveredId !== null) {
          setHoveredId(null);
          onNodeHover(null);
        }
      }}
    />
  );
}
