import { describe, it, expect } from "vitest";
import { computeGrade, isMetacognitiveGap } from "./study-grade";

describe("computeGrade", () => {
  it("returns 'again' whenever the answer was wrong, regardless of confidence", () => {
    expect(computeGrade(false, 1)).toBe("again");
    expect(computeGrade(false, 5)).toBe("again");
  });

  it("tiers a correct answer by confidence", () => {
    expect(computeGrade(true, 1)).toBe("hard");
    expect(computeGrade(true, 2)).toBe("hard");
    expect(computeGrade(true, 3)).toBe("good");
    expect(computeGrade(true, 4)).toBe("good");
    expect(computeGrade(true, 5)).toBe("easy");
  });
});

describe("isMetacognitiveGap", () => {
  it("flags confident-but-wrong", () => {
    expect(isMetacognitiveGap(false, 4)).toBe(true);
    expect(isMetacognitiveGap(false, 5)).toBe(true);
  });

  it("does not flag correct answers or low-confidence misses", () => {
    expect(isMetacognitiveGap(true, 5)).toBe(false);
    expect(isMetacognitiveGap(false, 3)).toBe(false);
  });
});
