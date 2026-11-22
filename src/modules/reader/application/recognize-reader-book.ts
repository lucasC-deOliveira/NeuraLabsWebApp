import type { ReaderOcrLanguage, ReaderOcrPage } from "@contracts/reader-ocr";
import { formatEmbeddedPage, formatRecognizedPage, hasEmbeddedPageText } from "../domain/reader-page-format";

interface BookRecognitionSource {
  pageCount: number;
  readPageText(page: number): Promise<string>;
  recognize(page: number, language: ReaderOcrLanguage): Promise<ReaderOcrPage>;
}

interface BookRecognitionOptions {
  language: ReaderOcrLanguage;
  cached: ReaderOcrPage[];
  signal: AbortSignal;
  onPage(page: number): void;
}

/** Builds a resumable transcription, e.g. recognizeReaderBook(book, options). */
export async function recognizeReaderBook(source: BookRecognitionSource, options: BookRecognitionOptions): Promise<string[]> {
  const cached = new Map(options.cached.filter((entry) => entry.language === options.language).map((entry) => [entry.page, entry]));
  const pages: string[] = [];
  for (let page = 1; page <= source.pageCount; page++) {
    options.signal.throwIfAborted();
    options.onPage(page);
    pages.push(await transcribePage(source, page, options.language, cached.get(page), options.signal));
  }
  options.signal.throwIfAborted();
  return pages;
}

async function transcribePage(
  source: BookRecognitionSource, page: number, language: ReaderOcrLanguage,
  cached: ReaderOcrPage | undefined, signal: AbortSignal,
): Promise<string> {
  if (cached) return formatRecognizedPage(cached);
  const native = await source.readPageText(page).catch(() => "");
  if (hasEmbeddedPageText(native)) return formatEmbeddedPage(native);
  signal.throwIfAborted();
  const recognized = await source.recognize(page, language);
  return hasEmbeddedPageText(recognized.text) || !native.trim() ? formatRecognizedPage(recognized) : formatEmbeddedPage(native);
}
