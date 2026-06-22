/// <reference lib="webworker" />
/* eslint-disable @typescript-eslint/no-explicit-any */

// ── Inlined constants & helpers (workers have separate module scope) ───────────

const NODE_TYPE_SHAPES: Record<string, string> = {
  ASSUNTO: "circle", TOPICO: "ellipse", CONCEITO: "rect",
  NOTA: "rect-vertical", FLASHCARD: "square", BARALHO: "rect",
  GRAFO_REF: "rect", QUESTION: "square", PROVA: "rect",
};
function getNodeShape(type: string) { return NODE_TYPE_SHAPES[type] ?? "rect"; }

const NODE_COLORS: Record<string, any> = {
  BARALHO:    { l: { bg:"#dbeafe", bd:"#3b82f6", tx:"#1e40af" }, d: { bg:"#1e3a5f", bd:"#60a5fa", tx:"#bfdbfe" } },
  FLASHCARD:  { l: { bg:"#f0fdf4", bd:"#22c55e", tx:"#15803d" }, d: { bg:"#052e16", bd:"#4ade80", tx:"#bbf7d0" } },
  ASSUNTO:    { l: { bg:"#faf5ff", bd:"#a855f7", tx:"#7e22ce" }, d: { bg:"#2e1065", bd:"#c084fc", tx:"#e9d5ff" } },
  TOPICO:     { l: { bg:"#fff7ed", bd:"#f97316", tx:"#9a3412" }, d: { bg:"#431407", bd:"#fb923c", tx:"#fed7aa" } },
  NOTA:       { l: { bg:"#fffbeb", bd:"#f59e0b", tx:"#92400e" }, d: { bg:"#451a03", bd:"#fbbf24", tx:"#fef3c7" } },
  CONCEITO:   { l: { bg:"#fff1f2", bd:"#f43f5e", tx:"#881337" }, d: { bg:"#4c0519", bd:"#fb7185", tx:"#fecdd3" } },
  GRAFO_REF:  { l: { bg:"#f0f9ff", bd:"#0ea5e9", tx:"#0369a1" }, d: { bg:"#082f49", bd:"#38bdf8", tx:"#bae6fd" } },
  QUESTION:   { l: { bg:"#fefce8", bd:"#eab308", tx:"#713f12" }, d: { bg:"#3d2d00", bd:"#facc15", tx:"#fef9c3" } },
  PROVA:      { l: { bg:"#fff8f0", bd:"#f97316", tx:"#9a3412" }, d: { bg:"#431407", bd:"#fb923c", tx:"#fed7aa" } },
  default:    { l: { bg:"#f8fafc", bd:"#94a3b8", tx:"#334155" }, d: { bg:"#1e293b", bd:"#64748b", tx:"#cbd5e1" } },
};
function getNodeColors(type: string, dark: boolean) {
  const e = NODE_COLORS[type] ?? NODE_COLORS.default;
  return dark ? e.d : e.l;
}

const EDGE_COLORS: Record<string, { l: string; d: string }> = {
  DEFINE:{l:"#0891b2",d:"#22d3ee"}, EXPLICA:{l:"#059669",d:"#34d399"},
  APROFUNDA:{l:"#0d9488",d:"#2dd4bf"}, EXEMPLIFICA:{l:"#ea580c",d:"#fb923c"},
  CONTRASTA:{l:"#e11d48",d:"#fb7185"}, SINTETIZA:{l:"#7c3aed",d:"#a78bfa"},
  IS_A:{l:"#2563eb",d:"#60a5fa"}, PART_OF:{l:"#0284c7",d:"#38bdf8"},
  PREREQUISITO:{l:"#4f46e5",d:"#818cf8"}, HERDA:{l:"#ca8a04",d:"#facc15"},
  TESTA:{l:"#b45309",d:"#f4a72f"}, CONTEM:{l:"#c2410c",d:"#ffb877"},
  PERTENCE_A:{l:"#1d4ed8",d:"#93c5fd"}, FUNDAMENTA:{l:"#4338ca",d:"#a5b4fc"},
  RELACIONADO:{l:"#8b5cf6",d:"#ddd6fe"}, DEPENDE_DE:{l:"#6d28d9",d:"#c4b5fd"},
};
function getEdgeColor(type: string, dark: boolean) {
  const e = EDGE_COLORS[type];
  return e ? (dark ? e.d : e.l) : (dark ? "#94a3b8" : "#64748b");
}

