import { z } from "zod";

const source = z.object({
  id: z.string().regex(/^[a-zA-Z0-9][a-zA-Z0-9_-]{0,159}$/),
  nome: z.string().min(1).max(220),
  tipo: z.string().min(1).max(40),
  excerpt: z.string().min(1).max(900),
});

export const vaultChatRequest = z.object({
  question: z.string().trim().min(1).max(2000),
  history: z.array(z.object({
    role: z.enum(["user", "assistant"]),
    content: z.string().max(4000),
  })).max(6),
  sources: z.array(source).min(1).max(6),
});

export const vaultChatResponse = z.object({
  answer: z.string(),
  referencedNodes: z.array(source.omit({ excerpt: true })),
});

export type VaultChatRequest = z.infer<typeof vaultChatRequest>;
export type VaultChatResponse = z.infer<typeof vaultChatResponse>;
