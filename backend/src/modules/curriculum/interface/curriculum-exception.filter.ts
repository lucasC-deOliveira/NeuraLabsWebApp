import { ArgumentsHost, Catch, ExceptionFilter, NotFoundException } from '@nestjs/common';
import type { Response } from 'express';
import { AssuntoNotFoundError, TopicoNotFoundError } from '../domain/errors';

type CurriculumError = AssuntoNotFoundError | TopicoNotFoundError;

// Maps curriculum domain errors to user-facing (Portuguese) HTTP responses.
@Catch(AssuntoNotFoundError, TopicoNotFoundError)
export class CurriculumExceptionFilter implements ExceptionFilter {
  catch(error: CurriculumError, host: ArgumentsHost): void {
    const message =
      error instanceof AssuntoNotFoundError ? 'Assunto não encontrado' : 'Tópico não encontrado';
    const httpError = new NotFoundException(message);
    const response = host.switchToHttp().getResponse<Response>();
    response.status(httpError.getStatus()).json(httpError.getResponse());
  }
}
