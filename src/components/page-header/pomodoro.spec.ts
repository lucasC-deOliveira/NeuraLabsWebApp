import { describe, it, expect } from "vitest";
import {
  cycleSeconds,
  nextCycle,
  formatTime,
  tick,
  WORK_SECONDS,
  REST_SECONDS,
} from "./pomodoro";

describe("cycleSeconds", () => {
  it("gives 25 minutes of focus and 5 of rest", () => {
    expect(cycleSeconds("work")).toBe(25 * 60);
    expect(cycleSeconds("rest")).toBe(5 * 60);
  });
});

describe("nextCycle", () => {
  it("alternates focus and rest", () => {
    expect(nextCycle("work")).toBe("rest");
    expect(nextCycle("rest")).toBe("work");
  });
});

describe("formatTime", () => {
  it("formats as mm:ss with padding", () => {
    expect(formatTime(WORK_SECONDS)).toBe("25:00");
    expect(formatTime(REST_SECONDS)).toBe("05:00");
    expect(formatTime(61)).toBe("01:01");
    expect(formatTime(9)).toBe("00:09");
  });

  it("never shows negative time", () => {
    expect(formatTime(-5)).toBe("00:00");
  });

  it("floors a fractional second", () => {
    expect(formatTime(59.9)).toBe("00:59");
  });
});

describe("tick", () => {
  it("counts one second down", () => {
    expect(tick({ cycle: "work", secondsLeft: 100 })).toEqual({ cycle: "work", secondsLeft: 99 });
  });

  it("turns focus into a full rest when it runs out", () => {
    expect(tick({ cycle: "work", secondsLeft: 1 })).toEqual({
      cycle: "rest",
      secondsLeft: REST_SECONDS,
    });
  });

  it("turns rest back into a full focus", () => {
    expect(tick({ cycle: "rest", secondsLeft: 1 })).toEqual({
      cycle: "work",
      secondsLeft: WORK_SECONDS,
    });
  });

  it("never leaves a cycle stuck at zero", () => {
    expect(tick({ cycle: "work", secondsLeft: 0 }).secondsLeft).toBe(REST_SECONDS);
  });
});