const RELATION_LABELS: Record<string, string> = {
  GERA:"gera", REFERENCIA:"referência", DEFINE:"define", EXPLICA:"explica",
  APROFUNDA:"aprofunda", EXEMPLIFICA:"exemplifica", CONTRASTA:"contrasta",
  SINTETIZA:"sintetiza", IS_A:"é um", PART_OF:"parte de", PREREQUISITO:"pré-req",
  PERTENCE_A:"pertence a", FUNDAMENTA:"fundamenta", RELACIONADO:"relacionado",
  DEPENDE_DE:"depende de", HERDA:"herda", TESTA:"testa", CONTEM:"contém",
};

const CHAR_W = 6.6, LABEL_PAD = 12;
const SHAPE_FACTOR: Record<string, number> = { circle:0.78, ellipse:0.85, rect:1, "rect-vertical":1, square:1 };
function truncate(label: string, shape: string, width: number) {
  const max = Math.max(3, Math.floor((width * (SHAPE_FACTOR[shape]??1) - LABEL_PAD) / CHAR_W));
  return label.length <= max ? label : label.slice(0, max - 1) + "…";
}

// ── Types ─────────────────────────────────────────────────────────────────────
type SimNode = { id:string; x:number; y:number; width:number; height:number; label:string; group:string; [k:string]:any };
type SimEdge = { source:string; target:string; type:string; label?:string; peso?:number };
type MarqueeRect = { x1:number; y1:number; x2:number; y2:number };

// ── State ─────────────────────────────────────────────────────────────────────
let ctx: OffscreenCanvasRenderingContext2D | null = null;
let nodes: SimNode[]  = [];
let edges: SimEdge[]  = [];
let nodeById = new Map<string, SimNode>();
let visibleNodes: SimNode[] = [];
let pan        = { x:0, y:0 };
let zoom       = 1;
let dpr        = 1;
let isDark     = false;
let selectedIds  = new Set<string>();
let hoveredId: string | null = null;
let hideEdges  = false;
let marquee: MarqueeRect | null = null;
let canvasW    = 0;
let canvasH    = 0;
let rafPending = false;

// ── LOD thresholds ────────────────────────────────────────────────────────────
const ZOOM_DOT    = 0.18;  // below: draw only a 2-3px dot per node
const ZOOM_SIMPLE = 0.50;  // below: filled shape, no label
const ZOOM_EDGE   = 0.30;  // below: skip edges
const ZOOM_BEZIER = 0.60;  // below: simple straight lines, above: full bezier
const MAX_EDGE_DRAW = 800; // cap bezier edges regardless of zoom
const CULL_MARGIN   = 200; // graph-space pixels to add around viewport

// ── Messaging ─────────────────────────────────────────────────────────────────
self.onmessage = (e: MessageEvent) => {
  const { type, ...d } = e.data;
  switch (type) {
    case "init":
      ctx = (d.canvas as OffscreenCanvas).getContext("2d");
      break;
    case "setNodes":
      nodes    = d.nodes;
      nodeById = new Map(d.nodes.map((n: SimNode) => [n.id, n]));
      schedule();
      break;
    case "setEdges":
      edges = d.edges;
      schedule();
      break;
    case "update":
      if ("pan"        in d) pan        = d.pan;
      if ("zoom"       in d) zoom       = d.zoom;
      if ("isDark"     in d) isDark     = d.isDark;
      if ("dpr"        in d) dpr        = d.dpr;
      if ("selectedIds" in d) selectedIds = new Set(d.selectedIds);
      if ("hoveredId"  in d) hoveredId  = d.hoveredId;
      if ("hideEdges"  in d) hideEdges  = d.hideEdges;
      if ("marquee"    in d) marquee    = d.marquee;
      if ("canvasW"    in d) { canvasW = d.canvasW; if (ctx) ctx.canvas.width  = canvasW; }
      if ("canvasH"    in d) { canvasH = d.canvasH; if (ctx) ctx.canvas.height = canvasH; }
      schedule();
      break;
    case "hitTest": {
      const gx = (d.cx - pan.x) / zoom;
      const gy = (d.cy - pan.y) / zoom;
      let hit: SimNode | null = null;
      for (let i = visibleNodes.length - 1; i >= 0; i--) {
        if (isHit(visibleNodes[i], gx, gy)) { hit = visibleNodes[i]; break; }
      }
      (self as any).postMessage({ type: "hitResult", id: hit?.id ?? null });
      break;
    }
  }
};

