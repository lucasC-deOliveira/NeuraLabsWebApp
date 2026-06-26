// A raw uploaded document, as handed over by the HTTP layer (Multer).
export interface UploadedDocument {
  buffer: Buffer;
  mimetype: string;
  originalname: string;
}

// Port over document text extraction (PDF/DOCX/TXT). Only the adapter knows the
// concrete parsing libraries (pdf-parse, mammoth).
export interface DocumentTextExtractor {
  extract(document: UploadedDocument): Promise<string>;
}

export const DOCUMENT_TEXT_EXTRACTOR = Symbol('DOCUMENT_TEXT_EXTRACTOR');
