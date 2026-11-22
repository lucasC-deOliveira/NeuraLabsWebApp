/** Resolves older citations after an export changes its page boundaries.
 * @example findBookCitation(["page one", "cited text"], 0, "cited text")
 */
export function findBookCitation(sections: readonly string[], index: number, quote: string | null): number {
  const preferred = Number.isInteger(index) && index >= 0 && index < sections.length ? index : 0;
  const containsQuote = (section: string): boolean => section.replace(/\s+/gu, " ").includes(quote ?? "");
  if (!quote || containsQuote(sections[preferred] ?? "")) return preferred;
  const match = sections.findIndex(containsQuote);
  return match >= 0 ? match : preferred;
}
