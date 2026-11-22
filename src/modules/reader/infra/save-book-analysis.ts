import { desktop, type VaultFile } from "@/lib/vault-bridge";
import { nodeRelPath, parseNode, serializeNode, type VaultNode } from "@/lib/vault-format";
import type { BookAnalysis, BookEvidence, BookIdea, BookStudyItem } from "../domain/book-analysis";
import { bookIdeaLabel, bookConnectionLabel } from "../domain/book-argument-labels";
import { bookGraphId, bookGraphPages, consolidateBookGraph } from "./consolidate-book-graph";
import type { BookGraphBatch } from "./book-graph-merge";
import { bookEdgeKey } from "@/lib/book-graph-view";
import { expandBookPages } from "./book-graph-provenance";

interface BookGraphSource {
  book: string;
  transcription: string;
}

function evidenceHref(source: BookGraphSource, evidence: BookEvidence): string {
  const query = new URLSearchParams({ ...source, section: String(evidence.section), quote: evidence.quote });
  return `#/biblioteca?${query}`;
}

function evidenceLine(source: BookGraphSource, evidence: BookEvidence): string {
  return `> ${evidence.quote}\n\n[Fonte no livro](${evidenceHref(source, evidence)})`;
}

function studyNode(item: BookStudyItem, id: string, conceptId: string, graphId: string, source: BookGraphSource): VaultNode {
  const base = { id, grafoId: graphId, fonte: evidenceHref(source, item) };
  if (item.kind === "note") {
    return {
      ...base, tipo: "NOTA", titulo: item.title, tipoNota: "LITERATURA",
      conteudo: `${item.body}\n\n${evidenceLine(source, item)}`,
      relacoes: [{ rel: "EXPLICA", alvo: conceptId, peso: 1 }],
    };
  }
  return {
    ...base, tipo: "FLASHCARD", pergunta: item.title, resposta: item.body,
    relacoes: [{ rel: "HERDA", alvo: conceptId, peso: 1 }],
  };
}

function bookNodeFile(node: VaultNode): VaultFile {
  return { relPath: nodeRelPath(node), content: serializeNode(node) };
}

function analysisNode(idea: BookIdea, ids: Map<string, string>, graphId: string, draft: BookAnalysis, source: BookGraphSource): VaultNode {
  const connections = draft.connections.filter(({ from, to }) => from === idea.key && ids.has(to));
  const evidence = connections.map((edge) => {
    const relation = `**${bookConnectionLabel(edge)} → ${draft.ideas.find(({ key }) => key === edge.to)?.title}**`;
    const rationale = edge.rationale ? `Motivo da relação: ${edge.rationale}\n\n` : "";
    return `${relation}\n\n${rationale}${evidenceLine(source, edge)}`;
  });
  return {
    id: ids.get(idea.key)!, grafoId: graphId, tipo: "CONCEITO", nome: idea.title,
    descricao: [idea.thesis ? "Tese do livro" : "Conceito do livro", idea.role ? `Papel no argumento: ${bookIdeaLabel(idea)}` : "",
      evidenceLine(source, idea), ...evidence].filter(Boolean).join("\n\n"),
    relacoes: connections.map(({ type, to }) => ({ rel: type, alvo: ids.get(to)!, peso: 1 })),
  };
}

/** Translates accepted ideas and citations into the existing vault graph format.
 * @example bookAnalysisFiles("g1", source, draft, () => crypto.randomUUID())
 */
export function bookAnalysisFiles(graphId: string, source: BookGraphSource, draft: BookAnalysis, nextId: () => string): VaultFile[] {
  const ids = new Map(draft.ideas.map(({ key }) => [key, nextId()]));
  const ideas = draft.ideas.map((idea) => bookNodeFile(analysisNode(idea, ids, graphId, draft, source)));
  const study = (draft.study ?? []).flatMap((item) => {
    const conceptId = ids.get(item.concept);
    return conceptId ? [bookNodeFile(studyNode(item, nextId(), conceptId, graphId, source))] : [];
  });
  return [...ideas, ...study];
}

function indexAcceptedAnalysis(nodes: VaultNode[], draft: BookAnalysis, total: number): BookGraphBatch["index"] {
  const coverage = draft.scope?.complete
    ? Array.from({ length: total }, (_, index) => index + 1) : expandBookPages(draft.scope?.pages ?? null, total);
  const ids = new Map(draft.ideas.map(({ key }, index) => [key, nodes[index].id]));
  const page = ({ section }: BookEvidence): number[] => section < total ? [section + 1] : [];
  const evidence = [...draft.ideas, ...(draft.study ?? []).filter(({ concept }) => ids.has(concept))];
  const byNode = Object.fromEntries(nodes.map((node, index) => [node.id, page(evidence[index])]));
  const edges = Object.fromEntries(draft.connections.flatMap((edge) => {
    const from = ids.get(edge.from);
    const to = ids.get(edge.to);
    return from && to ? [[bookEdgeKey(from, edge.type, to), page(edge)]] : [];
  }));
  for (const node of nodes.slice(draft.ideas.length)) {
    for (const relation of node.relacoes) edges[bookEdgeKey(node.id, relation.rel, relation.alvo)] = byNode[node.id];
  }
  return { coverage, nodes: byNode, edges };
}

/** Adds the accepted draft to the book's existing graph without replacing its preceding analyses.
 * @example await saveBookAnalysis(source, accepted)
 */
export async function saveBookAnalysis(source: BookGraphSource, draft: BookAnalysis): Promise<{ id: string }> {
  if (!draft.ideas.length) throw new Error("Missing accepted ideas. Expected a nonempty analysis.");
  const id = await bookGraphId(source.book);
  const notes = bookAnalysisFiles(id, source, draft, () => crypto.randomUUID());
  const nodes = notes.map(({ content }) => parseNode(content)!);
  const pages = await bookGraphPages(desktop.vault, source.book, source.transcription);
  const batch = { nodes, index: indexAcceptedAnalysis(nodes, draft, pages.length) };
  const result = await consolidateBookGraph(desktop.vault, source.book, { transcription: source.transcription, batch });
  if (!result) throw new Error("Missing configured vault. Expected a book graph directory.");
  return result;
}
