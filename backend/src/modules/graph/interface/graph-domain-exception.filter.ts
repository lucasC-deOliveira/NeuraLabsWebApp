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
  DeckTitleRequiredError,
  DuplicateEdgeError,
  EdgeNotFoundError,
  FlashcardsNotOwnedError,
  GraphNodesNotFoundError,
  GraphNotFoundError,
  InvalidEdgeWeightError,
  InvalidSubgraphRelationError,
  NodeNotInGraphError,
  NodeValidationError,
  NoNodesToExtractError,
  NoValidNodesError,
  ParentGraphNotFoundError,
  ProvaNotFoundError,
  RelationNotAllowedError,
  SubgraphNotFoundError,
  RootNodeError,
  TooManyFlashcardsError,
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
  | UnknownNodeTypeError
  | DeckTitleRequiredError
  | TooManyFlashcardsError
  | FlashcardsNotOwnedError
  | ProvaNotFoundError
  | ParentGraphNotFoundError
  | InvalidSubgraphRelationError
  | NoNodesToExtractError
  | NoValidNodesError
  | SubgraphNotFoundError;

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
  DeckTitleRequiredError,
  TooManyFlashcardsError,
  FlashcardsNotOwnedError,
  ProvaNotFoundError,
  ParentGraphNotFoundError,
  InvalidSubgraphRelationError,
  NoNodesToExtractError,
  NoValidNodesError,
  SubgraphNotFoundError,
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
    if (error instanceof ProvaNotFoundError) return 'Prova não encontrada';
    if (error instanceof ParentGraphNotFoundError) return 'Grafo pai não encontrado';
    if (error instanceof SubgraphNotFoundError) return 'Subgrafo não encontrado';
    return null;
  }

  private badRequestMessage(error: GraphDomainError): string {
    return (
      this.edgeNodeBadRequest(error) ??
      this.deckSubgraphBadRequest(error) ??
      'Operação inválida no grafo'
    );
  }

  private edgeNodeBadRequest(error: GraphDomainError): string | null {
    if (error instanceof DuplicateEdgeError)
      return 'Relação já existe entre esses nós com este tipo';
    if (error instanceof InvalidEdgeWeightError) return 'Peso inválido (0 a 2)';
    if (error instanceof RootNodeError)
      return 'O assunto-raiz do grafo não pode ser removido — ele é deletado junto com o grafo.';
    if (error instanceof UnknownNodeTypeError) return `Tipo de nó desconhecido: ${error.tipoNode}`;
    if (error instanceof NodeValidationError) return nodeValidationMessage(error.code);
    return null;
  }

  private deckSubgraphBadRequest(error: GraphDomainError): string | null {
    if (error instanceof DeckTitleRequiredError) return 'O título do baralho é obrigatório';
    if (error instanceof TooManyFlashcardsError)
      return `Máximo de ${error.max} flashcards por baralho`;
    if (error instanceof FlashcardsNotOwnedError)
      return 'Um ou mais flashcards não pertencem ao usuário';
    if (error instanceof InvalidSubgraphRelationError)
      return 'Tipo de relação inválido para subgrafo';
    if (error instanceof NoNodesToExtractError) return 'Selecione ao menos um nó para extrair';
    if (error instanceof NoValidNodesError) return 'Nenhum nó válido encontrado';
    return null;
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
    INVALID_NOTE_SUBTYPE: 'Subtipo inválido',
  };
  return messages[code];
}
