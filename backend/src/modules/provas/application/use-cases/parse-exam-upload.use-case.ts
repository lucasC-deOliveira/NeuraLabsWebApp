import type {
  DocumentTextExtractor,
  UploadedDocument,
} from '../../domain/ports/document-text-extractor';
import type { ExamLlmPort } from '../../domain/ports/exam-llm';
import type { ExamFigureSource } from '../../domain/ports/exam-figure-source';
import type { ParsedUpload } from '../../domain/prova';
import { buildExamParsePrompt } from '../../domain/services/exam-parse-prompt';
import { parseExamResponse } from '../../domain/services/parse-exam-response';
import { cleanExamText } from '../../domain/services/exam-text-cleaning';
import {
  extractExamQuestions,
  examBlocksByNumero,
} from '../../domain/services/extract-exam-questions';
import {
  extractJudgmentItems,
  countJudgmentItems,
} from '../../domain/services/extract-judgment-items';
import { mergeQuestoes } from '../../domain/services/merge-questoes';
import { parseGabarito } from '../../domain/services/parse-gabarito';
import { applyGabarito, gabaritoCovers } from '../../domain/services/apply-gabarito';
import type { ParsedQuestao } from '../../domain/prova';
import { attachFiguresToQuestoes } from '../../domain/services/attach-figures';

// Low temperature: exam extraction is a faithful transcription task, not creative.
const PARSE_TEMPERATURE = 0.1;
// Trust the deterministic parser when it recognizes at least this share of the
// questions; otherwise the format is unfamiliar and we fall back to the LLM.
const DETERMINISTIC_CONFIDENCE = 0.7;

/**
 * Parses an uploaded exam into structured questions. Tier 1 (no answer key):
 * deterministic parser for well-structured MC exams (ENEM) — no LLM tokens.
 * Tier 2 (surgical): only the blocks the deterministic parser can't read are
 * re-sent to the LLM, not the whole exam. Tier 3 (full LLM): unfamiliar format
 * or an answer key to cross-reference.
 * @example parseExamUpload.execute('u1', provaFile, gabaritoFile)
 * @example parseExamUpload.execute('u1', provaFile) // sem gabarito
 */
export class ParseExamUploadUseCase {
  constructor(
    private readonly extractor: DocumentTextExtractor,
    private readonly llm: ExamLlmPort,
    private readonly figures?: ExamFigureSource,
  ) {}

  async execute(
    userId: string,
    prova: UploadedDocument,
    gabarito?: UploadedDocument,
  ): Promise<ParsedUpload> {
    // Pre-clean (drop cover/boilerplate) to cut tokens and improve coverage.
    const provaText = cleanExamText(await this.extractor.extract(prova));
    const upload = gabarito
      ? await this.parseWithGabarito(userId, provaText, gabarito)
      : await this.parseWithoutGabarito(userId, provaText);
    return this.withFigures(prova, upload);
  }

  // With an answer key, fill the deterministic (+surgical) prova parse from a
  // deterministic answer-key parse: the gabarito text never reaches the LLM, and
  // only the blocks the parser misses cost tokens. Falls back to the full LLM
  // cross-reference when the key or the prova isn't confidently recognized.
  private async parseWithGabarito(
    userId: string,
    provaText: string,
    gabarito: UploadedDocument,
  ): Promise<ParsedUpload> {
    const gabaritoText = await this.extractor.extract(gabarito);
    const gabaritos = parseGabarito(gabaritoText);
    const parsed = gabaritos.size > 0 ? await this.parseWithoutGabarito(userId, provaText) : null;
    if (parsed && gabaritoCovers(parsed.questoes, gabaritos)) {
      return { ...parsed, questoes: applyGabarito(parsed.questoes, gabaritos) };
    }
    const messages = buildExamParsePrompt(provaText, gabaritoText);
    const content = await this.llm.complete({ userId, messages, temperature: PARSE_TEMPERATURE });
    return parseExamResponse(content);
  }

  private async parseWithoutGabarito(userId: string, provaText: string): Promise<ParsedUpload> {
    const judgment = confidentUpload(
      extractJudgmentItems(provaText),
      countJudgmentItems(provaText),
    );
    return judgment ?? (await this.parseMultipleChoice(userId, provaText));
  }

  // Trusts the deterministic MC parse and sends only the blocks it couldn't read
  // to the LLM. A fully parsed exam costs 0 tokens; an unfamiliar one (few/no
  // recognized blocks) falls back to a full LLM parse.
  private async parseMultipleChoice(userId: string, provaText: string): Promise<ParsedUpload> {
    const blocks = examBlocksByNumero(provaText);
    const questoes = extractExamQuestions(provaText);
    if (blocks.size === 0 || questoes.length < blocks.size * DETERMINISTIC_CONFIDENCE) {
      return this.parseWithLlm(userId, provaText);
    }
    const missing = [...blocks.keys()].filter((n) => !questoes.some((q) => q.numero === n));
    if (missing.length === 0) return { tituloSugerido: null, questoes };
    const recovered = await this.parseWithLlm(userId, surgicalText(blocks, missing));
    return { tituloSugerido: null, questoes: mergeQuestoes(questoes, recovered.questoes) };
  }

  private async parseWithLlm(userId: string, provaText: string): Promise<ParsedUpload> {
    const messages = buildExamParsePrompt(provaText);
    const content = await this.llm.complete({ userId, messages, temperature: PARSE_TEMPERATURE });
    return parseExamResponse(content);
  }

  // Figures are best-effort AND time-bounded. Scanning every PDF page with pdfjs is
  // slow (or stalls) on large text-heavy exams, so: skip it entirely for pure
  // judgment exams (CEBRASPE Certo/Errado have no per-question figures), and cap it
  // with a timeout for the rest — a slow scan degrades to a text-only parse instead
  // of hanging the request.
  private async withFigures(prova: UploadedDocument, upload: ParsedUpload): Promise<ParsedUpload> {
    const hasMultiplaEscolha = upload.questoes.some((q) => q.tipo === 'MULTIPLA_ESCOLHA');
    if (!this.figures || !hasMultiplaEscolha) return upload;
    try {
      const layout = await withTimeout(this.figures.extractLayout(prova), FIGURE_TIMEOUT_MS);
      return { ...upload, questoes: attachFiguresToQuestoes(upload.questoes, layout.pages) };
    } catch {
      return upload;
    }
  }
}

// Upper bound for figure extraction; past it we keep the (already parsed) text.
const FIGURE_TIMEOUT_MS = Number(process.env.PROVA_FIGURE_TIMEOUT_MS) || 45_000;

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  let timer: NodeJS.Timeout;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(`timed out after ${ms}ms`)), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer)) as Promise<T>;
}

/** Concatenates the raw text of the missing blocks (markers included) for the LLM. */
function surgicalText(blocks: Map<number, string>, missing: number[]): string {
  return missing
    .map((numero) => blocks.get(numero))
    .filter((text): text is string => text !== undefined)
    .join('\n\n');
}

function confidentUpload(questoes: ParsedQuestao[], total: number): ParsedUpload | null {
  if (questoes.length > 0 && questoes.length >= total * DETERMINISTIC_CONFIDENCE) {
    return { tituloSugerido: null, questoes };
  }
  return null;
}
