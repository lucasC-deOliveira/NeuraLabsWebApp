import { z } from "zod";

export const bookGraphSource = z.object({
  book: z.string().min(1),
  transcription: z.string().min(1),
  pages: z.string().min(1).nullable(),
  complete: z.boolean().optional(),
  consolidated: z.boolean().optional(),
});

export type BookGraphSource = z.infer<typeof bookGraphSource>;

const pageList = z.array(z.number().int().positive());
export const bookGraphIndex = z.object({
  coverage: pageList,
  imported: z.array(z.string()),
  nodes: z.record(z.string(), pageList),
  edges: z.record(z.string(), pageList),
});

export type BookGraphIndex = z.infer<typeof bookGraphIndex>;
