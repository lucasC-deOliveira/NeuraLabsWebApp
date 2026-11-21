import { createHash } from "node:crypto";
import { lstatSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { z } from "zod";
import { emptyVaultLibrary, vaultLibrarySchema, type VaultCard } from "../src/modules/study/domain/vault-library";

const text = z.string().trim().min(1);
const flashcardProposal = z.object({
  version: z.literal(1),
  noteId: z.string().uuid(),
  target: z.union([
    z.object({ existingDeckId: text }).strict(),
    z.object({ newDeckId: z.string().uuid(), title: text }).strict(),
  ]),
  cards: z.array(z.object({
    id: z.string().uuid(),
    question: text,
    answer: text,
    type: z.enum(["pergunta_resposta", "cloze", "comparacao", "aplicacao_problema", "erro_comum"]),
    conceptId: z.string().uuid(),
    evidence: text,
  }).strict()).min(1).max(15),
}).strict();

const normalize = (question: string): string =>
  question.normalize("NFKC").toLocaleLowerCase("pt-BR").replace(/[^\p{L}\p{N}]+/gu, " ").trim();

/** Gets one canonical Markdown node, e.g. readFlashcardSource(vault, noteId, "NOTA"). */
export function readFlashcardSource(root: string, id: string, type: "NOTA" | "CONCEITO"): string {
  const resources = join(root, "Resources");
  const file = join(resources, `${z.string().uuid().parse(id)}.md`);
  if (!lstatSync(resources).isDirectory() || !lstatSync(file).isFile()) throw new Error(`Invalid source "${file}". Expected a regular Markdown file.`);
  const source = readFileSync(file, "utf8");
  const header = /^---\r?\n([\s\S]*?)\r?\n---\r?\n/u.exec(source)?.[1]?.split(/\r?\n/u) ?? [];
  if (!header.includes(`id: ${id}`) || !header.includes(`tipo: ${type}`)) throw new Error(`Invalid node "${id}". Expected canonical ${type} Markdown.`);
  return source;
}

function stageCard(candidate: z.infer<typeof flashcardProposal>["cards"][number], note: string, conceptSource: string): VaultCard {
  const concept = /^titulo: (.+)$/mu.exec(conceptSource)?.[1]?.replace(/^"(.*)"$/u, "$1");
  if (!concept || !note.includes(`[[${candidate.conceptId}|`)) throw new Error(`Invalid concept "${candidate.conceptId}". Expected a titled concept linked by the note.`);
  if (!note.includes(candidate.evidence)) throw new Error(`Invalid evidence for card "${candidate.id}". Expected an exact excerpt from the note.`);
  const { id, question, answer, type } = candidate;
  return { id, question, answer, type, concept, schedule: null };
}

/** Plans an append against a study snapshot, e.g. planFlashcards(snapshot, draft, readNode). */
export function planFlashcards(serialized: string | null, input: unknown, readNode: (id: string, type: "NOTA" | "CONCEITO") => string) {
  const proposal = flashcardProposal.parse(input);
  const library = serialized === null ? emptyVaultLibrary() : vaultLibrarySchema.parse(JSON.parse(serialized));
  const target = proposal.target;
  const deckId = "existingDeckId" in target ? target.existingDeckId : target.newDeckId;
  const existing = library.decks.find((deck) => deck.id === deckId);
  if (Boolean(existing) !== ("existingDeckId" in target)) throw new Error(`Invalid deck "${deckId}". Expected an existing destination or an unused new ID.`);
  const deck = existing ?? { id: deckId, title: "title" in target ? target.title : "", cards: [] };
  const note = readNode(proposal.noteId, "NOTA");
  const concepts = new Map([...new Set(proposal.cards.map((card) => card.conceptId))].map((id) => [id, readNode(id, "CONCEITO")]));
  const cards = proposal.cards.map((card) => stageCard(card, note, concepts.get(card.conceptId) ?? ""));
  validateCardAppend(library, deck.cards, cards);
  const nextDeck = { ...deck, cards: [...deck.cards, ...cards] };
  const decks = existing ? library.decks.map((entry) => entry.id === deckId ? nextDeck : entry) : [...library.decks, nextDeck];
  const next = JSON.stringify(vaultLibrarySchema.parse({ ...library, decks }), null, 2) + "\n";
  const confirmation = createHash("sha256").update(JSON.stringify([serialized, proposal, note, [...concepts]])).digest("hex");
  return { next, preview: { deckId, title: deck.title, newDeck: !existing, noteId: proposal.noteId, cards: proposal.cards, confirmation } };
}

function validateCardAppend(library: ReturnType<typeof emptyVaultLibrary>, destination: VaultCard[], cards: VaultCard[]): void {
  const ids = new Set([...library.decks.flatMap((deck) => deck.cards), ...(library.cards ?? [])].map((card) => card.id));
  const questions = new Set(destination.map((card) => normalize(card.question)));
  for (const card of cards) {
    const question = normalize(card.question);
    if (ids.has(card.id) || !question || questions.has(question)) {
      throw new Error(`Duplicate or invalid card "${card.id}". Expected a new ID and a distinct question in this deck.`);
    }
    ids.add(card.id);
    questions.add(question);
  }
}
