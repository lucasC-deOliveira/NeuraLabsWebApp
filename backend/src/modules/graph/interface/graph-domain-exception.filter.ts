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
  DuplicateEdgeError,
  EdgeNotFoundError,
  GraphNodesNotFoundError,
  InvalidEdgeWeightError,
  RelationNotAllowedError,
} from '../domain/errors';

type GraphDomainError =
  | GraphNodesNotFoundError
  | EdgeNotFoundError
  | DuplicateEdgeError
  | RelationNotAllowedError
  | InvalidEdgeWeightError;

// Translates Graph domain errors into HTTP responses. Domain messages stay
// internal (English); user-facing messages produced here are in Portuguese.
@Catch(
  GraphNodesNotFoundError,
  EdgeNotFoundError,
  DuplicateEdgeError,
  RelationNotAllowedError,
  InvalidEdgeWeightError,
)
export class GraphDomainExceptionFilter implements ExceptionFilter {
  catch(error: GraphDomainError, host: ArgumentsHost): void {
    const httpError = this.toHttpException(error);
    const response = host.switchToHttp().getResponse<Response>();
    response.status(httpError.getStatus()).json(httpError.getResponse());
  }

  private toHttpException(error: GraphDomainError): HttpException {
    if (error instanceof GraphNodesNotFoundError) {
      return new NotFoundException('Nó(s) não encontrado(s) no grafo');
    }
    if (error instanceof EdgeNotFoundError) {
      return new NotFoundException('Relação não encontrada');
    }
    if (error instanceof DuplicateEdgeError) {
      return new BadRequestException('Relação já existe entre esses nós com este tipo');
    }
    if (error instanceof InvalidEdgeWeightError) {
      return new BadRequestException('Peso inválido (0 a 2)');
    }
    return this.relationNotAllowed(error);
  }

  private relationNotAllowed(error: RelationNotAllowedError): HttpException {
    const message = error.allowed.length
      ? `Relação ${error.relation} não permitida entre ${error.sourceType} e ${error.targetType}`
      : `${error.sourceType} e ${error.targetType} não podem ser relacionados`;
    return new BadRequestException(message);
  }
}
