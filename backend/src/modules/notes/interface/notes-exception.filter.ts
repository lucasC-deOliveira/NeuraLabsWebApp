import { ArgumentsHost, Catch, ExceptionFilter, NotFoundException } from '@nestjs/common';
import type { Response } from 'express';
import { NotaNotFoundError } from '../domain/errors';

// Maps the notes domain error to a user-facing (Portuguese) HTTP response.
@Catch(NotaNotFoundError)
export class NotesExceptionFilter implements ExceptionFilter {
  catch(_error: NotaNotFoundError, host: ArgumentsHost): void {
    const httpError = new NotFoundException('Nota não encontrada');
    const response = host.switchToHttp().getResponse<Response>();
    response.status(httpError.getStatus()).json(httpError.getResponse());
  }
}
