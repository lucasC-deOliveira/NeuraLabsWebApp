import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  ForbiddenException,
  HttpException,
  NotFoundException,
} from '@nestjs/common';
import type { Response } from 'express';
import { QuestaoForbiddenError, QuestaoNotFoundError } from '../domain/errors';

type QuestaoError = QuestaoNotFoundError | QuestaoForbiddenError;

// Maps questions domain errors to HTTP responses (Portuguese, user-facing).
@Catch(QuestaoNotFoundError, QuestaoForbiddenError)
export class QuestionsExceptionFilter implements ExceptionFilter {
  catch(error: QuestaoError, host: ArgumentsHost): void {
    const httpError: HttpException =
      error instanceof QuestaoNotFoundError
        ? new NotFoundException('Questão não encontrada')
        : new ForbiddenException();
    const response = host.switchToHttp().getResponse<Response>();
    response.status(httpError.getStatus()).json(httpError.getResponse());
  }
}
