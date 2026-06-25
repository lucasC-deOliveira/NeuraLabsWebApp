import {
  ArgumentsHost,
  BadRequestException,
  Catch,
  ExceptionFilter,
  HttpException,
  NotFoundException,
} from '@nestjs/common';
import type { Response } from 'express';
import {
  AiNodeNotFoundError,
  EmptyClusterContentError,
  EmptyNodeListError,
  InvalidAiJsonError,
  UnsupportedExpandTypeError,
} from '../domain/errors';

type AiDomainError =
  | InvalidAiJsonError
  | AiNodeNotFoundError
  | EmptyNodeListError
  | EmptyClusterContentError
  | UnsupportedExpandTypeError;

// Translates AI domain errors into HTTP responses. Domain messages stay internal
// (English); user-facing messages produced here are in Portuguese.
@Catch(
  InvalidAiJsonError,
  AiNodeNotFoundError,
  EmptyNodeListError,
  EmptyClusterContentError,
  UnsupportedExpandTypeError,
)
export class AiDomainExceptionFilter implements ExceptionFilter {
  catch(error: AiDomainError, host: ArgumentsHost): void {
    const httpError = this.toHttpException(error);
    const response = host.switchToHttp().getResponse<Response>();
    response.status(httpError.getStatus()).json(httpError.getResponse());
  }

  private toHttpException(error: AiDomainError): HttpException {
    if (error instanceof AiNodeNotFoundError)
      return new NotFoundException('Nó não encontrado neste grafo.');
    if (error instanceof EmptyNodeListError) return new BadRequestException('Lista de nós vazia');
    if (error instanceof EmptyClusterContentError)
      return new BadRequestException('Nós sem conteúdo para resumir');
    if (error instanceof UnsupportedExpandTypeError)
      return new BadRequestException(
        'Tipo não suportado para expansão. Use ASSUNTO, TOPICO, CONCEITO ou NOTA.',
      );
    return new BadRequestException('A IA retornou JSON inválido.');
  }
}
