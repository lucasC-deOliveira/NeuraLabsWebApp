import {
  ArgumentsHost,
  BadRequestException,
  Catch,
  ExceptionFilter,
  HttpException,
} from '@nestjs/common';
import type { Response } from 'express';
import { EmptySpeechTextError } from '../domain/errors';

// Translates TTS domain errors into HTTP responses, keeping domain/application
// framework-free (hexagonal). The domain message stays internal (English); the
// user-facing message here is Portuguese.
@Catch(EmptySpeechTextError)
export class TtsDomainExceptionFilter implements ExceptionFilter {
  catch(_error: EmptySpeechTextError, host: ArgumentsHost): void {
    const httpError: HttpException = new BadRequestException('Texto para leitura vazio.');
    const response = host.switchToHttp().getResponse<Response>();
    response.status(httpError.getStatus()).json(httpError.getResponse());
  }
}
