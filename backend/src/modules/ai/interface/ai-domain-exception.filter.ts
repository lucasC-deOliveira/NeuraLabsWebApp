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
  BaralhoNotFoundError,
  EmptyAiContentError,
  EmptyBaralhoError,
  EmptyClusterContentError,
  EmptyNodeListError,
  EmptyTextError,
  GraphNotFoundError,
  InvalidAiJsonError,
  MergeKeepNotFoundError,
  NoteNotFoundError,
  UnsupportedExpandTypeError,
} from '../domain/errors';

// User-facing (Portuguese) HTTP response per AI domain error, keyed by error name.
const HTTP_BY_ERROR: Record<string, () => HttpException> = {
  AiNodeNotFoundError: () => new NotFoundException('Nó não encontrado neste grafo.'),
  EmptyNodeListError: () => new BadRequestException('Lista de nós vazia'),
  EmptyClusterContentError: () => new BadRequestException('Nós sem conteúdo para resumir'),
  UnsupportedExpandTypeError: () =>
    new BadRequestException(
      'Tipo não suportado para expansão. Use ASSUNTO, TOPICO, CONCEITO ou NOTA.',
    ),
  EmptyAiContentError: () => new BadRequestException('A IA não retornou conteúdo.'),
  MergeKeepNotFoundError: () => new BadRequestException('Nó principal não encontrado'),
  NoteNotFoundError: () => new NotFoundException('Nota não encontrada'),
  GraphNotFoundError: () => new NotFoundException('Grafo não encontrado.'),
  BaralhoNotFoundError: () => new NotFoundException('Baralho não encontrado.'),
  EmptyBaralhoError: () => new BadRequestException('O baralho não tem flashcards.'),
  EmptyTextError: () => new BadRequestException('Texto não pode estar vazio'),
};

// Translates AI domain errors into HTTP responses. Domain messages stay internal
// (English); the user-facing messages above are in Portuguese.
@Catch(
  InvalidAiJsonError,
  AiNodeNotFoundError,
  EmptyNodeListError,
  EmptyClusterContentError,
  UnsupportedExpandTypeError,
  EmptyAiContentError,
  MergeKeepNotFoundError,
  NoteNotFoundError,
  GraphNotFoundError,
  BaralhoNotFoundError,
  EmptyBaralhoError,
  EmptyTextError,
)
export class AiDomainExceptionFilter implements ExceptionFilter {
  catch(error: Error, host: ArgumentsHost): void {
    const build = HTTP_BY_ERROR[error.name];
    const httpError = build ? build() : new BadRequestException('A IA retornou JSON inválido.');
    const response = host.switchToHttp().getResponse<Response>();
    response.status(httpError.getStatus()).json(httpError.getResponse());
  }
}
