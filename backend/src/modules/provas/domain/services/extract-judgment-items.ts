import type { ParsedQuestao } from '../prova';
import { joinPdfLines } from './join-pdf-lines';

// Deterministic extractor for judgment exams (CEBRASPE "Certo/Errado"): items
// numbered sequentially from 1, grouped under a command sentence ("Julgue os
// itens..." / "judge the following items") optionally preceded by support text.
// Each item becomes a VERDADEIRO_FALSO question carrying its group context
// (support text + command) in the enunciado, with zero LLM tokens (gabarito
// stays "?" — filled by the user). Falls back to the LLM when the structure
// isn't confidently recognized (see the use-case).

const COMMAND_HINT = /\bjulgue\b|\bjudge\b/i;
const ITEM_START = /^(\d{1,3})\s+(\S.*)$/;
const SENTENCE_END = /[.!?:]\s*$/;
// Lines that open the NEXT group's context rather than continuing the current
// item's prose: indented support-text paragraphs, "Texto XX" labels,
// proposition definitions ("P1: ..."), section dividers.
const CONTEXT_OPENERS = [/^\s{3,}\S/, /^Texto\s+\S/, /^P\d*\s*:/, /^--\s/];

interface ItemMarker {
  numero: number;
  lineIdx: number;
  head: string;
}

// Section headers ("LÍNGUA INGLESA", "RACIOCÍNIO LÓGICO") also open a context.
function isUppercaseHeader(line: string): boolean {
  const t = line.trim();
  return t.length >= 4 && !/[a-zà-ÿ]/.test(t) && /[A-ZÀ-Ü].*[A-ZÀ-Ü]/.test(t);
}

function opensContext(line: string): boolean {
  return CONTEXT_OPENERS.some((re) => re.test(line)) || isUppercaseHeader(line);
}

// Items must count up from 1: a line only opens an item when it carries the
// next expected number, so years/quantities at a wrapped-line start don't match.
function findItemMarkers(lines: string[]): ItemMarker[] {
  const markers: ItemMarker[] = [];
  for (let i = 0; i < lines.length; i++) {
    const match = ITEM_START.exec(lines[i]);
    if (!match || Number(match[1]) !== markers.length + 1) continue;
    markers.push({ numero: markers.length + 1, lineIdx: i, head: match[2] });
  }
  return markers;
}

// The command is the sentence ending at the segment's last non-empty line,
// extended backward to just after the previous sentence terminator.
function commandStart(segment: string[]): number | null {
  let end = segment.length - 1;
  while (end >= 0 && segment[end].trim() === '') end--;
  if (end < 0 || !SENTENCE_END.test(segment[end])) return null;
  let start = end;
  while (start > 0 && !SENTENCE_END.test(segment[start - 1]) && !opensContext(segment[start - 1])) {
    start--;
  }
  const run = segment.slice(start, end + 1).join(' ');
  return COMMAND_HINT.test(run) ? start : null;
}

interface SegmentSplit {
  itemLines: string[];
  nextContext: string | null;
}

// A segment (text between two item markers) is the current item's prose plus,
// when a new group starts, the next group's context (support text + command).
function splitSegment(segment: string[]): SegmentSplit {
  const command = commandStart(segment);
  if (command === null) return { itemLines: segment, nextContext: null };
  const opener = segment.findIndex((line, idx) => idx < command && opensContext(line));
  const contextFrom = opener >= 0 ? opener : command;
  return {
    itemLines: segment.slice(0, contextFrom),
    nextContext: joinPdfLines(segment.slice(contextFrom)),
  };
}

function toQuestao(marker: ItemMarker, itemLines: string[], context: string): ParsedQuestao | null {
  const body = joinPdfLines([marker.head, ...itemLines]);
  if (!body) return null;
  return {
    numero: marker.numero,
    enunciado: context ? `${context}\n\n${body}` : body,
    tipo: 'VERDADEIRO_FALSO',
    alternativas: null,
    gabarito: '?',
    explicacao: null,
  };
}

/** Expected item total from the numbering — used to gauge extraction confidence. */
export function countJudgmentItems(text: string): number {
  if (!COMMAND_HINT.test(text)) return 0;
  const markers = findItemMarkers(text.split('\n'));
  return markers.length > 1 ? markers[markers.length - 1].numero : 0;
}

function extractFrom(lines: string[], markers: ItemMarker[]): ParsedQuestao[] {
  const questoes: ParsedQuestao[] = [];
  let context = splitSegment(lines.slice(0, markers[0].lineIdx)).nextContext ?? '';
  for (let i = 0; i < markers.length; i++) {
    const segmentEnd = i + 1 < markers.length ? markers[i + 1].lineIdx : lines.length;
    const split = splitSegment(lines.slice(markers[i].lineIdx + 1, segmentEnd));
    const questao = toQuestao(markers[i], split.itemLines, context);
    if (questao) questoes.push(questao);
    context = split.nextContext ?? context;
  }
  return questoes;
}

/**
 * Extracts the judgment items it can confidently parse; items whose text was
 * lost (e.g. garbled math glyphs) are skipped (the caller's confidence gate
 * decides whether to fall back to the LLM).
 * @example extractJudgmentItems(cleanExamText(pdfText))
 */
export function extractJudgmentItems(text: string): ParsedQuestao[] {
  if (!COMMAND_HINT.test(text)) return [];
  const lines = text.split('\n');
  const markers = findItemMarkers(lines);
  return markers.length > 1 ? extractFrom(lines, markers) : [];
}
