import type { ReaderPassage } from "../domain/reader-citation";

interface ReaderPageSource {
  pageCount: number;
  readPageText(page: number): Promise<string>;
}

function searchable(text: string): string {
  return text.normalize("NFD").replace(/\p{M}/gu, "").toLocaleLowerCase("pt-BR");
}

function matchPage(query: string, text: string, page: number): ReaderPassage | null {
  const clean = text.trim().replace(/\s+/gu, " ");
  const index = searchable(clean).indexOf(query);
  if (index < 0) return null;
  const start = Math.max(0, index - 55);
  const end = Math.min(clean.length, index + query.length + 85);
  return { page, excerpt: `${start > 0 ? "…" : ""}${clean.slice(start, end)}${end < clean.length ? "…" : ""}` };
}

/** Finds an exact phrase across local pages, e.g. searchReaderPages(book, "concordância", signal). */
export async function searchReaderPages(source: ReaderPageSource, phrase: string, signal: AbortSignal): Promise<ReaderPassage[]> {
  const query = searchable(phrase.trim().replace(/\s+/gu, " "));
  if (!query) return [];
  const passages: ReaderPassage[] = [];
  for (let page = 1; page <= source.pageCount && passages.length < 30; page++) {
    signal.throwIfAborted();
    const passage = matchPage(query, await source.readPageText(page), page);
    if (passage) passages.push(passage);
  }
  signal.throwIfAborted();
  return passages;
}
