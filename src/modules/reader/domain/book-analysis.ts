export interface BookEvidence {
  section: number;
  quote: string;
}

export interface BookIdea extends BookEvidence {
  key: string;
  title: string;
  thesis: boolean;
  role?: "thesis" | "argument" | "evidence" | "example" | "objection";
  chapter?: string;
}

export interface BookConnection extends BookEvidence {
  from: string;
  to: string;
  type: "IS_A" | "REFORCA" | "CONTRASTA_COM";
  kind?: "supports" | "illustrates" | "challenges";
  rationale?: string;
  chapter?: string;
}

export interface BookAnalysis {
  ideas: BookIdea[];
  connections: BookConnection[];
  study?: BookStudyItem[];
  scope?: { pages: string | null; complete?: boolean };
}

export interface BookStudyItem extends BookEvidence {
  key: string;
  kind: "note" | "flashcard";
  concept: string;
  title: string;
  body: string;
}

const relationPattern = /^(.{3,95}?)\s+(é um(?:a)?|is an?|reforça|reinforces|contrasta com|contrasts with)\s+(.{3,95})[.!?]?$/iu;
const thesisPattern = /^(?:a tese central é que|este livro defende que|argumentamos que|the central thesis is that|this book argues that|we argue that)\s+(.{12,140})$/iu;

function ideaKey(title: string): string {
  return title.normalize("NFKC").toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim();
}

function putIdea(ideas: Map<string, BookIdea>, title: string, evidence: BookEvidence, thesis = false): string {
  const key = ideaKey(title);
  if (!ideas.has(key) || (thesis && !ideas.get(key)?.thesis)) {
    ideas.set(key, { ...evidence, key, title, thesis });
  }
  return key;
}

function inspectSentence(draft: { ideas: Map<string, BookIdea>; connections: Map<string, BookConnection> }, evidence: BookEvidence): void {
  const quote = evidence.quote.replace(/[.!?]$/u, "");
  const thesis = thesisPattern.exec(quote)?.[1];
  if (thesis) {
    putIdea(draft.ideas, thesis, evidence, true);
    return;
  }
  const parts = relationPattern.exec(quote);
  if (!parts) return;
  const [, left, verb, right] = parts;
  const from = putIdea(draft.ideas, left, evidence);
  const to = putIdea(draft.ideas, right, evidence);
  if (!from || !to || from === to) return;
  const type = /contrasta|contrasts/iu.test(verb) ? "CONTRASTA_COM" : /reforça|reinforces/iu.test(verb) ? "REFORCA" : "IS_A";
  const key = `${from}:${type}:${to}`;
  if (!draft.connections.has(key)) draft.connections.set(key, { ...evidence, from, to, type });
}

function indexHeadings(ideas: Map<string, BookIdea>, sections: readonly string[]): void {
  sections.forEach((markdown, section) => {
    for (const [, headline] of markdown.matchAll(/^#{2,6} +(.{4,100})$/gmu)) {
      if (ideas.size >= 120) return;
      const title = headline.trim();
      if (title && !/^Página(?:s \d+–| )\d+$/u.test(title)) putIdea(ideas, title, { section, quote: title });
    }
  });
}

/** Extracts explicit claims with their original wording for human review.
 * @example analyzeBookSections(["Mitose é uma divisão celular."])
 */
export function analyzeBookSections(sections: readonly string[]): BookAnalysis {
  const draft = { ideas: new Map<string, BookIdea>(), connections: new Map<string, BookConnection>() };
  sections.forEach((markdown, section) => {
    const prose = markdown.replace(/^(?:#|!\[|\||\[PDF original\]).*$/gmu, "");
    for (const fragment of prose.split(/(?<=[.!?])\s+|\r?\n\s*\r?\n/u)) {
      if (draft.ideas.size >= 120) break;
      const quote = fragment.trim().replace(/\s+/gu, " ");
      if (quote.length <= 210) inspectSentence(draft, { section, quote });
    }
  });
  indexHeadings(draft.ideas, sections);
  return { ideas: [...draft.ideas.values()], connections: [...draft.connections.values()] };
}
