import { dirname, join } from 'node:path';
import { pathToFileURL } from 'node:url';
import type { UploadedDocument } from '../../domain/ports/document-text-extractor';
import type {
  ExamFigure,
  ExamFigureLayout,
  ExamFigureSource,
  ExamPageLayout,
} from '../../domain/ports/exam-figure-source';
import {
  collectAlternativeMarkers,
  collectMarkers,
  imageToPng,
  isTextItem,
  scanImageBoxes,
  type ImageBox,
  type OperatorList,
  type PdfImage,
  type PdfOps,
  type TextItem,
} from './pdf-figure-scan';

// Minimal shape of the pdfjs API this adapter consumes.
interface PdfObjs {
  get(name: string, callback: (image: PdfImage | null) => void): void;
}
interface PdfPage {
  getViewport(params: { scale: number }): { viewBox: number[] };
  getTextContent(): Promise<{ items: unknown[] }>;
  getOperatorList(): Promise<OperatorList>;
  objs: PdfObjs;
}
interface PdfDocument {
  numPages: number;
  getPage(pageNumber: number): Promise<PdfPage>;
}
interface PdfjsModule {
  OPS: PdfOps;
  getDocument(params: {
    data: Uint8Array;
    standardFontDataUrl: string;
    disableFontFace: boolean;
  }): { promise: Promise<PdfDocument> };
}

// pdfjs v4 ships ESM only; load it lazily. Node 22 resolves this dynamic import
// even from the CommonJS build (require-of-ESM). Cached across calls.
let pdfjsPromise: Promise<PdfjsModule> | null = null;

function loadPdfjs(): Promise<PdfjsModule> {
  pdfjsPromise ??= import('pdfjs-dist/legacy/build/pdf.mjs') as unknown as Promise<PdfjsModule>;
  return pdfjsPromise;
}

function standardFontsUrl(): string {
  const pkg = require.resolve('pdfjs-dist/package.json');
  return pathToFileURL(join(dirname(pkg), 'standard_fonts/')).href;
}

function isPdf(document: UploadedDocument): boolean {
  return document.mimetype.includes('pdf') || document.originalname.toLowerCase().endsWith('.pdf');
}

function pageCount(total: number, max: number): number {
  return max > 0 ? Math.min(total, max) : total;
}

function getImage(objs: PdfObjs, name: string): Promise<PdfImage | null> {
  return new Promise((resolve) => {
    try {
      objs.get(name, (image) => resolve(image ?? null));
    } catch {
      resolve(null);
    }
  });
}

async function encodeFigure(objs: PdfObjs, box: ImageBox): Promise<ExamFigure | null> {
  if (!box.name) return null;
  const image = await getImage(objs, box.name);
  const bytes = image ? imageToPng(image) : null;
  return bytes ? { bbox: box.bbox, mimetype: 'image/png', bytes } : null;
}

async function encodeFigures(objs: PdfObjs, boxes: ImageBox[]): Promise<ExamFigure[]> {
  const figures: ExamFigure[] = [];
  for (const box of boxes) {
    const figure = await encodeFigure(objs, box);
    if (figure) figures.push(figure);
  }
  return figures;
}

/**
 * Extracts raster figures (with their positions) and question markers from a PDF,
 * so the domain can attribute each figure to a question. Non-PDF uploads yield no
 * figures. Wraps pdfjs (rendering geometry) + pngjs (encoding) — the ACL boundary.
 * @example new PdfjsFigureExtractor(3).extractLayout(prova) // first 3 pages
 */
export class PdfjsFigureExtractor implements ExamFigureSource {
  constructor(
    private readonly maxPages = 0,
    private readonly minSidePt = 40,
  ) {}

  async extractLayout(document: UploadedDocument): Promise<ExamFigureLayout> {
    if (!isPdf(document)) return { pages: [] };
    const pdfjs = await loadPdfjs();
    const doc = await this.openDocument(pdfjs, document.buffer);
    const count = pageCount(doc.numPages, this.maxPages);
    const pages: ExamPageLayout[] = [];
    for (let n = 1; n <= count; n++) {
      pages.push(await this.readPage(pdfjs, doc, n));
    }
    return { pages };
  }

  private openDocument(pdfjs: PdfjsModule, buffer: Buffer): Promise<PdfDocument> {
    const data = new Uint8Array(buffer);
    return pdfjs.getDocument({
      data,
      standardFontDataUrl: standardFontsUrl(),
      disableFontFace: true,
    }).promise;
  }

  private async readPage(pdfjs: PdfjsModule, doc: PdfDocument, n: number): Promise<ExamPageLayout> {
    const page = await doc.getPage(n);
    const box = page.getViewport({ scale: 1 }).viewBox;
    const width = box[2] - box[0];
    const height = box[3] - box[1];
    const text = await page.getTextContent();
    const ops = await page.getOperatorList();
    const items = text.items.filter(isTextItem) as TextItem[];
    const figures = await encodeFigures(page.objs, scanImageBoxes(ops, pdfjs.OPS, this.minSidePt));
    return {
      width,
      height,
      markers: collectMarkers(items, width),
      alternativeMarkers: collectAlternativeMarkers(items, width),
      figures,
    };
  }
}
