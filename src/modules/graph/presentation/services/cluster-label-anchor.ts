interface ClusterPoint {
  x: number;
  y: number;
}

/** Finds the uppermost point of a quadratic segment of a cluster boundary.
 * @example topClusterArcPoint(start, control, end)
 */
export function topClusterArcPoint(start: ClusterPoint, control: ClusterPoint, end: ClusterPoint): ClusterPoint {
  const curvature = start.y - 2 * control.y + end.y;
  const t = curvature > 0 ? (start.y - control.y) / curvature : -1;
  if (t <= 0 || t >= 1) return start.y <= end.y ? start : end;
  const remaining = 1 - t;
  return {
    x: remaining ** 2 * start.x + 2 * remaining * t * control.x + t ** 2 * end.x,
    y: remaining ** 2 * start.y + 2 * remaining * t * control.y + t ** 2 * end.y,
  };
}
