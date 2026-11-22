import type { ReaderExplanationReference, ReaderExplanationMode } from "@contracts/reader-explanation";
import type { VaultChatRequest, VaultChatResponse } from "@contracts/vault-chat";

interface BookQuestion {
  mode: ReaderExplanationMode;
  question: string;
  references: ReaderExplanationReference[];
  history: VaultChatRequest["history"];
}

const approaches: Record<ReaderExplanationMode, string> = {
  explain: "Explique em passos e conecte as ideias apresentadas.",
  simplify: "Explique em linguagem simples sem perder as distinções do texto.",
  analogy: "Crie uma analogia claramente identificada e delimite onde ela deixa de corresponder às fontes.",
  summary: "Sintetize as passagens em uma sequência coerente.",
};

/** Synthesizes a book idea using bounded evidence and returns only references verified by ID. */
export async function synthesizeBookIdea(
  input: BookQuestion, ask: (request: VaultChatRequest) => Promise<VaultChatResponse>,
): Promise<{ answer: string; references: ReaderExplanationReference[] } | null> {
  const references = input.references.slice(0, 6);
  if (!references.length) return null;
  const sources = references.map(({ page, chapter, quote }, index) => ({
    id: `book-page-${page}-${index + 1}`, nome: chapter ? `Página ${page} · ${chapter}` : `Página ${page}`,
    tipo: "PÁGINA", excerpt: quote.slice(0, 900),
  }));
  const question = `${approaches[input.mode]} Mostre como a ideia é definida, desenvolvida, aplicada ou contestada ao longo das fontes, quando houver apoio. Cite as páginas junto a cada afirmação e devolva os IDs das fontes efetivamente usadas. Se as passagens forem insuficientes, indique a lacuna.\nPedido: ${input.question}`;
  const response = await ask({ question, sources, history: input.history.slice(-6) });
  const cited = new Set(response.referencedNodes.map(({ id }) => id));
  const answer = response.answer.trim();
  if (!answer) throw new Error("Empty book synthesis. Expected an answer grounded in source passages.");
  return { answer, references: references.filter((_, index) => cited.has(sources[index].id)) };
}
