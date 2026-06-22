import {
  ArgumentsHost,
  BadRequestException,
  Catch,
  ExceptionFilter,
  HttpException,
  NotFoundException,
} from '@nestjs/common';
import type { Response } from 'express';
import { CardNotFoundError, NoActiveSessionError } from '../domain/errors';

type StudyDomainError = NoActiveSessionError | CardNotFoundError;

// Traduz erros de domínio do contexto Study em respostas HTTP, mantendo o
// domínio/application livres de qualquer dependência do framework (hexagonal).
@Catch(NoActiveSessionError, CardNotFoundError)
export class StudyDomainExceptionFilter implements ExceptionFilter {
  catch(error: StudyDomainError, host: ArgumentsHost): void {
    const httpError = this.toHttpException(error);
    const response = host.switchToHttp().getResponse<Response>();
    response.status(httpError.getStatus()).json(httpError.getResponse());
  }

  private toHttpException(error: StudyDomainError): HttpException {
    if (error instanceof NoActiveSessionError) return new BadRequestException(error.message);
    return new NotFoundException(error.message);
  }
}
