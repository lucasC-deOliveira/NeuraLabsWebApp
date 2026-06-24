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
  NodeValidationError,
  RelationNotAllowedError,
  RootNodeError,
  UnknownNodeTypeError,
  type NodeValidationCode,
} from '../domain/errors';

type GraphDomainError =
  | GraphNodesNotFoundError
  | EdgeNotFoundError
  | DuplicateEdgeError
  | RelationNotAllowedError
  | InvalidEdgeWeightError
  | GraphNotFoundError
  | NodeNotInGraphError
  | RootNodeError
  | NodeValidationError
  | UnknownNodeTypeError;

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
  NodeValidationError,
  UnknownNodeTypeError,
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
    if (error instanceof RelationNotAllowedError) return this.relationNotAllowed(error);
    return new BadRequestException(this.badRequestMessage(error));
  }

  private notFoundMessage(error: GraphDomainError): string | null {
    if (error instanceof GraphNodesNotFoundError) return 'Nó(s) não encontrado(s) no grafo';
    if (error instanceof EdgeNotFoundError) return 'Relação não encontrada';
    if (error instanceof GraphNotFoundError) return 'Grafo não encontrado';
    if (error instanceof NodeNotInGraphError) return 'Nó não encontrado no grafo';
    return null;
  }

  private badRequestMessage(error: GraphDomainError): string {
    if (error instanceof DuplicateEdgeError)
      return 'Relação já existe entre esses nós com este tipo';
    if (error instanceof InvalidEdgeWeightError) return 'Peso inválido (0 a 2)';
    if (error instanceof RootNodeError)
      return 'O assunto-raiz do grafo não pode ser removido — ele é deletado junto com o grafo.';
    if (error instanceof UnknownNodeTypeError) return `Tipo de nó desconhecido: ${error.tipoNode}`;
    if (error instanceof NodeValidationError) return nodeValidationMessage(error.code);
    return 'Operação inválida no grafo';
  }

  private relationNotAllowed(error: RelationNotAllowedError): HttpException {
    const message = error.allowed.length
      ? `Relação ${error.relation} não permitida entre ${error.sourceType} e ${error.targetType}`
      : `${error.sourceType} e ${error.targetType} não podem ser relacionados`;
    return new BadRequestException(message);
  }
}

function nodeValidationMessage(code: NodeValidationCode): string {
  const messages: Record<NodeValidationCode, string> = {
    NOTE_TITLE_REQUIRED: 'O título da nota é obrigatório',
    NOTE_SUBTYPE_REQUIRED: 'Selecione o subtipo da nota',
    LITERATURE_NOTE_SOURCE_REQUIRED: 'Notas de literatura exigem a fonte',
    RAW_TEXT_REQUIRED: 'O texto original é obrigatório',
  };
  return messages[code];
}
