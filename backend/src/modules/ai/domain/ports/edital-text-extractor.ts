// Anti-Corruption Layer for reading an uploaded edital (public-tender notice)
// document into text. The core speaks this port; only the adapter knows the
// parsing library (pdf-parse). Kept in the AI context so it doesn't depend on
// another module's document handling.
export interface UploadedEdital {
  buffer: Buffer;
  originalname: string;
}

export interface EditalTextExtractor {
  extract(edital: UploadedEdital): Promise<string>;
}

export const EDITAL_TEXT_EXTRACTOR = Symbol('EDITAL_TEXT_EXTRACTOR');
