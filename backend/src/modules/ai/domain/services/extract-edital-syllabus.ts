// Isolates the content program (objetos de avaliação) from a public-tender
// edital PDF text, so only the syllabus — disciplines and their numbered topics —
// is fed to the graph planner instead of the whole ~40-page notice. Deterministic:
// slices from the "CONHECIMENTOS" listing to the signature/annex and drops per-page
// noise. Pure.

// The program listing starts at the last "CONHECIMENTOS BÁSICOS" (earlier mentions
// are the grading rules) and runs through "CONHECIMENTOS ESPECÍFICOS" to the
// examiner's signature or "ANEXO".
const START = /CONHECIMENTOS\s+B[ÁA]SICOS/gi;
const END = /\n\s*ANEXO\s+[IVX0-9]|\n[A-ZÀ-Ÿ][A-ZÀ-Ÿ .]{5,}\n\s*Superintendente/;
const PAGE_NOISE = /^\s*\d{1,3}\s*$|^www\.\S+$|^pcimarkpci\b/i;

/**
 * @example extractEditalSyllabus(pdfText) // → "LÍNGUA PORTUGUESA: 1 … ENGENHARIA DE SOFTWARE: …"
 */
export function extractEditalSyllabus(text: string): string {
  const start = lastMatchIndex(text, START);
  if (start < 0) return '';
  const rest = text.slice(start);
  const end = END.exec(rest);
  const block = rest.slice(0, end ? end.index : rest.length);
  return dropNoise(block);
}

function lastMatchIndex(text: string, pattern: RegExp): number {
  let index = -1;
  for (const match of text.matchAll(pattern)) index = match.index;
  return index;
}

function dropNoise(block: string): string {
  return block
    .split('\n')
    .filter((line) => !PAGE_NOISE.test(line.trim()))
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}
