import { z } from "zod";

export const accountStorageCategory = z.enum(["content", "study", "account", "technical"]);
const bytes = z.number().int().nonnegative().safe();

export const accountStorageUsage = z.object({
  totalBytes: bytes,
  categories: z.array(z.object({ category: accountStorageCategory, bytes })),
});
export type AccountStorageCategory = z.infer<typeof accountStorageCategory>;
export type AccountStorageUsage = z.infer<typeof accountStorageUsage>;
