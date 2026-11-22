import type { BookGraphSource } from "@contracts/book-graph-source";
import type { VaultNode } from "@/lib/vault-format";
import type { BookGraphBatch } from "./book-graph-merge";
import { bookEdgeKey, bookPageNumbers } from "@/lib/book-graph-view";

interface BookCitation { book: string; transcription: string; quote: string }

/** Reads literal source references embedded in a vault node.
 * @example bookCitationLinks(node)
 */
export function bookCitationLinks(node: VaultNode): BookCitation[] {
  const body = [node.descricao, node.conteudo, node.fonte].join("\n");
  return [...body.matchAll(/#\/biblioteca\?([^()\s]+)/gu)].flatMap(([, raw]) => {
    const query = new URLSearchParams(raw);
    const book = query.get("book");
    const transcription = query.get("transcription");
    return book && transcription ? [{ book, transcription, quote: query.get("quote") ?? "" }] : [];
  });
}

/** Identifies old analysis graphs by their original source links.
 * @example inferBookGraphSource(nodes)
 */
export function inferBookGraphSource(nodes: VaultNode[]): BookGraphSource | null {
  const links = nodes.flatMap(bookCitationLinks);
  const first = links[0];
  if (!first || links.some(({ book }) => book !== first.book)) return null;
  return { book: first.book, transcription: first.transcription, pages: null };
}

/** Expands canonical page numbers from a saved recorte.
 * @example expandBookPages("2–4, 8", 12)
 */
export function expandBookPages(pages: string | null, total: number): number[] {
  return pages ? bookPageNumbers(pages, total) ?? [] : [];
}

function citationPages(node: VaultNode, source: BookGraphSource, sections: string[], limits: number[]): number[] {
  const pages = new Set<number>();
  for (const citation of bookCitationLinks(node)) {
    if (citation.book !== source.book || !citation.quote) continue;
    const matches = sections.flatMap((section, index) =>
      (!limits.length || limits.includes(index + 1)) && section.includes(citation.quote) ? [index + 1] : []);
    if (matches.length === 1) pages.add(matches[0]);
  }
  if (!pages.size && limits.length === 1) pages.add(limits[0]);
  return [...pages];
}

/** Locates legacy citations using verbatim text in the paginated transcription.
 * @example indexImportedBookGraph(nodes, source, sections)
 */
export function indexImportedBookGraph(nodes: VaultNode[], source: BookGraphSource, sections: string[]): BookGraphBatch["index"] {
  const coverage = source.complete ? sections.map((_, index) => index + 1) : expandBookPages(source.pages, sections.length);
  const cleanSections = sections.map((section) => section.replace(/\s+/gu, " "));
  const byNode = Object.fromEntries(nodes.map((node) => [node.id, citationPages(node, source, cleanSections, coverage)]));
  const edges = Object.fromEntries(nodes.flatMap((node) => importedEdgePages(node, byNode)));
  return { coverage: coverage.length ? coverage : [...new Set(Object.values(byNode).flat())], nodes: byNode, edges };
}

function importedEdgePages(node: VaultNode, byNode: Record<string, number[]>): [string, number[]][] {
  return node.relacoes.map(({ rel, alvo }) => [
    bookEdgeKey(node.id, rel, alvo), byNode[node.id].filter((page) => byNode[alvo]?.includes(page)),
  ]);
}
