import { bookPageNumbers } from "@/lib/book-graph-view";

/** Selects numbered pages while preserving section indices in citations.
 * @example selectBookPages(sections, "1, 3-5")
 */
export function selectBookPages(sections: readonly string[], selection: string): { sections: string[]; pages: string } | null {
  const numbers = bookPageNumbers(selection, sections.length);
  if (!numbers?.length) return null;
  const selected = new Set(numbers);
  const pages = numbers.map((page, index) => {
    const starts = numbers[index - 1] !== page - 1;
    const ends = numbers[index + 1] !== page + 1;
    if (starts) return `${index ? ", " : ""}${page}`;
    return ends ? `–${page}` : "";
  }).join("");
  return { pages, sections: sections.map((section, index) => selected.has(index + 1) ? section : "") };
}

/** Determines whether the export can be addressed by individual PDF pages.
 * @example isPaginatedBook(["## Página 1\nText"])
 */
export function isPaginatedBook(sections: readonly string[]): boolean {
  return sections.length > 0 && sections.every((page, index) =>
    page.trimStart().split("\n", 1)[0].trimEnd() === `## Página ${index + 1}`);
}

/** Names a saved graph's reading context.
 * @example bookGraphContextLabel({ pages: "3–5" })
 */
export function bookGraphContextLabel(scope: { pages: string | null; complete?: boolean }): string {
  if (!scope.pages) return scope.complete ? "Livro inteiro" : "Transcrição inteira";
  return /^\d+$/u.test(scope.pages) ? `Página ${scope.pages}` : `Páginas ${scope.pages}`;
}
