// Deterministic parser for an exam answer key, so a deterministic prova parse can
// be filled with zero LLM tokens. Handles two formats:
//   - ENEM multiple-choice: "<número><letra>" lines (e.g. "91E", "132Anulado").
//   - CEBRASPE judgment grid: rows of C/E/X (Certo/Errado/anulado) numbered
//     continuously across blocks (C→V, E→F). Annulled items → ANULADA sentinel.
// Pure.

const ANSWER_LINE = /^(\d{1,3})\s*([A-E])$/;
const ANNULLED_LINE = /^(\d{1,3})\s*Anulad[oa]$/i;
// A judgment grid row: a run of C/E/X, then the sheet's zero padding to column 20.
const JUDGMENT_ROW = /^([CEX]+)0*$/;

export const ANNULLED = 'ANULADA';

/**
 * @example parseGabarito('91E\n92E\n132Anulado') // → Map {91:'E', 92:'E', 132:'ANULADA'}
 * @example parseGabarito('CCEE…') // CEBRASPE → Map {1:'V', 2:'V', 3:'F', 4:'F', …}
 */
export function parseGabarito(text: string): Map<number, string> {
  const multipleChoice = parseMultipleChoiceKey(text);
  return multipleChoice.size > 0 ? multipleChoice : parseJudgmentKey(text);
}

function parseMultipleChoiceKey(text: string): Map<number, string> {
  const answers = new Map<number, string>();
  for (const raw of text.split('\n')) {
    const line = raw.trim();
    const answer = ANSWER_LINE.exec(line);
    if (answer) {
      answers.set(Number(answer[1]), answer[2]);
      continue;
    }
    const annulled = ANNULLED_LINE.exec(line);
    if (annulled) answers.set(Number(annulled[1]), ANNULLED);
  }
  return answers;
}

const JUDGMENT_ANSWER: Record<string, string> = { C: 'V', E: 'F', X: ANNULLED };

function parseJudgmentKey(text: string): Map<number, string> {
  const answers = new Map<number, string>();
  let item = 0;
  for (const raw of text.split('\n')) {
    const row = JUDGMENT_ROW.exec(raw.trim());
    if (!row) continue;
    for (const mark of row[1]) answers.set(++item, JUDGMENT_ANSWER[mark]);
  }
  return answers;
}
