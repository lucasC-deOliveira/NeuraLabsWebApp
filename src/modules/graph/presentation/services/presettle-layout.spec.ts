import { describe, it, expect, vi, beforeEach } from "vitest";
import { presettleLayout } from "./presettle-layout";
import { physicsStep } from "./graph-physics.service";

// A física é substituída por um fake controlável para observar quantas iterações
// o pre-settle roda em cada cenário de convergência.
vi.mock("./graph-physics.service", () => ({ physicsStep: vi.fn() }));

const options = {} as never;
const at = (x: number): { id: string; x: number; y: number }[] => [
  { id: "a", x, y: 0 },
  { id: "b", x: -x, y: 0 },
];

beforeEach(() => vi.mocked(physicsStep).mockReset());

describe("presettleLayout", () => {
  it("stops immediately when the physics returns the same reference (fully settled)", () => {
    const input = at(0);
    vi.mocked(physicsStep).mockImplementation((n) => n as never);
    expect(presettleLayout(input, [], options, 50)).toBe(input);
    expect(physicsStep).toHaveBeenCalledTimes(1);
  });

  it("stops early once the max per-frame displacement drops below the threshold", () => {
    const frames = [at(10), at(10.1)]; // 2º frame move só 0.1px (< SETTLE_EPS)
    let i = 0;
    vi.mocked(physicsStep).mockImplementation(() => frames[i++] as never);
    presettleLayout(at(0), [], options, 50);
    expect(physicsStep).toHaveBeenCalledTimes(2);
  });

  it("runs up to maxIters while the graph keeps moving above the threshold", () => {
    let x = 0;
    vi.mocked(physicsStep).mockImplementation(() => at((x += 5)) as never); // 5px/frame sempre
    presettleLayout(at(0), [], options, 7);
    expect(physicsStep).toHaveBeenCalledTimes(7);
  });
});
