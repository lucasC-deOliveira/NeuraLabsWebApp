import { z } from "zod";

export const bookArgumentBatchRequest = z.object({
  chapter: z.string().max(250),
  text: z.string().trim().min(1).max(4500),
  priorIdeas: z.array(z.object({
    key: z.string().min(1).max(160),
    title: z.string().min(1).max(160),
    role: z.string().min(1).max(160),
  })).max(24),
});

export type BookArgumentBatchRequest = z.infer<typeof bookArgumentBatchRequest>;
