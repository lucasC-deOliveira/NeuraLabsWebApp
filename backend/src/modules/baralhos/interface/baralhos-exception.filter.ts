import {
  ArgumentsHost,
  BadRequestException,
  Catch,
  ExceptionFilter,
  HttpException,
  NotFoundException,
} from '@nestjs/common';
import type { Response } from 'express';
import { BaralhoNotFoundError, EmptyImportError, InvalidBaralhoTitleError } from '../domain/errors';

type BaralhoError = BaralhoNotFoundError | InvalidBaralhoTitleError | EmptyImportError;

// Traduz os erros de domínio (inglês, internos) para respostas em português.
@Catch(BaralhoNotFoundError, InvalidBaralhoTitleError, EmptyImportError)
export class BaralhosExceptionFilter implements ExceptionFilter {
  catch(error: BaralhoError, host: ArgumentsHost): void {
    const httpError = toHttpError(error);
    const response = host.switchToHttp().getResponse<Response>();
    response.status(httpError.getStatus()).json(httpError.getResponse());
  }
}

function toHttpError(error: BaralhoError): HttpException {
  if (error instanceof BaralhoNotFoundError) return new NotFoundException('Baralho não encontrado');
  if (error instanceof InvalidBaralhoTitleError) {
    return new BadRequestException('Informe um título de até 120 caracteres.');
  }
  return new BadRequestException('Nenhum baralho válido encontrado no arquivo.');
}
