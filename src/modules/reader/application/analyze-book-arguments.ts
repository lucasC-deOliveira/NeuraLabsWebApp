import { z } from "zod";
import type { BookArgumentBatchRequest } from "@contracts/book-arguments";
import type { BookAnalysis, BookConnection, BookIdea, BookStudyItem } from "../domain/book-analysis";
import { bookArgumentPassages, type ArgumentPassage } from "../domain/book-argument-passages";

const quote = z.string().trim().min(20).max(250);
const modelIdea = z.object({
  id: z.string().min(1).max(80), title: z.string().trim().min(1).max(145), quote,
  role: z.enum(["thesis", "argument", "evidence", "example", "objection"]),
});
const modelConnection = z.object({
  from: z.string().min(1).max(160), to: z.string().min(1).max(160), quote,
  rationale: z.string().trim().min(8).max(320), kind: z.enum(["supports", "illustrates", "challenges"]),
});
const modelStudy = z.object({
  kind: z.enum(["note", "flashcard"]), concept: z.string().min(1).max(160), quote,
  title: z.string().trim().min(1).max(145), body: z.string().trim().min(1).max(1000),
});
const batchResult = z.object({
  ideas: z.array(z.unknown()).max(6), connections: z.array(z.unknown()).max(8),
  study: z.array(z.unknown()).max(8).default([]),
});

type ModelBatch = z.infer<typeof batchResult>;
type ModelIdea = z.infer<typeof modelIdea>;
type ModelConnection = z.infer<typeof modelConnection>;
type ArgumentDraft = { ideas: Map<string, BookIdea>; connections: Map<string, BookConnection>; study: Map<string, BookStudyItem> };
type AnalyzePassage = (batch: BookArgumentBatchRequest) => Promise<unknown>;
export type BookArgumentProgress =
  | { phase: "generating" | "checking"; completed: number; total: number; chapter: string }
  | { phase: "review"; completed: number; total: number; chapter: string };
type ReportPassage = (progress: BookArgumentProgress) => void;

function normalize(text: string): string {
  return text.replace(/\s+/gu, " ").trim();
}

function sameBookIdea(idea: BookIdea, title: string): boolean {
  return idea.title.normalize("NFKC").toLowerCase() === title.normalize("NFKC").toLowerCase();
}

function registerIdea(draft: ArgumentDraft, idea: ModelIdea, passage: ArgumentPassage): string | null {
  const quote = normalize(idea.quote);
  if (!passage.text.includes(quote)) return null;
  const title = normalize(idea.title);
  const existing = [...draft.ideas.values()].find((entry) => sameBookIdea(entry, title));
  if (existing) return existing.key;
  const key = `idea-${draft.ideas.size + 1}`;
  draft.ideas.set(key, { key, title, quote, section: passage.section, chapter: passage.chapter, role: idea.role, thesis: idea.role === "thesis" });
  return key;
}

function registerConnection(draft: ArgumentDraft, edge: ModelConnection, passage: ArgumentPassage, aliases: Map<string, string>): void {
  const from = aliases.get(edge.from);
  const to = aliases.get(edge.to);
  const quote = normalize(edge.quote);
  if (!from || !to || from === to || !passage.text.includes(quote)) return;
  const type = edge.kind === "challenges" ? "CONTRASTA_COM" : "REFORCA";
  const key = `${from}:${type}:${to}`;
  if (draft.connections.has(key)) return;
  draft.connections.set(key, { from, to, type, kind: edge.kind, rationale: normalize(edge.rationale), quote, section: passage.section, chapter: passage.chapter });
}

function mergeArgumentPassage(draft: ArgumentDraft, batch: ModelBatch, passage: ArgumentPassage, prior: BookArgumentBatchRequest["priorIdeas"]): void {
  const aliases = new Map(prior.map(({ key }) => [key, key]));
  for (const item of batch.ideas) {
    const idea = modelIdea.safeParse(item);
    if (!idea.success || aliases.has(idea.data.id)) continue;
    const key = registerIdea(draft, idea.data, passage);
    if (key) aliases.set(idea.data.id, key);
  }
  for (const item of batch.connections) {
    const edge = modelConnection.safeParse(item);
    if (edge.success) registerConnection(draft, edge.data, passage, aliases);
  }
  for (const item of batch.study) registerStudyItem(draft, item, passage, aliases);
}

function registerStudyItem(draft: ArgumentDraft, item: unknown, passage: ArgumentPassage, aliases: Map<string, string>): void {
  const parsed = modelStudy.safeParse(item);
  if (!parsed.success) return;
  const { kind, title, body, concept: alias, quote } = parsed.data;
  const concept = aliases.get(alias);
  const literal = normalize(quote);
  if (!concept || !passage.text.includes(literal)) return;
  const key = `study:${kind}:${concept}:${normalize(title).toLowerCase()}`;
  if (!draft.study.has(key)) draft.study.set(key, { key, kind, concept, title: normalize(title), body, quote: literal, section: passage.section });
}

function priorBookIdeas(draft: ArgumentDraft): BookArgumentBatchRequest["priorIdeas"] {
  const ideas = [...draft.ideas.values()];
  const theses = ideas.filter(({ thesis }) => thesis).slice(0, 8);
  const recent = ideas.filter(({ thesis }) => !thesis).slice(-(24 - theses.length));
  return [...theses, ...recent].map(({ key, title, role }) => ({ key, title, role: role ?? "argument" }));
}

/** Builds a reviewable argument map from source-verified passages.
 * @example await analyzeBookArguments(sections, analyzeLocalPassage, reportProgress, signal)
 */
export async function analyzeBookArguments(
  sections: readonly string[], analyzePassage: AnalyzePassage, report: ReportPassage, signal: AbortSignal,
): Promise<BookAnalysis> {
  const passages = bookArgumentPassages(sections);
  const draft: ArgumentDraft = { ideas: new Map(), connections: new Map(), study: new Map() };
  for (const [index, passage] of passages.entries()) {
    signal.throwIfAborted();
    const progress = { completed: index, total: passages.length, chapter: passage.chapter };
    report({ ...progress, phase: "generating" });
    const priorIdeas = priorBookIdeas(draft);
    const raw = await analyzePassage({ chapter: passage.chapter, text: passage.text, priorIdeas });
    signal.throwIfAborted();
    report({ ...progress, phase: "checking" });
    mergeArgumentPassage(draft, batchResult.parse(raw), passage, priorIdeas);
  }
  report({ completed: passages.length, total: passages.length, chapter: "", phase: "review" });
  return { ideas: [...draft.ideas.values()], connections: [...draft.connections.values()], study: [...draft.study.values()] };
}
