// pdf-parse keeps a trailing space at word wraps and omits it at mid-word breaks,
// so concatenating lines (no separator) rejoins "fe"+"nilação." → "fenilação".

/**
 * Joins pdf-parse extracted lines into one whitespace-normalized string.
 * @example joinPdfLines(['fe', 'nilação.']) // → 'fenilação.'
 */
export function joinPdfLines(lines: string[]): string {
  return lines.join('').replace(/\s+/g, ' ').trim();
}
