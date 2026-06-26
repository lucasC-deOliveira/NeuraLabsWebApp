import {
  ArgumentsHost,
  BadRequestException,
  Catch,
  ExceptionFilter,
  ForbiddenException,
  HttpException,
  NotFoundException,
} from '@nestjs/common';
import type { Response } from 'express';
import {
  InvalidExamJsonError,
  ProvaForbiddenError,
  ProvaNotFoundError,
  UnsupportedDocumentFormatError,
} from '../domain/errors';

type ProvaError =
  | ProvaNotFoundError
  | ProvaForbiddenError
  | UnsupportedDocumentFormatError
  | InvalidExamJsonError;

// Maps provas domain errors to HTTP responses (Portuguese, user-facing).
@Catch(
  ProvaNotFoundError,
  ProvaForbiddenError,
  UnsupportedDocumentFormatError,
  InvalidExamJsonError,
)
export class ProvasExceptionFilter implements ExceptionFilter {
  catch(error: ProvaError, host: ArgumentsHost): void {
    const httpError = toHttpError(error);
    const response = host.switchToHttp().getResponse<Response>();
    response.status(httpError.getStatus()).json(httpError.getResponse());
  }
}

function toHttpError(error: ProvaError): HttpException {
  if (error instanceof ProvaNotFoundError) return new NotFoundException('Prova não encontrada');
  if (error instanceof ProvaForbiddenError) return new ForbiddenException();
  if (error instanceof UnsupportedDocumentFormatError)
    return new BadRequestException(`Formato não suportado: ${error.ext}. Use PDF, DOCX ou TXT.`);
  return new BadRequestException('IA retornou formato inválido.');
}
