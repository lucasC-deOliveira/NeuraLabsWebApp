export interface VaultChatDocument {
  id: string;
  graphId: string | null;
  nome: string;
  tipo: string;
  noteRole?: string;
  body: string;
  linkedIds: string[];
}

export interface VaultChatMatch {
  id: string;
  graphId: string | null;
  nome: string;
  tipo: string;
  excerpt: string;
}

export type VaultChatFilter = "all" | "NOTA" | "CONCEITO" | "FLASHCARD" | "QUESTION" | "PROVA"
  | "PASSAGEIRA" | "LITERATURA" | "PERMANENTE" | "ESTRUTURA";

const stopWords = new Set([
  "aquela", "aquele", "como", "com", "das", "dos", "ela", "ele", "essa", "esse", "esta", "este",
  "isso", "mais", "meu", "minha", "nas", "nos", "onde", "para", "pela", "pelo", "por",
  "porque", "qual", "quais", "que", "quem", "sao", "ser", "seu", "sua", "tem", "uma", "uns", "sobre",
  "explique", "diga", "mostre", "voce", "foi", "eram", "entre",
]);

function searchWords(value: string): string[] {
  return value.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase().match(/[\p{L}\p{N}]{2,}/gu) ?? [];
}

function matchWords(value: string, terms: string[]): number {
  const words = new Set(searchWords(value));
  return terms.filter((term) => words.has(term)).length;
}

function bestExcerpt(body: string, terms: string[]): { excerpt: string; score: number } {
  const windows = body.trim().match(/[\s\S]{1,850}(?=\s|$)|[\s\S]{1,850}/g) ?? [];
  let best = { excerpt: "", score: -1 };
  for (const window of windows) {
    const score = matchWords(window, terms);
    if (score > best.score) best = { excerpt: window.trim(), score };
  }
  return best;
}

function rankVaultDocument(doc: VaultChatDocument, terms: string[]): { match: VaultChatMatch; score: number } {
  const { excerpt, score } = bestExcerpt(doc.body, terms);
  const { id, graphId, nome, tipo } = doc;
  return {
    match: { id, graphId, nome: nome.slice(0, 220), tipo, excerpt: excerpt || nome.slice(0, 220) },
    score: matchWords(nome, terms) * 3 + Math.max(0, score),
  };
}

function relatedMatches(direct: VaultChatMatch[], documents: Map<string, VaultChatDocument>, terms: string[]): VaultChatMatch[] {
  const selected = new Set(direct.map(({ id }) => id));
  const links = new Set(direct.slice(0, 3).flatMap(({ id }) => documents.get(id)?.linkedIds ?? []));
  return [...links].filter((id) => !selected.has(id) && documents.has(id)).slice(0, 2)
    .map((id) => rankVaultDocument(documents.get(id)!, terms).match);
}

/** Selects direct lexical matches and follows one hop through links in scope.
 * @example const sources = searchVaultChat(documents, "O que é mitose?", "PERMANENTE")
 */
export function searchVaultChat(documents: VaultChatDocument[], question: string, filter: VaultChatFilter): VaultChatMatch[] {
  const terms = [...new Set(searchWords(question).filter((word) => !stopWords.has(word)))].slice(0, 40);
  if (!terms.length) return [];
  const available = new Map(documents.filter((doc) => filter === "all" || doc.tipo === filter || doc.noteRole === filter)
    .map((doc) => [doc.id, doc]));
  const direct = [...available.values()].map((doc) => rankVaultDocument(doc, terms))
    .filter(({ score }) => score > 0).sort((a, b) => b.score - a.score || a.match.id.localeCompare(b.match.id))
    .slice(0, 4).map(({ match }) => match);
  return [...direct, ...relatedMatches(direct, available, terms)];
}
