import type {
  DocumentTextExtractor,
  UploadedDocument,
} from '../../domain/ports/document-text-extractor';
import type { ExamLlmPort } from '../../domain/ports/exam-llm';
import type { ParsedUpload } from '../../domain/prova';
import { buildExamParsePrompt } from '../../domain/services/exam-parse-prompt';
import { parseExamResponse } from '../../domain/services/parse-exam-response';
import { cleanExamText } from '../../domain/services/exam-text-cleaning';
import { extractExamQuestions, countExamQuestions } from '../../domain/services/extract-exam-questions';

// Low temperature: exam extraction is a faithful transcription task, not creative.
const PARSE_TEMPERATURE = 0.1;
// Trust the deterministic parser when it recognizes at least this share of the
// questions; otherwise the format is unfamiliar and we fall back to the LLM.
const DETERMINISTIC_CONFIDENCE = 0.7;

/**
 * Parses an uploaded exam into structured questions. Tier 1 (no answer key):
 * deterministic parser for well-structured MC exams (ENEM) — no LLM tokens.
 * Tier 2 (fallback / with answer key): the LLM on the cleaned text.
 * @example parseExamUpload.execute('u1', provaFile, gabaritoFile)
 * @example parseExamUpload.execute('u1', provaFile) // sem gabarito
 */
export class ParseExamUploadUseCase {
  constructor(
    private readonly extractor: DocumentTextExtractor,
    private readonly llm: ExamLlmPort,
  ) {}

  async execute(
    userId: string,
    prova: UploadedDocument,
    gabarito?: UploadedDocument,
  ): Promise<ParsedUpload> {
    // Pre-clean (drop cover/boilerplate) to cut tokens and improve coverage.
    const provaText = cleanExamText(await this.extractor.extract(prova));
    const deterministic = gabarito ? null : tryDeterministic(provaText);
    if (deterministic) return deterministic;
    return this.parseWithLlm(userId, provaText, gabarito);
  }

  private async parseWithLlm(userId: string, provaText: string, gabarito?: UploadedDocument): Promise<ParsedUpload> {
    const gabaritoText = gabarito ? await this.extractor.extract(gabarito) : undefined;
    const messages = buildExamParsePrompt(provaText, gabaritoText);
    const content = await this.llm.complete({ userId, messages, temperature: PARSE_TEMPERATURE });
    return parseExamResponse(content);
  }
}

/** Deterministic extraction, used only when it recognizes enough of the exam. */
function tryDeterministic(provaText: string): ParsedUpload | null {
  const questoes = extractExamQuestions(provaText);
  const total = countExamQuestions(provaText);
  if (questoes.length > 0 && questoes.length >= total * DETERMINISTIC_CONFIDENCE) {
    return { tituloSugerido: null, questoes };
  }
  return null;
}
