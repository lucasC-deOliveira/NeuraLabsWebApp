export type ReaderOcrLanguage = "pt" | "en";

export interface ReaderOcrPage {
  page: number;
  language: ReaderOcrLanguage;
  text: string;
  lines?: ReaderOcrLine[];
}

export interface ReaderOcrLine {
  text: string;
  confidence: number;
  bounds: [number, number][];
}

export interface ReaderOcrCache {
  revision: string;
  pages: ReaderOcrPage[];
}

export interface ReaderOcrRequest {
  relative: string;
  revision: string;
  page: number;
  language: ReaderOcrLanguage;
  image: Uint8Array;
}
