import { z } from "zod";

const ids = z.array(z.string().min(1));
const choice = z.object({ letra: z.string(), texto: z.string() });
const concept = z.string().nullable();
const planItem = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("flashcard"), id: z.string(), pergunta: z.string(), resposta: z.string(), conceito: concept }),
  z.object({
    kind: z.literal("question"), id: z.string(), enunciado: z.string(), gabarito: z.string(), explicacao: concept,
    conceito: concept, alternativas: z.array(choice).nullable(),
  }),
]);

export const vaultStudyPlan = z.object({
  id: z.string().min(1), grafoIds: ids, prioridade: z.string(), metaTipo: z.enum(["TEMPO", "NOVOS"]),
  metaValor: z.number().int().positive(), dataAlvo: z.string().datetime().nullable(), ativo: z.boolean(),
  baralhoIds: ids, provaIds: ids, conceitosExcluidos: ids,
});

export const vaultPlanSession = z.object({
  sessionId: z.string(), planId: z.string(), day: z.string(), index: z.number().int().nonnegative(),
  items: z.array(planItem), answers: z.record(z.string()), reviews: z.number().int().nonnegative(),
  superseded: z.boolean().optional(),
});

export type VaultPlanSession = z.infer<typeof vaultPlanSession>;
