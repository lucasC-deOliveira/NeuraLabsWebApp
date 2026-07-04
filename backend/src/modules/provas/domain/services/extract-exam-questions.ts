import type { ParsedQuestao, ParsedAlternativa } from '../prova';

// Deterministic extractor for well-structured multiple-choice exams (e.g. ENEM):
// questions marked "QUESTÃO N" with five alternatives A–E. Parses them without
// the LLM (gabarito stays "?" — filled by the user). Falls back to the LLM when
// the structure isn't confidently recognized (see the use-case).

const QUESTION_MARKER = /QUEST[ÃA]O\s*(\d+)/gi;
const ALT_LETTERS = ['A', 'B', 'C', 'D', 'E'] as const;

/** Counts "QUESTÃO N" markers — used to gauge extraction confidence. */
export function countExamQuestions(text: string): number {
  return (text.match(QUESTION_MARKER) ?? []).length;
}

interface Block {
  numero: number;
  lines: string[];
}

function splitIntoBlocks(text: string): Block[] {
  const marks = [...text.matchAll(QUESTION_MARKER)].map((m) => ({ numero: Number(m[1]), start: m.index }));
  return marks.map((m, i) => {
    const end = i + 1 < marks.length ? marks[i + 1].start : text.length;
    return { numero: m.numero, lines: text.slice(m.start, end).split('\n').slice(1) };
  });
}

/** The letter if this line opens an alternative (e.g. "A ...", "B", "C) ..."). */
function markerLetter(line: string): string | null {
  return /^\s*([A-E])(?:[\s).]|$)/.exec(line)?.[1] ?? null;
}

/** Line indices of the last A→B→C→D→E run (skips stray "A " inside the stem). */
function findAlternativeRun(lines: string[]): number[] | null {
  const markers = lines.flatMap((line, idx) => {
    const letra = markerLetter(line);
    return letra ? [{ letra, idx }] : [];
  });
  for (let start = markers.length - ALT_LETTERS.length; start >= 0; start--) {
    if (ALT_LETTERS.every((want, k) => markers[start + k].letra === want)) {
      return ALT_LETTERS.map((_, k) => markers[start + k].idx);
    }
  }
  return null;
}

// pdf-parse keeps a trailing space at word wraps and omits it at mid-word breaks,
// so concatenating lines (no separator) rejoins "fe"+"nilação." → "fenilação".
function joinLines(lines: string[]): string {
  return lines.join('').replace(/\s+/g, ' ').trim();
}

function alternativeTexts(lines: string[], run: number[]): ParsedAlternativa[] {
  return run.map((idx, k) => {
    const end = k + 1 < run.length ? run[k + 1] : lines.length;
    const head = lines[idx].replace(/^\s*[A-E][\s).]?/, '');
    return { letra: ALT_LETTERS[k], texto: joinLines([head, ...lines.slice(idx + 1, end)]) };
  });
}

function toQuestao(block: Block): ParsedQuestao | null {
  const run = findAlternativeRun(block.lines);
  if (!run) return null;
  const enunciado = joinLines(block.lines.slice(0, run[0]));
  if (!enunciado) return null;
  return {
    numero: block.numero,
    enunciado,
    tipo: 'MULTIPLA_ESCOLHA',
    alternativas: alternativeTexts(block.lines, run),
    gabarito: '?',
    explicacao: null,
  };
}

/**
 * Extracts the multiple-choice questions it can confidently parse. Blocks without
 * a clean A–E run are skipped (the caller falls back to the LLM for those).
 * @example extractExamQuestions(cleanExamText(pdfText))
 */
export function extractExamQuestions(text: string): ParsedQuestao[] {
  return splitIntoBlocks(text)
    .map(toQuestao)
    .filter((q): q is ParsedQuestao => q !== null);
}
