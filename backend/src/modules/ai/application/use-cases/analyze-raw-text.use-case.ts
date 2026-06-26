import { parseAiJson } from '../../domain/services/ai-json';
import {
  selectNoteCandidates,
  type NoteCandidate,
  type RawNote,
} from '../../domain/services/note-candidates';
import type { LlmMessage, LlmPort } from '../../domain/ports/llm-port';

const SYSTEM_PROMPT =
  'Você é um assistente de análise de texto educacional. Dado um texto bruto, identifique ' +
  'QUANTAS NOTAS fizerem sentido. Cada nota deve ter titulo e conteudo organizado.\n' +
  'Responda APENAS JSON: {"notas":[{"titulo":"Nome","conteudo":"Conteúdo organizado"}]}';

/**
 * Splits raw text into note candidates. On empty input/output returns none; on
 * unparseable output falls back to a single note with the whole text.
 * @example analyzeRawText.execute('u1', 'texto bruto...')
 */
export class AnalyzeRawTextUseCase {
  constructor(private readonly llm: LlmPort) {}

  async execute(userId: string, rawText: string): Promise<{ candidatas: NoteCandidate[] }> {
    if (!rawText.trim()) return { candidatas: [] };
    const content = await this.llm.complete({ userId, messages: buildMessages(rawText) });
    if (!content) return { candidatas: [] };
    try {
      const parsed = parseAiJson(content) as { notas?: unknown };
      return { candidatas: selectNoteCandidates(asNotes(parsed?.notas)) };
    } catch {
      return { candidatas: [{ titulo: 'Nota', conteudo: rawText, conceitosPrevistos: [] }] };
    }
  }
}

const asNotes = (v: unknown): RawNote[] => (Array.isArray(v) ? (v as RawNote[]) : []);

function buildMessages(rawText: string): LlmMessage[] {
  return [
    { role: 'system', content: SYSTEM_PROMPT },
    { role: 'user', content: rawText.slice(0, 15000) },
  ];
}
