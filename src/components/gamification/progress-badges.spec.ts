import { describe, it, expect } from "vitest";
import { orderAchievements } from "./progress-badges";
import type { Achievement } from "@/lib/gamification-api";

function make(id: string, earned: boolean, target: number, progress: number): Achievement {
  return { id, title: id, description: id, earned, current: 0, target, progress };
}

describe("orderAchievements", () => {
  it("puts pending (the chase) before earned", () => {
    const out = orderAchievements([make("a", false, 3, 0.5), make("b", true, 3, 1)]);
    expect(out.map((a) => a.id)).toEqual(["a", "b"]);
  });

  it("orders earned by hardest (largest target) first", () => {
    const out = orderAchievements([make("small", true, 3, 1), make("big", true, 30, 1)]);
    expect(out.map((a) => a.id)).toEqual(["big", "small"]);
  });

  it("orders pending by closest to done first", () => {
    const out = orderAchievements([make("far", false, 10, 0.2), make("near", false, 10, 0.8)]);
    expect(out.map((a) => a.id)).toEqual(["near", "far"]);
  });
});
