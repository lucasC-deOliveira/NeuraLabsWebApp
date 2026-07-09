import { Injectable } from '@nestjs/common';
import type { EditalTextExtractor, UploadedEdital } from '../../domain/ports/edital-text-extractor';

// pdf-parse is CJS; require() avoids the "not callable" TS error with import *.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const pdfParse = require('pdf-parse') as (buf: Buffer) => Promise<{ text: string }>;

// ACL over pdf-parse for the edital upload. The only place in the AI context that
// touches the PDF library; the core depends solely on the EditalTextExtractor port.
@Injectable()
export class PdfEditalTextExtractor implements EditalTextExtractor {
  async extract(edital: UploadedEdital): Promise<string> {
    const ext = edital.originalname.split('.').pop()?.toLowerCase() ?? '';
    if (ext === 'txt') return edital.buffer.toString('utf-8');
    return (await pdfParse(edital.buffer)).text;
  }
}
