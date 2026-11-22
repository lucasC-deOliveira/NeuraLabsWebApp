import type { VaultChatRequest, VaultChatResponse } from "@contracts/vault-chat";
import type { ReaderExplanationMode } from "@contracts/reader-explanation";

interface PageQuestion {
  page: number;
  mode: ReaderExplanationMode;
  question: string;
  pageText: string;
  selection: string;
  history: VaultChatRequest["history"];
}

const instructions: Record<ReaderExplanationMode, string> = {
  explain: "Explique a ideia difícil passo a passo e esclareça os termos.",
  simplify: "Reescreva a ideia em linguagem simples, preservando o significado.",
  analogy: "Use uma analogia didática criada para esta resposta. Identifique-a como analogia e explique onde ela deixa de corresponder ao texto.",
  summary: "Resuma os pontos principais do texto fornecido em poucos parágrafos.",
};

function excerptWindows(content: string): string[] {
  const remainder = content.replace(/\s+/gu, " ").trim();
  return remainder.match(/.{1,860}(?:\s|$)|.{1,860}/gu)?.map((part) => part.trim()).filter(Boolean) ?? [];
}

function pageQuestionSources(input: PageQuestion): VaultChatRequest["sources"] {
  const excerpts = excerptWindows(input.pageText);
  const selection = excerptWindows(input.selection).slice(0, 2);
  const budget = 6 - selection.length;
  const pages = excerpts.length <= budget ? excerpts : Array.from({ length: budget }, (_, index) =>
    excerpts[Math.round(index * (excerpts.length - 1) / (budget - 1))]);
  return [...selection, ...pages].map((excerpt, index) => ({
    id: `page-${input.page}-${index + 1}`,
    nome: index < selection.length ? `Trecho selecionado da página ${input.page}` : `Página ${input.page}`,
    tipo: "PÁGINA",
    excerpt,
  }));
}

/** Asks the configured provider about the selected passage and its page only.
 * @example await explainBookPage(question, chatWithSources)
 */
export async function explainBookPage(input: PageQuestion, ask: (request: VaultChatRequest) => Promise<VaultChatResponse>): Promise<string | null> {
  const sources = pageQuestionSources(input);
  if (!sources.length) return null;
  const question = `${instructions[input.mode]} Quando usar um exemplo criado, deixe isso explícito. Se faltar contexto, diga o que falta.\nPedido do leitor: ${input.question.trim()}`;
  const response = await ask({ question, sources, history: input.history.slice(-6) });
  const answer = response.answer.trim();
  if (!answer) throw new Error("Empty reader explanation. Expected an answer from the configured provider.");
  return answer;
}
