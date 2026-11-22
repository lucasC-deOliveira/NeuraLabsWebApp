export interface ReaderPassage {
  page: number;
  excerpt: string;
}

/** Formats a local citation, e.g. formatReaderCitation("Manual.pdf", { page: 5, excerpt: "A passage." }). */
export function formatReaderCitation(name: string, passage: ReaderPassage): string {
  return `“${passage.excerpt.trim().replace(/\s+/gu, " ")}” — ${name}, página ${passage.page} do PDF.`;
}
