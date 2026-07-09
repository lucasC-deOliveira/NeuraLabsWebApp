import type { ParsedQuestao, ParsedAlternativa } from '../prova';
import { joinPdfLines } from './join-pdf-lines';

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

interface BlockBounds {
  numero: number;
  start: number;
  end: number;
}

function blockBounds(text: string): BlockBounds[] {
  const marks = [...text.matchAll(QUESTION_MARKER)].map((m) => ({
    numero: Number(m[1]),
    start: m.index,
  }));
  return marks.map((m, i) => ({
    numero: m.numero,
    start: m.start,
    end: i + 1 < marks.length ? marks[i + 1].start : text.length,
  }));
}

function splitIntoBlocks(text: string): Block[] {
  return blockBounds(text).map((b) => ({
    numero: b.numero,
    lines: text.slice(b.start, b.end).split('\n').slice(1),
  }));
}

/**
 * Full raw text of every "QUESTÃO N" block (marker included), keyed by number.
 * Feeds the surgical LLM fallback: only the blocks the deterministic parser can't
 * read are re-sent, instead of the whole exam.
 * @example examBlocksByNumero(cleanExamText(pdfText)).get(94)
 */
export function examBlocksByNumero(text: string): Map<number, string> {
  const blocks = new Map<number, string>();
  for (const b of blockBounds(text)) {
    if (!blocks.has(b.numero)) blocks.set(b.numero, text.slice(b.start, b.end).trim());
  }
  return blocks;
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

function alternativeTexts(lines: string[], run: number[]): ParsedAlternativa[] {
  return run.map((idx, k) => {
    const end = k + 1 < run.length ? run[k + 1] : lines.length;
    const head = lines[idx].replace(/^\s*[A-E][\s).]?/, '');
    return { letra: ALT_LETTERS[k], texto: joinPdfLines([head, ...lines.slice(idx + 1, end)]) };
  });
}

function toQuestao(block: Block): ParsedQuestao | null {
  const run = findAlternativeRun(block.lines);
  if (!run) return null;
  const enunciado = joinPdfLines(block.lines.slice(0, run[0]));
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
