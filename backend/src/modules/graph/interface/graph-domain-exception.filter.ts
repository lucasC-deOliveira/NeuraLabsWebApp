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
  GraphNotFoundError,
  InvalidEdgeWeightError,
  NodeNotInGraphError,
  RelationNotAllowedError,
  RootNodeError,
} from '../domain/errors';

type GraphDomainError =
  | GraphNodesNotFoundError
  | EdgeNotFoundError
  | DuplicateEdgeError
  | RelationNotAllowedError
  | InvalidEdgeWeightError
  | GraphNotFoundError
  | NodeNotInGraphError
  | RootNodeError;

// Translates Graph domain errors into HTTP responses. Domain messages stay
// internal (English); user-facing messages produced here are in Portuguese.
@Catch(
  GraphNodesNotFoundError,
  EdgeNotFoundError,
  DuplicateEdgeError,
  RelationNotAllowedError,
  InvalidEdgeWeightError,
  GraphNotFoundError,
  NodeNotInGraphError,
  RootNodeError,
)
export class GraphDomainExceptionFilter implements ExceptionFilter {
  catch(error: GraphDomainError, host: ArgumentsHost): void {
    const httpError = this.toHttpException(error);
    const response = host.switchToHttp().getResponse<Response>();
    response.status(httpError.getStatus()).json(httpError.getResponse());
  }

  private toHttpException(error: GraphDomainError): HttpException {
    const notFoundMessage = this.notFoundMessage(error);
    if (notFoundMessage) return new NotFoundException(notFoundMessage);
    if (error instanceof DuplicateEdgeError) {
      return new BadRequestException('Relação já existe entre esses nós com este tipo');
    }
    if (error instanceof InvalidEdgeWeightError) {
      return new BadRequestException('Peso inválido (0 a 2)');
    }
    if (error instanceof RootNodeError) {
      return new BadRequestException(
        'O assunto-raiz do grafo não pode ser removido — ele é deletado junto com o grafo.',
      );
    }
    if (error instanceof RelationNotAllowedError) return this.relationNotAllowed(error);
    return new BadRequestException('Operação inválida no grafo');
  }

  private notFoundMessage(error: GraphDomainError): string | null {
    if (error instanceof GraphNodesNotFoundError) return 'Nó(s) não encontrado(s) no grafo';
    if (error instanceof EdgeNotFoundError) return 'Relação não encontrada';
    if (error instanceof GraphNotFoundError) return 'Grafo não encontrado';
    if (error instanceof NodeNotInGraphError) return 'Nó não encontrado no grafo';
    return null;
  }

  private relationNotAllowed(error: RelationNotAllowedError): HttpException {
    const message = error.allowed.length
      ? `Relação ${error.relation} não permitida entre ${error.sourceType} e ${error.targetType}`
      : `${error.sourceType} e ${error.targetType} não podem ser relacionados`;
    return new BadRequestException(message);
  }
}
