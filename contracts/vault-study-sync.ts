import { z } from "zod";

const key = z.string().min(1).max(160);
const time = z.string().datetime();
const review = z.object({
  id: key, sessionId: key, flashcardId: key,
  grade: z.enum(["again", "hard", "good", "easy"]),
  reviewedAt: time, startedAt: time, endedAt: time,
  responseTimeMs: z.number().int().min(0).max(2_147_483_647),
});

export const vaultStudySyncRequest = z.object({
  reviews: z.array(review).max(100),
  cards: z.array(z.object({ id: key, knownReviewedAt: time.nullable() })).max(500),
});
export type VaultStudySyncRequest = z.infer<typeof vaultStudySyncRequest>;
export type VaultStudyReview = z.infer<typeof review>;

const schedule = z.object({
  fase: z.enum(["LEARN", "REVIEW", "RELEARN"]),
  learningStep: z.number(), dificuldade: z.number(), intervalo: z.number(), fatorEase: z.number(),
  ultimaRevisao: time, proximaRevisao: time,
});
export type VaultStudySchedule = z.infer<typeof schedule>;

export const vaultStudySyncResponse = z.object({
  confirmedReviewIds: z.array(key),
  changedSchedules: z.array(z.object({ id: key, schedule })),
});
export type VaultStudySyncResponse = z.infer<typeof vaultStudySyncResponse>;
