import type { ReaderOcrLanguage } from "./reader-ocr";

export interface ReaderConversionRequest {
  relative: string;
  language: ReaderOcrLanguage;
  jobId: string;
}

export interface ReaderConversionResult {
  markdownPath: string;
  imageCount: number;
}

export interface ReaderConversionProgress {
  jobId: string;
  completed: number;
  total: number;
}
