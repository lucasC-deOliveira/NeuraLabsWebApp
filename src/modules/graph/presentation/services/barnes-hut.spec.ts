import { describe, it, expect } from "vitest";
import { barnesHutRepulsion, resolveMinGapGrid } from "./barnes-hut";

const GC = 6000;
const MAXF = 1200;

function run(xs: number[], ys: number[], mass: number[]): { fx: Float64Array; fy: Float64Array } {
  const n = xs.length;
  const fx = new Float64Array(n);
  const fy = new Float64Array(n);
  barnesHutRepulsion(n, Float64Array.from(xs), Float64Array.from(ys), Float64Array.from(mass), fx, fy, GC, MAXF);
  return { fx, fy };
}

describe("barnesHutRepulsion", () => {
  it("matches the exact pair force for two nodes (no approximation possible)", () => {
    const { fx, fy } = run([0, 10], [0, 0], [1, 1]);
    // node 0 is pushed away from node 1 (which is at +x): F = gc/d² = 6000/100 = 60.
    expect(fx[0]).toBeCloseTo(-60, 5);
    expect(fx[1]).toBeCloseTo(60, 5);
    expect(fy[0]).toBeCloseTo(0, 5);
  });

  it("nets to ~zero force in a symmetric configuration (center node)", () => {
    // center + 4 nodes symmetric around it → center feels no net force.
    const { fx, fy } = run([0, 100, -100, 0, 0], [0, 0, 0, 100, -100], [1, 1, 1, 1, 1]);
    expect(Math.abs(fx[0])).toBeLessThan(1e-6);
    expect(Math.abs(fy[0])).toBeLessThan(1e-6);
  });

  it("pushes a node away from a dense cluster", () => {
    // one node to the left, a cluster on the right → the lone node is pushed left (-x).
    const xs = [-300, 100, 110, 90, 105];
    const ys = [0, 0, 5, -5, 8];
    const { fx } = run(xs, ys, [1, 1, 1, 1, 1]);
    expect(fx[0]).toBeLessThan(0);
  });

  it("conserves momentum: total force is ~zero (internal repulsion)", () => {
    const n = 60;
    const xs: number[] = [];
    const ys: number[] = [];
    const mass: number[] = [];
    for (let i = 0; i < n; i++) {
      xs.push(Math.sin(i * 1.7) * 400);
      ys.push(Math.cos(i * 2.3) * 400);
      mass.push(1 + (i % 3) * 0.5);
    }
    const { fx, fy } = run(xs, ys, mass);
    let sx = 0;
    let sy = 0;
    for (let i = 0; i < n; i++) {
      sx += fx[i];
      sy += fy[i];
      expect(Number.isFinite(fx[i])).toBe(true);
    }
    // Barnes-Hut aproxima, mas a força total interna fica próxima de zero.
    const scale = n * GC;
    expect(Math.abs(sx) / scale).toBeLessThan(0.05);
    expect(Math.abs(sy) / scale).toBeLessThan(0.05);
  });

  it("does not produce NaN for coincident nodes", () => {
    const { fx, fy } = run([0, 0, 0], [0, 0, 0], [1, 1, 1]);
    for (let i = 0; i < 3; i++) {
      expect(Number.isFinite(fx[i])).toBe(true);
      expect(Number.isFinite(fy[i])).toBe(true);
    }
  });
});

describe("resolveMinGapGrid", () => {
  it("separates an overlapping pair to at least the minimum distance", () => {
    const px = Float64Array.from([0, 10]);
    const py = Float64Array.from([0, 0]);
    const radius = Float64Array.from([30, 30]);
    resolveMinGapGrid(2, px, py, radius, Float64Array.from([1, 1]), new Uint8Array([0, 0]), 10);
    const dist = Math.hypot(px[1] - px[0], py[1] - py[0]);
    expect(dist).toBeGreaterThanOrEqual(30 + 30 + 10 - 1e-6);
  });

  it("keeps a fixed node in place (the other absorbs the separation)", () => {
    const px = Float64Array.from([0, 10]);
    const py = Float64Array.from([0, 0]);
    resolveMinGapGrid(2, px, py, Float64Array.from([30, 30]), Float64Array.from([1, 1]), new Uint8Array([1, 0]), 10);
    expect(px[0]).toBe(0); // fixed node did not move
    expect(px[1]).toBeGreaterThanOrEqual(70 - 1e-6);
  });

  it("leaves non-overlapping nodes untouched", () => {
    const px = Float64Array.from([0, 500]);
    const py = Float64Array.from([0, 0]);
    resolveMinGapGrid(2, px, py, Float64Array.from([30, 30]), Float64Array.from([1, 1]), new Uint8Array([0, 0]), 10);
    expect(px[0]).toBe(0);
    expect(px[1]).toBe(500);
  });
});
