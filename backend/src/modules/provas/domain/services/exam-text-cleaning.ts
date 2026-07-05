// Pre-cleans raw exam text before it goes to the LLM, to cut token usage and
// improve coverage within the char budget. Drops the cover/instructions (all
// text before the first question) and per-page noise (barcodes, garbled runs).

const QUESTION_MARKER = /QUEST[ÃA]O\s*\d+/i;
const BARCODE_LINE = /^\*[\dA-Za-z]+\*$/;
const GARBLED_LINE = /^[�\s]+$/; // lines made only of replacement chars / spaces

/** Everything from the first question onward (drops cover + instructions). */
function dropCover(raw: string): string {
  const at = raw.search(QUESTION_MARKER);
  return at > 0 ? raw.slice(at) : raw;
}

function isNoiseLine(line: string): boolean {
  const t = line.trim();
  if (t === '') return false; // blank lines are collapsed later, not dropped here
  return BARCODE_LINE.test(t) || GARBLED_LINE.test(t);
}

/**
 * Strips exam boilerplate: the cover/instructions block plus repeated page
 * barcodes and garbled runs. Collapses runs of blank lines. Pure.
 * @example cleanExamText(rawPdfText) // → só o miolo de questões
 */
export function cleanExamText(raw: string): string {
  return dropCover(raw)
    .split('\n')
    .filter((line) => !isNoiseLine(line))
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}
