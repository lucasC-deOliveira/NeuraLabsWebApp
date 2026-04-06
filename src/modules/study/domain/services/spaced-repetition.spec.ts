import { describe, it, expect } from "vitest";
import {
  calculateNextInterval,
  createReviewSchedule,
  mapQualityToScore,
  type SchedulingResult,
  type InitialSchedule,
} from "./spaced-repetition";

describe("spaced-repetition (SM-2)", () => {
  describe("calculateNextInterval", () => {
    it("resets interval to 1 when quality < 3", () => {
      for (const q of [0, 1, 2]) {
        const result = calculateNextInterval(2.5, 10, q);
        expect(result.newInterval).toBe(1);
        expect(result.newStage).toBe(0);
      }
    });

    it("keeps ease unchanged when quality < 3", () => {
      const result = calculateNextInterval(2.5, 10, 1);
      expect(result.newEase).toBe(2.5);
    });

    it("sets interval to 1 on first successful review (previousInterval = 0, quality >= 3)", () => {
      const result = calculateNextInterval(2.5, 0, 4);
      expect(result.newInterval).toBe(1);
    });

    it("sets interval to 6 on second review (previousInterval = 1, quality >= 3)", () => {
      const result = calculateNextInterval(2.5, 1, 4);
      expect(result.newInterval).toBe(6);
    });

    it("increases interval based on ease for subsequent reviews", () => {
      // interval = round(previousInterval * ease) = round(6 * 2.5) = 15
      const result = calculateNextInterval(2.5, 6, 4);
      expect(result.newInterval).toBe(15);
    });

    it("adjusts ease upward for high quality", () => {
      const result = calculateNextInterval(2.5, 6, 5);
      // newEase = 2.5 + (0.1 - 0) = 2.6
      expect(result.newEase).toBeCloseTo(2.6, 5);
    });

    it("adjusts ease downward for low passing quality", () => {
      const result = calculateNextInterval(2.5, 6, 3);
      // newEase = 2.5 + (0.1 - (5-3)*(0.08 + (5-3)*0.02))
      // = 2.5 + (0.1 - 2*(0.08 + 2*0.02))
      // = 2.5 + (0.1 - 2*0.12)
      // = 2.5 + (0.1 - 0.24) = 2.36
      expect(result.newEase).toBeCloseTo(2.36, 5);
    });

    it("never drops ease below 1.3", () => {
      const result = calculateNextInterval(1.3, 6, 0);
      expect(result.newEase).toBe(1.3);
    });

    it("sets stage to 5 for established cards on success", () => {
      const result = calculateNextInterval(2.5, 6, 4);
      expect(result.newStage).toBe(5);
    });

    it("returns correct SchedulingResult structure", () => {
      const result: SchedulingResult = calculateNextInterval(2.5, 0, 4);
      expect(result).toHaveProperty("newInterval");
      expect(result).toHaveProperty("newEase");
      expect(result).toHaveProperty("newStage");
    });
  });

  describe("createReviewSchedule", () => {
    it("returns interval 1 and stage 0 for quality < 3", () => {
      const result: InitialSchedule = createReviewSchedule(2);
      expect(result.interval).toBe(1);
      expect(result.ease).toBe(2.5);
      expect(result.stage).toBe(0);
    });

    it("returns interval 1 and stage 1 for quality >= 3", () => {
      const result: InitialSchedule = createReviewSchedule(3);
      expect(result.interval).toBe(1);
      expect(result.ease).toBe(2.5);
      expect(result.stage).toBe(1);
    });

    it("uses ease 2.5 for all initial schedules", () => {
      for (const q of [0, 1, 2, 3, 4, 5]) {
        const result = createReviewSchedule(q);
        expect(result.ease).toBe(2.5);
      }
    });
  });

  describe("mapQualityToScore", () => {
    it("returns nivelConfianca when acertou is true", () => {
      expect(mapQualityToScore(true, 4)).toBe(4);
      expect(mapQualityToScore(true, 1)).toBe(1);
      expect(mapQualityToScore(true, 5)).toBe(5);
    });

    it("returns 0 when acertou is false regardless of confidence", () => {
      expect(mapQualityToScore(false, 4)).toBe(0);
      expect(mapQualityToScore(false, 1)).toBe(0);
      expect(mapQualityToScore(false, 5)).toBe(0);
    });
  });
});
