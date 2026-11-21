import { z } from "zod";
import { vaultPlanSession, vaultStudyPlan } from "./vault-study-plan";

const vaultReviewGrade = z.enum(["again", "hard", "good", "easy"]);

const vaultSchedule = z.object({
  fase: z.enum(["LEARN", "REVIEW", "RELEARN"]),
  learningStep: z.number(),
  intervalo: z.number(),
  fatorEase: z.number(),
  dificuldade: z.number(),
  proximaRevisao: z.string().datetime(),
  ultimaRevisao: z.string().datetime(),
});

const vaultCard = z.object({
  id: z.string().min(1),
  question: z.string().min(1),
  answer: z.string().min(1),
  schedule: vaultSchedule.nullable(),
  createdAt: z.string().datetime().optional(),
  type: z.string().nullable().optional(),
  concept: z.string().optional(),
  conceptTags: z.array(z.object({
    conceito: z.string(), topico: z.string(), topicoId: z.string(), assunto: z.string(), assuntoId: z.string(),
  })).optional(),
});

const vaultDeck = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  createdAt: z.string().datetime().optional(),
  origins: z.array(z.object({ grafoId: z.string(), nome: z.string() })).optional(),
  downloadedFrom: z.object({ accountId: z.string(), serverUrl: z.string() }).optional(),
  sync: z.object({ accountId: z.string(), serverUrl: z.string(), cardIds: z.array(z.string()) }).optional(),
  cards: z.array(vaultCard),
});

export const vaultLibrarySchema = z.object({
  formatVersion: z.literal(1),
  decks: z.array(vaultDeck),
  cards: z.array(vaultCard).optional(),
  syncEnabled: z.boolean().optional(),
  syncPromptEnabled: z.boolean().optional(),
  plans: z.array(vaultStudyPlan).optional(),
  planSessions: z.array(vaultPlanSession).optional(),
  reviews: z.array(z.object({
    id: z.string().min(1),
    deckId: z.string().min(1),
    cardId: z.string().min(1),
    grade: vaultReviewGrade,
    reviewedAt: z.string().datetime(),
  })),
}).strict();

export type VaultLibrary = z.infer<typeof vaultLibrarySchema>;
export type VaultDeck = z.infer<typeof vaultDeck>;
export type VaultCard = z.infer<typeof vaultCard>;

/** Creates the initial state for a vault with no local study file.
 * @example const library = emptyVaultLibrary()
 */
export function emptyVaultLibrary(): VaultLibrary {
  return { formatVersion: 1, decks: [], reviews: [] };
}
