import type {
  DocumentTextExtractor,
  UploadedDocument,
} from '../../domain/ports/document-text-extractor';
import type { ExamLlmPort } from '../../domain/ports/exam-llm';
import type { ParsedUpload } from '../../domain/prova';
import { buildExamParsePrompt } from '../../domain/services/exam-parse-prompt';
import { parseExamResponse } from '../../domain/services/parse-exam-response';

// Low temperature: exam extraction is a faithful transcription task, not creative.
const PARSE_TEMPERATURE = 0.1;

/**
 * Parses an uploaded exam into structured questions: extracts text from the exam
 * (and the answer key, when provided), asks the LLM to extract/cross-reference,
 * and normalizes the result. Without an answer key every gabarito stays "?".
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
    const provaText = await this.extractor.extract(prova);
    const gabaritoText = gabarito ? await this.extractor.extract(gabarito) : undefined;
    const messages = buildExamParsePrompt(provaText, gabaritoText);
    const content = await this.llm.complete({ userId, messages, temperature: PARSE_TEMPERATURE });
    return parseExamResponse(content);
  }
}
