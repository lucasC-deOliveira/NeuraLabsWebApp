import {
  ArgumentsHost,
  BadRequestException,
  Catch,
  ConflictException,
  ExceptionFilter,
  ForbiddenException,
  HttpException,
  NotFoundException,
} from '@nestjs/common';
import type { Response } from 'express';
import {
  EditalAlreadyLinkedError,
  InvalidExamJsonError,
  ProvaAlreadyHasEditalError,
  ProvaForbiddenError,
  ProvaNotFoundError,
  UnsupportedDocumentFormatError,
} from '../domain/errors';

type ProvaError =
  | ProvaNotFoundError
  | ProvaForbiddenError
  | UnsupportedDocumentFormatError
  | InvalidExamJsonError
  | ProvaAlreadyHasEditalError
  | EditalAlreadyLinkedError;

// Maps provas domain errors to HTTP responses (Portuguese, user-facing).
@Catch(
  ProvaNotFoundError,
  ProvaForbiddenError,
  UnsupportedDocumentFormatError,
  InvalidExamJsonError,
  ProvaAlreadyHasEditalError,
  EditalAlreadyLinkedError,
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
  if (error instanceof ProvaAlreadyHasEditalError)
    return new ConflictException('Esta prova já tem um edital vinculado.');
  if (error instanceof EditalAlreadyLinkedError)
    return new ConflictException('Este edital já está vinculado a uma prova.');
  return new BadRequestException('IA retornou formato inválido.');
}
