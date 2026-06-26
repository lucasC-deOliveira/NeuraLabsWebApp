import { ArgumentsHost, Catch, ExceptionFilter, NotFoundException } from '@nestjs/common';
import type { Response } from 'express';
import { NotaNotFoundError } from '../domain/errors';

// Maps flashcards domain errors to user-facing (Portuguese) HTTP responses.
@Catch(NotaNotFoundError)
export class FlashcardsExceptionFilter implements ExceptionFilter {
  catch(_error: NotaNotFoundError, host: ArgumentsHost): void {
    const httpError = new NotFoundException('Nota não encontrada');
    const response = host.switchToHttp().getResponse<Response>();
    response.status(httpError.getStatus()).json(httpError.getResponse());
  }
}
