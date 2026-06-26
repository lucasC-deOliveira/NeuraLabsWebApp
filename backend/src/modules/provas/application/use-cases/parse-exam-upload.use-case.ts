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
 * Parses an uploaded exam + answer-key pair into structured questions: extracts
 * text from both documents, asks the LLM to cross-reference them, and normalizes
 * the result.
 * @example parseExamUpload.execute('u1', provaFile, gabaritoFile)
 */
export class ParseExamUploadUseCase {
  constructor(
    private readonly extractor: DocumentTextExtractor,
    private readonly llm: ExamLlmPort,
  ) {}

  async execute(
    userId: string,
    prova: UploadedDocument,
    gabarito: UploadedDocument,
  ): Promise<ParsedUpload> {
    const [provaText, gabaritoText] = await Promise.all([
      this.extractor.extract(prova),
      this.extractor.extract(gabarito),
    ]);
    const messages = buildExamParsePrompt(provaText, gabaritoText);
    const content = await this.llm.complete({ userId, messages, temperature: PARSE_TEMPERATURE });
    return parseExamResponse(content);
  }
}
