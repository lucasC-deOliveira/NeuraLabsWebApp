import type { UploadedDocument } from './document-text-extractor';

// A figure's bounding box in PDF user space (origin bottom-left, points).
export interface FigureBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

// A "QUESTÃO N" marker located on the page, used to attribute figures.
export interface QuestionMarker {
  numero: number;
  x: number;
  y: number;
}

// An alternative letter marker (A–E) located on the page, so a figure sitting
// under a letter can be attributed to that answer (image alternatives).
export interface AlternativeMarker {
  letra: string;
  x: number;
  y: number;
}

// A raster figure extracted from the PDF, already encoded for storage/display.
export interface ExamFigure {
  bbox: FigureBox;
  mimetype: string;
  bytes: Buffer;
}

export interface ExamPageLayout {
  width: number;
  height: number;
  markers: QuestionMarker[];
  alternativeMarkers: AlternativeMarker[];
  figures: ExamFigure[];
}

export interface ExamFigureLayout {
  pages: ExamPageLayout[];
}

// Port over PDF figure extraction. Only the adapter knows pdfjs/pngjs: it returns
// the raster figures with their positions plus the question-marker positions, so
// the (pure) domain can attribute each figure to a question. See associate-figures.
export interface ExamFigureSource {
  extractLayout(document: UploadedDocument): Promise<ExamFigureLayout>;
}

export const EXAM_FIGURE_SOURCE = Symbol('EXAM_FIGURE_SOURCE');
