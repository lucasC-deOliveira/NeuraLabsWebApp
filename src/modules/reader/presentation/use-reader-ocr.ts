import { useEffect, useRef, useState, type Dispatch, type RefObject, type SetStateAction } from "react";
import { desktop } from "@/lib/vault-bridge";
import type { ReaderOcrCache, ReaderOcrLanguage, ReaderOcrPage } from "@contracts/reader-ocr";
import { renderReaderOcrImage, type LocalPdf } from "../infra/pdf-reader";
import { recognizeReaderBook } from "../application/recognize-reader-book";

type OcrState = {
  cache: ReaderOcrCache | null;
  pendingPage: number | null;
  failed: boolean;
  runningBook: boolean;
  recognize(page: number, language: ReaderOcrLanguage): Promise<void>;
  recognizeBook(language: ReaderOcrLanguage): Promise<void>;
  stop(): void;
};

/** Loads cached pages and enables on-demand recognition, e.g. useReaderOcr(book, "Book.pdf"). */
export function useReaderOcr(book: LocalPdf, relative: string): OcrState {
  const [cache, setCache] = useState<ReaderOcrCache | null>(null);
  const [failed, setFailed] = useState(false);
  const executionRef = useRef<AbortController | null>(null);
  useEffect(() => observeOcrCache(relative, executionRef, setCache, setFailed), [relative]);
  const actions = useOcrRecognition({ book, relative, revision: cache?.revision, executionRef, setCache, setFailed });
  return { cache, failed, ...actions };
}

interface RecognitionContext {
  book: LocalPdf;
  relative: string;
  revision?: string;
  executionRef: RefObject<AbortController | null>;
  setCache: Dispatch<SetStateAction<ReaderOcrCache | null>>;
  setFailed: (failed: boolean) => void;
}

function useOcrRecognition(context: RecognitionContext): Omit<OcrState, "cache" | "failed"> {
  const [pendingPage, setPendingPage] = useState<number | null>(null);
  const [runningBook, setRunningBook] = useState(false);
  const setProgress = (page: number | null, wholeBook: boolean): void => {
    setPendingPage(page);
    setRunningBook(wholeBook);
  };
  const recognize = (page: number, language: ReaderOcrLanguage): Promise<void> =>
    runRecognition(context, page, setProgress, (signal, revision) => recognizeSinglePage(context, signal, revision, page, language));
  const recognizeBook = (language: ReaderOcrLanguage): Promise<void> =>
    runRecognition(context, null, setProgress, (signal, revision) =>
      recognizeBookForSearch(context, { signal, revision, language, setProgress }));
  const stop = (): void => context.executionRef.current?.abort();
  return { pendingPage, runningBook, recognize, recognizeBook, stop };
}

async function runRecognition(
  context: RecognitionContext, page: number | null,
  setProgress: (page: number | null, wholeBook: boolean) => void,
  action: (signal: AbortSignal, revision: string) => Promise<void>,
): Promise<void> {
  const { revision, executionRef, setFailed } = context;
  if (!revision || executionRef.current) return;
  const controller = new AbortController();
  executionRef.current = controller;
  setProgress(page ?? 1, page === null);
  setFailed(false);
  try { await action(controller.signal, revision); }
  catch { if (!controller.signal.aborted) setFailed(true); }
  finally {
    if (executionRef.current === controller) {
      executionRef.current = null;
      setProgress(null, false);
    }
  }
}

async function recognizeSinglePage(context: RecognitionContext, signal: AbortSignal, revision: string, page: number, language: ReaderOcrLanguage): Promise<void> {
  const result = await requestPageRecognition(context.book, signal, context.relative, revision, page, language);
  if (!signal.aborted) context.setCache((current) => mergeOcrPage(current, result));
}

interface BookJob {
  signal: AbortSignal;
  revision: string;
  language: ReaderOcrLanguage;
  setProgress: (page: number | null, wholeBook: boolean) => void;
}

async function recognizeBookForSearch(context: RecognitionContext, job: BookJob): Promise<void> {
  const { book, relative, executionRef, setCache } = context;
  const { signal, revision, language, setProgress } = job;
  const cached = await desktop.vault.loadReaderOcr(relative);
  if (cached.revision !== revision) throw new Error("Document changed. Expected the opened PDF revision.");
  const source = { pageCount: book.pageCount, readPageText: book.readPageText, recognize: sourceRecognizer(context, signal, revision) };
  try {
    await recognizeReaderBook(source, { language, cached: cached.pages, signal, onPage: (page) => setProgress(page, true) });
  } finally {
    if (executionRef.current) setCache(await desktop.vault.loadReaderOcr(relative));
  }
}

function sourceRecognizer(
  context: RecognitionContext, signal: AbortSignal, revision: string,
): (page: number, language: ReaderOcrLanguage) => Promise<ReaderOcrPage> {
  return (page: number, language: ReaderOcrLanguage): Promise<ReaderOcrPage> =>
    requestPageRecognition(context.book, signal, context.relative, revision, page, language);
}

function observeOcrCache(
  relative: string,
  execution: RefObject<AbortController | null>,
  setCache: (cache: ReaderOcrCache) => void,
  setFailed: (failed: boolean) => void,
): () => void {
  let active = true;
  void desktop.vault.loadReaderOcr(relative).then(
    (cache) => { if (active) setCache(cache); },
    () => { if (active) setFailed(true); },
  );
  return (): void => {
    active = false;
    execution.current?.abort();
    execution.current = null;
  };
}

async function requestPageRecognition(
  book: LocalPdf, signal: AbortSignal, relative: string, revision: string, page: number, language: ReaderOcrLanguage,
): Promise<ReaderOcrPage> {
  const image = await renderReaderOcrImage(book, page, signal);
  return desktop.vault.recognizeReaderPage({ relative, revision, page, language, image });
}

function mergeOcrPage(previous: ReaderOcrCache | null, result: ReaderOcrPage): ReaderOcrCache | null {
  if (!previous) return null;
  return { ...previous, pages: [...previous.pages.filter((entry) => entry.page !== result.page), result] };
}
