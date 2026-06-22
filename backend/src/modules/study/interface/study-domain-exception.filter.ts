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

// Translates Study domain errors into HTTP responses, keeping domain/application
// free of any framework dependency (hexagonal). The domain message stays internal
// (English); the user-facing message produced here is in Portuguese.
@Catch(NoActiveSessionError, CardNotFoundError)
export class StudyDomainExceptionFilter implements ExceptionFilter {
  catch(error: StudyDomainError, host: ArgumentsHost): void {
    const httpError = this.toHttpException(error);
    const response = host.switchToHttp().getResponse<Response>();
    response.status(httpError.getStatus()).json(httpError.getResponse());
  }

  private toHttpException(error: StudyDomainError): HttpException {
    if (error instanceof NoActiveSessionError) {
      return new BadRequestException('Nenhuma sessão de estudo ativa.');
    }
    return new NotFoundException('Flashcard não encontrado.');
  }
}
