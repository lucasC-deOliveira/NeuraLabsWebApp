import { Injectable } from '@nestjs/common';
import * as mammoth from 'mammoth';
import { UnsupportedDocumentFormatError } from '../../domain/errors';
import type {
  DocumentTextExtractor,
  UploadedDocument,
} from '../../domain/ports/document-text-extractor';

// pdf-parse is a CJS module; require() avoids the "not callable" TS error with import *
// eslint-disable-next-line @typescript-eslint/no-require-imports
const pdfParse = require('pdf-parse') as (buf: Buffer) => Promise<{ text: string }>;

// ACL over the document parsing libraries (pdf-parse, mammoth). The only place
// that imports them; the core depends solely on the DocumentTextExtractor port.
@Injectable()
export class MultiFormatTextExtractor implements DocumentTextExtractor {
  async extract(document: UploadedDocument): Promise<string> {
    const { buffer, mimetype, originalname } = document;
    const ext = originalname.split('.').pop()?.toLowerCase() ?? '';

    if (ext === 'pdf' || mimetype === 'application/pdf') {
      return (await pdfParse(buffer)).text;
    }
    if (ext === 'docx' || mimetype === DOCX_MIME) {
      return (await mammoth.extractRawText({ buffer })).value;
    }
    if (ext === 'txt' || mimetype === 'text/plain') {
      return buffer.toString('utf-8');
    }
    throw new UnsupportedDocumentFormatError(ext);
  }
}

const DOCX_MIME = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
