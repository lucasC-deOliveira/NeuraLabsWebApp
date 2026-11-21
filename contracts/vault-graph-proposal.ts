import { z } from "zod";

const id = z.string().regex(/^[a-zA-Z0-9][a-zA-Z0-9_-]{0,159}$/);
const fingerprint = z.string().regex(/^[a-f0-9]{64}$/);
const title = z.string().trim().min(1).max(180);
const body = z.string().trim().min(1).max(20_000);
const reason = z.string().trim().min(1).max(500);

const source = z.object({
  path: z.string().trim().min(1).max(500),
  locator: z.string().trim().min(1).max(180),
}).strict();

export const vaultGraphProposal = z.object({
  version: z.literal(1),
  graphId: id,
  baseRevision: fingerprint,
  summary: reason,
  sources: z.array(source).min(1).max(20),
  creates: z.array(z.object({
    id, type: z.enum(["CONCEITO", "NOTA"]), title, body,
    noteRole: z.enum(["PASSAGEIRA", "LITERATURA", "PERMANENTE", "ESTRUTURA"]).optional(),
  }).strict()).max(50).default([]),
  reuses: z.array(id).max(100).default([]),
  edits: z.array(z.object({ id, title: title.optional(), body: body.optional() })
    .strict().refine((edit) => Boolean(edit.title || edit.body))).max(50).default([]),
  relations: z.array(z.object({
    from: id, to: id, type: z.string().min(1).max(40), weight: z.number().min(0.1).max(2).default(1), reason,
  }).strict()).max(150).default([]),
}).strict().refine((proposal) => proposal.creates.length + proposal.reuses.length + proposal.edits.length + proposal.relations.length > 0);

export type VaultGraphProposal = z.infer<typeof vaultGraphProposal>;
