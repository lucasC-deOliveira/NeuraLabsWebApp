import { ArgumentsHost, BadRequestException, Catch, ExceptionFilter } from '@nestjs/common';
import type { Response } from 'express';
import { InvalidAiJsonError } from '../domain/errors';

// Translates AI domain errors into HTTP responses. Domain messages stay internal
// (English); user-facing messages produced here are in Portuguese.
@Catch(InvalidAiJsonError)
export class AiDomainExceptionFilter implements ExceptionFilter {
  catch(_error: InvalidAiJsonError, host: ArgumentsHost): void {
    const httpError = new BadRequestException('A IA retornou JSON inválido.');
    const response = host.switchToHttp().getResponse<Response>();
    response.status(httpError.getStatus()).json(httpError.getResponse());
  }
}