function schedule() {
  if (rafPending) return;
  rafPending = true;
  (self as any).requestAnimationFrame(draw);
}

// ── Geometry helpers ──────────────────────────────────────────────────────────
function isHit(n: SimNode, gx: number, gy: number) {
  const shape = getNodeShape(n.group);
  const dx = gx - n.x, dy = gy - n.y, hw = n.width/2, hh = n.height/2;
  if (shape === "circle")  return dx*dx + dy*dy <= hw*hw;
  if (shape === "ellipse") return (dx*dx)/(hw*hw) + (dy*dy)/(hh*hh) <= 1;
  return Math.abs(dx) <= hw && Math.abs(dy) <= hh;
}

function boundaryPt(n: SimNode, dx: number, dy: number) {
  const hw = n.width/2, hh = n.height/2;
  const len = Math.hypot(dx, dy) || 1;
  const ux = dx/len, uy = dy/len;
  let r: number;
  const shape = getNodeShape(n.group);
  if (shape === "circle" || shape === "ellipse") {
    r = (hw*hh) / (Math.hypot(hh*ux, hw*uy) || 1);
  } else {
    r = Math.min(Math.abs(ux) > 1e-6 ? hw/Math.abs(ux) : Infinity,
                 Math.abs(uy) > 1e-6 ? hh/Math.abs(uy) : Infinity);
  }
  return { x: n.x + ux*r, y: n.y + uy*r };
}

function rrect(c: OffscreenCanvasRenderingContext2D, x:number,y:number,w:number,h:number,r:number) {
  c.beginPath();
  c.moveTo(x+r,y); c.arcTo(x+w,y,x+w,y+h,r); c.arcTo(x+w,y+h,x,y+h,r);
  c.arcTo(x,y+h,x,y,r); c.arcTo(x,y,x+w,y,r); c.closePath();
}

// ── Node rendering (3 LOD levels) ─────────────────────────────────────────────
function drawNodeDot(n: SimNode) {
  if (!ctx) return;
  const col = getNodeColors(n.group, isDark);
  ctx.fillStyle = selectedIds.has(n.id) ? (isDark ? "#60a5fa" : "#2563eb") : col.bd;
  ctx.beginPath();
  ctx.arc(n.x, n.y, Math.max(1.5, 3/zoom), 0, Math.PI*2);
  ctx.fill();
}

function drawNodeSimple(n: SimNode, selected: boolean, hovered: boolean) {
  if (!ctx) return;
  const col = getNodeColors(n.group, isDark);
  ctx.fillStyle   = col.bg;
  ctx.strokeStyle = selected ? (isDark?"#60a5fa":"#2563eb") : hovered ? (isDark?"#93c5fd":"#3b82f6") : col.bd;
  ctx.lineWidth   = (selected ? 2.5 : 1.5) / zoom;
  ctx.beginPath();
  ctx.ellipse(n.x, n.y, n.width/2, n.height/2, 0, 0, Math.PI*2);
  ctx.fill(); ctx.stroke();
}

