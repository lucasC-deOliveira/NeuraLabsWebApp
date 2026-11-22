import { getDocument, PDFWorker, TextLayer, type PDFPageProxy } from "pdfjs-dist";
import LocalPdfWorker from "pdfjs-dist/build/pdf.worker.min.mjs?worker&inline";

export interface LocalPdf {
  pageCount: number;
  readPageText(page: number): Promise<string>;
  getPage(page: number): Promise<PDFPageProxy>;
  close(): void;
}

/** Opens PDF bytes from the user vault, e.g. openLocalPdf(bytes, signal). */
export async function openLocalPdf(bytes: Uint8Array, signal: AbortSignal): Promise<LocalPdf> {
  signal.throwIfAborted();
  const port = new LocalPdfWorker();
  const worker: PDFWorker = PDFWorker.fromPort({ port });
  const task = getDocument({ data: bytes, worker, isEvalSupported: false, enableXfa: false, useSystemFonts: true });
  const close = (): void => {
    signal.removeEventListener("abort", close);
    if (task.destroyed) return;
    void task.destroy().catch(() => undefined).finally(() => { worker.destroy(); port.terminate(); });
  };
  signal.addEventListener("abort", close, { once: true });
  try {
    const book = await task.promise;
    const readPageText = cachedPageText(book.getPage.bind(book));
    return { pageCount: book.numPages, readPageText, getPage: (page): Promise<PDFPageProxy> => book.getPage(page), close };
  } catch (error) {
    close();
    throw error;
  }
}

function cachedPageText(getPage: LocalPdf["getPage"]): LocalPdf["readPageText"] {
  const text = new Map<number, Promise<string>>();
  return (page): Promise<string> => {
    const existing = text.get(page);
    if (existing) return existing;
    const requested = getPage(page).then(readPdfText);
    text.set(page, requested);
    return requested;
  };
}

async function readPdfText(page: PDFPageProxy): Promise<string> {
  const content = await page.getTextContent();
  return content.items.flatMap((item) => "str" in item ? [item.str + (item.hasEOL ? "\n" : " ")] : []).join("");
}

/** Draws a small first page for the shelf, e.g. drawPdfCover(book, canvas, signal). */
export async function drawPdfCover(book: LocalPdf, canvas: HTMLCanvasElement, signal: AbortSignal): Promise<void> {
  await drawPdfBitmap(book, 1, canvas, 360, 480, signal);
}

/** Rasterizes one PDF page for offline OCR, e.g. renderReaderOcrImage(book, 5, signal). */
export async function renderReaderOcrImage(book: LocalPdf, page: number, signal: AbortSignal): Promise<Uint8Array> {
  const canvas = document.createElement("canvas");
  await drawPdfBitmap(book, page, canvas, 2100, 2600, signal);
  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((image) => image ? resolve(image) : reject(new Error("Expected a PNG bitmap.")), "image/png");
  });
  signal.throwIfAborted();
  return new Uint8Array(await blob.arrayBuffer());
}

async function drawPdfBitmap(book: LocalPdf, number: number, canvas: HTMLCanvasElement, width: number, height: number, signal: AbortSignal): Promise<void> {
  const page = await book.getPage(number);
  signal.throwIfAborted();
  const original = page.getViewport({ scale: 1 });
  const viewport = page.getViewport({ scale: Math.min(width / original.width, height / original.height) });
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Canvas unavailable. Expected a PDF cover rendering surface.");
  canvas.width = Math.ceil(viewport.width);
  canvas.height = Math.ceil(viewport.height);
  const render = page.render({ canvasContext: context, viewport });
  const cancel = (): void => render.cancel();
  signal.addEventListener("abort", cancel, { once: true });
  try {
    await render.promise;
  } finally {
    signal.removeEventListener("abort", cancel);
  }
}

/** Draws a selectable PDF page, e.g. drawLocalPdfPage(page, canvas, layer, 1.2, signal). */
export async function drawLocalPdfPage(page: PDFPageProxy, canvas: HTMLCanvasElement, layer: HTMLDivElement, scale: number, signal: AbortSignal): Promise<void> {
  signal.throwIfAborted();
  const viewport = page.getViewport({ scale });
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Canvas unavailable. Expected a 2D rendering context.");
  sizePdfSurface(canvas, layer, viewport.width, viewport.height, scale);
  const text = new TextLayer({ textContentSource: page.streamTextContent(), container: layer, viewport });
  const render = page.render({ canvasContext: context, viewport });
  const cancel = (): void => { render.cancel(); text.cancel(); };
  signal.addEventListener("abort", cancel, { once: true });
  try {
    await Promise.all([render.promise, text.render()]);
  } finally {
    signal.removeEventListener("abort", cancel);
  }
}

function sizePdfSurface(canvas: HTMLCanvasElement, layer: HTMLDivElement, width: number, height: number, scale: number): void {
  canvas.width = Math.ceil(width);
  canvas.height = Math.ceil(height);
  layer.replaceChildren();
  layer.style.setProperty("--scale-factor", String(scale));
}
