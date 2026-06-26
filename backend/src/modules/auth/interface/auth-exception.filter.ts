import {
  ArgumentsHost,
  Catch,
  ConflictException,
  ExceptionFilter,
  HttpException,
  UnauthorizedException,
} from '@nestjs/common';
import type { Response } from 'express';
import { EmailAlreadyRegisteredError, InvalidCredentialsError } from '../domain/errors';

type AuthError = EmailAlreadyRegisteredError | InvalidCredentialsError;

// Maps auth domain errors to HTTP responses (Portuguese, user-facing).
@Catch(EmailAlreadyRegisteredError, InvalidCredentialsError)
export class AuthExceptionFilter implements ExceptionFilter {
  catch(error: AuthError, host: ArgumentsHost): void {
    const httpError: HttpException =
      error instanceof EmailAlreadyRegisteredError
        ? new ConflictException('Já existe uma conta com este email')
        : new UnauthorizedException('Email ou senha incorretos');
    const response = host.switchToHttp().getResponse<Response>();
    response.status(httpError.getStatus()).json(httpError.getResponse());
  }
}