function drawNodeFull(n: SimNode, selected: boolean, hovered: boolean) {
  if (!ctx) return;
  const col   = getNodeColors(n.group, isDark);
  const shape = getNodeShape(n.group);
  const hw = n.width/2, hh = n.height/2;
  ctx.save();
  ctx.translate(n.x, n.y);
  ctx.fillStyle   = col.bg;
  ctx.strokeStyle = selected ? (isDark?"#60a5fa":"#2563eb") : hovered ? (isDark?"#93c5fd":"#3b82f6") : col.bd;
  ctx.lineWidth   = selected ? 3.5 : hovered ? 2.5 : 2;
  switch (shape) {
    case "circle":        ctx.beginPath(); ctx.arc(0,0,hw,0,Math.PI*2); break;
    case "ellipse":       ctx.beginPath(); ctx.ellipse(0,0,hw,hh,0,0,Math.PI*2); break;
    case "square":        rrect(ctx,-hw,-hh,hw*2,hh*2,14); break;
    case "rect-vertical": rrect(ctx,-hw,-hh,hw*2,hh*2,6);  break;
    default:              rrect(ctx,-hw,-hh,hw*2,hh*2,8);
  }
  ctx.fill(); ctx.stroke();
  ctx.font         = "12px system-ui,-apple-system,sans-serif";
  ctx.fillStyle    = col.tx;
  ctx.textAlign    = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(truncate(n.label ?? "", shape, n.width), 0, 0);
  ctx.restore();
}

// ── Edge rendering (2 LOD levels) ─────────────────────────────────────────────
function drawEdgeLine(src: SimNode, tgt: SimNode, color: string) {
  if (!ctx) return;
  ctx.strokeStyle = color;
  ctx.lineWidth   = 0.8 / zoom;
  ctx.globalAlpha = 0.45;
  ctx.beginPath();
  ctx.moveTo(src.x, src.y);
  ctx.lineTo(tgt.x, tgt.y);
  ctx.stroke();
  ctx.globalAlpha = 1;
}

const AL = 9, AW = 4.5;
function drawEdgeBezier(edge: SimEdge) {
  if (!ctx) return;
  const src = nodeById.get(edge.source);
  const tgt = nodeById.get(edge.target);
  if (!src || !tgt) return;

  const dx = tgt.x-src.x, dy = tgt.y-src.y, dist = Math.hypot(dx,dy)||1;
  const off = Math.min(40, Math.max(14, dist*0.12));
  const cx  = (src.x+tgt.x)/2 + (-dy/dist)*off;
  const cy  = (src.y+tgt.y)/2 + (dx/dist)*off;

  const p0 = boundaryPt(src, cx-src.x, cy-src.y);
  const p2 = boundaryPt(tgt, cx-tgt.x, cy-tgt.y);
  const tx  = p2.x-cx, ty = p2.y-cy, tl = Math.hypot(tx,ty)||1;
  const etx = tx/tl, ety = ty/tl;
  const bx = p2.x - etx*AL, by = p2.y - ety*AL;
  const px  = -ety, py  = etx;

  const color = getEdgeColor(edge.type, isDark);
  ctx.save();
  ctx.strokeStyle = color; ctx.fillStyle = color; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(p0.x,p0.y); ctx.quadraticCurveTo(cx,cy,bx,by); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(p2.x,p2.y);
  ctx.lineTo(bx+px*AW,by+py*AW); ctx.lineTo(bx-px*AW,by-py*AW);
  ctx.closePath(); ctx.fill();

  if (zoom > 0.6) {
    const qx = 0.25*p0.x+0.5*cx+0.25*p2.x, qy = 0.25*p0.y+0.5*cy+0.25*p2.y;
    let angle = Math.atan2(p2.y-p0.y, p2.x-p0.x)*180/Math.PI;
    if (angle>90) angle-=180; if (angle<-90) angle+=180;
    const label = RELATION_LABELS[edge.type] ?? "";
    if (label) {
      ctx.save();
      ctx.translate(qx,qy); ctx.rotate(angle*Math.PI/180);
      ctx.font = "9px system-ui,sans-serif"; ctx.textAlign = "center";
      ctx.textBaseline = "alphabetic"; ctx.fillText(label,0,-5);
      ctx.restore();
    }
  }
  ctx.restore();
}

