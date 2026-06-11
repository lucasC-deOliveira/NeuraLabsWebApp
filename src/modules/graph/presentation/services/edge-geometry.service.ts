import { getNodeShape } from "./graph-style.service";

export type NodeGeom = {
  x: number;
  y: number;
  width: number;
  height: number;
  group: string;
};

// Ponto na borda do nó na direção (dirX, dirY) a partir do centro —
// faz a aresta partir do contorno da forma, não do centro
export function boundaryPoint(node: NodeGeom, dirX: number, dirY: number) {
  const hw = node.width / 2;
  const hh = node.height / 2;
  const len = Math.hypot(dirX, dirY) || 1;
  const ux = dirX / len;
  const uy = dirY / len;

  // direção nula (nós sobrepostos): devolve o centro em vez de NaN
  if (ux === 0 && uy === 0) return { x: node.x, y: node.y };

  let r: number;
  switch (getNodeShape(node.group)) {
    // círculo é uma elipse com raios iguais — mesma equação
    case "circle":
    case "ellipse":
      r = (hw * hh) / (Math.hypot(hh * ux, hw * uy) || 1);
      break;
    default: {
      // retângulos: interseção com a borda da caixa
      const rx = Math.abs(ux) > 1e-6 ? hw / Math.abs(ux) : Infinity;
      const ry = Math.abs(uy) > 1e-6 ? hh / Math.abs(uy) : Infinity;
      r = Math.min(rx, ry);
    }
  }
  return { x: node.x + ux * r, y: node.y + uy * r };
}

export type EdgeCurve = {
  p0: { x: number; y: number };
  p2: { x: number; y: number };
  cx: number;
  cy: number;
  qx: number;
  qy: number;
  angle: number;
  // tangente unitária no fim da curva (direção da seta no nó de destino)
  endTangent: { x: number; y: number };
};

// Curva quadrática entre dois nós: pontas na borda das formas, ponto de
// controle perpendicular ao meio (14–40px), rótulo no ponto médio da curva
// com inclinação da corda, nunca de cabeça para baixo.
export function computeEdgeCurve(src: NodeGeom, tgt: NodeGeom): EdgeCurve {
  const dx = tgt.x - src.x;
  const dy = tgt.y - src.y;
  const dist = Math.hypot(dx, dy) || 1;

  const off = Math.min(40, Math.max(14, dist * 0.12));
  const cx = (src.x + tgt.x) / 2 + (-dy / dist) * off;
  const cy = (src.y + tgt.y) / 2 + (dx / dist) * off;

  const p0 = boundaryPoint(src, cx - src.x, cy - src.y);
  const p2 = boundaryPoint(tgt, cx - tgt.x, cy - tgt.y);

  // ponto médio da quadrática (t = 0.5)
  const qx = 0.25 * p0.x + 0.5 * cx + 0.25 * p2.x;
  const qy = 0.25 * p0.y + 0.5 * cy + 0.25 * p2.y;

  let angle = (Math.atan2(p2.y - p0.y, p2.x - p0.x) * 180) / Math.PI;
  if (angle > 90) angle -= 180;
  if (angle < -90) angle += 180;

  // tangente da quadrática em t=1 é a direção controle → fim
  const tx = p2.x - cx;
  const ty = p2.y - cy;
  const tl = Math.hypot(tx, ty) || 1;
  const endTangent = { x: tx / tl, y: ty / tl };

  return { p0, p2, cx, cy, qx, qy, angle, endTangent };
}
