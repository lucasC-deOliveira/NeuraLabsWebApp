// Pre-cleans raw exam text before parsing/LLM, to cut token usage and improve
// coverage within the char budget. Drops the cover/instructions (all text before
// the first question or section divider) and per-page noise (barcodes, garbled
// runs, print codes, repeated running headers/footers).

const QUESTION_MARKER = /QUEST[ÃA]O\s*\d+/i;
// Judgment exams (CEBRASPE "Certo/Errado") have no "QUESTÃO N" markers; their
// body starts at the first "-- SECTION --" divider instead (e.g. "-- PROVAS
// OBJETIVAS --"), which also ends the cover/instructions block.
const SECTION_DIVIDER = /^--\s.*--\s*$/m;
const BARCODE_LINE = /^\*[\dA-Za-z]+\*$/;
const GARBLED_LINE = /^[�\s]+$/; // lines made only of replacement chars / spaces
const PRINT_CODE_LINE = /^[0-9A-F]{10,}$/i; // per-page print codes, differ page to page
const FILLER_LINE = /^Espaço livre$/i; // scratch-space placeholder on CEBRASPE booklets
// Per-page artifacts that embed the page number, so they are never identical
// across pages and slip past the repeated-line dedup. Left in, they get glued
// onto the last alternative of each page (e.g. ENEM Q94/Q96 alt E).
const INDESIGN_FOOTER = /\.ind[bd]\s+\d/i; // "020425VE.indb   3…24/07/2025 19:04:59"
const RUNNING_HEADER = /\|\s*CADERNO\s+\d+\s*\|/i; // "… | 2º DIA | CADERNO 8 | VERDE3"
const WATERMARK_LINE = /(ENEM\d{4}){3,}/i; // tiled watermark "ENEM2025ENEM2025…"

// A line repeated verbatim this often is a running header/footer (site watermark,
// board/exam title), whatever the board. The length floor protects short legit
// repeats such as ENEM's lone alternative letters ("A".."E") and page numbers.
const REPEAT_MIN_COUNT = 3;
const REPEAT_MIN_LENGTH = 6;

/** Everything from the first question (or section divider) onward. */
function dropCover(raw: string): string {
  const at = raw.search(QUESTION_MARKER);
  if (at > 0) return raw.slice(at);
  const divider = raw.search(SECTION_DIVIDER);
  return divider > 0 ? raw.slice(divider) : raw;
}

function repeatedLines(lines: string[]): Set<string> {
  const counts = new Map<string, number>();
  for (const line of lines) {
    const t = line.trim();
    if (t.length >= REPEAT_MIN_LENGTH) counts.set(t, (counts.get(t) ?? 0) + 1);
  }
  const repeated = [...counts].filter(([, n]) => n >= REPEAT_MIN_COUNT);
  return new Set(repeated.map(([t]) => t));
}

function isNoiseLine(line: string, repeated: Set<string>): boolean {
  const t = line.trim();
  if (t === '') return false; // blank lines are collapsed later, not dropped here
  if (repeated.has(t)) return true;
  return (
    BARCODE_LINE.test(t) ||
    GARBLED_LINE.test(t) ||
    PRINT_CODE_LINE.test(t) ||
    FILLER_LINE.test(t) ||
    INDESIGN_FOOTER.test(t) ||
    RUNNING_HEADER.test(t) ||
    WATERMARK_LINE.test(t)
  );
}

/**
 * Strips exam boilerplate: the cover/instructions block plus per-page noise
 * (barcodes, garbled runs, print codes, repeated running headers/footers).
 * Collapses runs of blank lines. Pure.
 * @example cleanExamText(rawPdfText) // → só o miolo de questões
 */
export function cleanExamText(raw: string): string {
  const lines = dropCover(raw).split('\n');
  const repeated = repeatedLines(lines);
  return lines
    .filter((line) => !isNoiseLine(line, repeated))
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}