// ── Main draw ─────────────────────────────────────────────────────────────────
function draw() {
  rafPending = false;
  if (!ctx || canvasW === 0 || canvasH === 0) return;

  // Resize physical canvas if needed
  if (ctx.canvas.width !== canvasW) ctx.canvas.width  = canvasW;
  if (ctx.canvas.height !== canvasH) ctx.canvas.height = canvasH;

  const w = canvasW / dpr, h = canvasH / dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, w, h);

  // Background grid
  const gs = 32 * zoom;
  const ox = ((pan.x%gs)+gs)%gs, oy = ((pan.y%gs)+gs)%gs;
  ctx.strokeStyle = isDark ? "rgba(129,140,248,0.15)" : "rgba(99,102,241,0.16)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let x = ox-gs; x < w+gs; x+=gs) { ctx.moveTo(x,0); ctx.lineTo(x,h); }
  for (let y = oy-gs; y < h+gs; y+=gs) { ctx.moveTo(0,y); ctx.lineTo(w,y); }
  ctx.stroke();

  ctx.save();
  ctx.translate(pan.x, pan.y);
  ctx.scale(zoom, zoom);

  // ── Viewport culling ──────────────────────────────────────────────────────
  const gL = -pan.x/zoom - CULL_MARGIN, gT = -pan.y/zoom - CULL_MARGIN;
  const gR = (w-pan.x)/zoom + CULL_MARGIN, gB = (h-pan.y)/zoom + CULL_MARGIN;
  const vis = nodes.length <= 200 ? nodes : nodes.filter(n => {
    const hw = n.width/2, hh = n.height/2;
    return n.x+hw >= gL && n.x-hw <= gR && n.y+hh >= gT && n.y-hh <= gB;
  });

  // LOD: at very low zoom, skip FLASHCARD nodes (draw only structural nodes)
  // They cluster so tightly at low zoom they're invisible anyway
  const useLOD = zoom < ZOOM_DOT && nodes.length > 1000;
  const drawNodes = useLOD ? vis.filter(n => n.group !== "FLASHCARD") : vis;

  visibleNodes = drawNodes; // for hit testing

  // ── Edges ────────────────────────────────────────────────────────────────
  if (!hideEdges && zoom >= ZOOM_EDGE) {
    const visIds = new Set<string>(vis.map(n => n.id));
    const visEdges = edges.filter(e => visIds.has(e.source) && visIds.has(e.target));

    if (zoom < ZOOM_BEZIER) {
      // Simple lines — fast, no arrows
      const cap = Math.min(visEdges.length, MAX_EDGE_DRAW);
      for (let i = 0; i < cap; i++) {
        const e = visEdges[i];
        const s = nodeById.get(e.source), t = nodeById.get(e.target);
        if (s && t) drawEdgeLine(s, t, getEdgeColor(e.type, isDark));
      }
    } else {
      // Full bezier — capped to avoid runaway cost
      const cap = Math.min(visEdges.length, MAX_EDGE_DRAW);
      for (let i = 0; i < cap; i++) drawEdgeBezier(visEdges[i]);
    }
  }

  // ── Nodes ────────────────────────────────────────────────────────────────
  for (const n of drawNodes) {
    const sel = selectedIds.has(n.id);
    const hov = n.id === hoveredId;
    if (zoom < ZOOM_DOT) {
      drawNodeDot(n);
    } else if (zoom < ZOOM_SIMPLE) {
      drawNodeSimple(n, sel, hov);
    } else {
      drawNodeFull(n, sel, hov);
    }
  }

  // ── Marquee ───────────────────────────────────────────────────────────────
  if (marquee) {
    const mx = Math.min(marquee.x1,marquee.x2), my = Math.min(marquee.y1,marquee.y2);
    const mw = Math.abs(marquee.x2-marquee.x1), mh = Math.abs(marquee.y2-marquee.y1);
    ctx.fillStyle   = isDark ? "rgba(96,165,250,0.12)" : "rgba(37,99,235,0.08)";
    ctx.strokeStyle = isDark ? "#60a5fa" : "#2563eb";
    ctx.lineWidth   = 1.5/zoom;
    ctx.setLineDash([5/zoom,4/zoom]);
    ctx.fillRect(mx,my,mw,mh); ctx.strokeRect(mx,my,mw,mh);
    ctx.setLineDash([]);
  }

  ctx.restore();
}
