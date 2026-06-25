import {
  ArgumentsHost,
  BadRequestException,
  Catch,
  ExceptionFilter,
  HttpException,
  NotFoundException,
} from '@nestjs/common';
import type { Response } from 'express';
import { AiNodeNotFoundError, InvalidAiJsonError } from '../domain/errors';

type AiDomainError = InvalidAiJsonError | AiNodeNotFoundError;

// Translates AI domain errors into HTTP responses. Domain messages stay internal
// (English); user-facing messages produced here are in Portuguese.
@Catch(InvalidAiJsonError, AiNodeNotFoundError)
export class AiDomainExceptionFilter implements ExceptionFilter {
  catch(error: AiDomainError, host: ArgumentsHost): void {
    const httpError = this.toHttpException(error);
    const response = host.switchToHttp().getResponse<Response>();
    response.status(httpError.getStatus()).json(httpError.getResponse());
  }

  private toHttpException(error: AiDomainError): HttpException {
    if (error instanceof AiNodeNotFoundError)
      return new NotFoundException('Nó não encontrado neste grafo.');
    return new BadRequestException('A IA retornou JSON inválido.');
  }
}
