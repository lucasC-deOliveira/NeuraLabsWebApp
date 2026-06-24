import { Injectable } from '@nestjs/common';
import { CreateEdgeUseCase } from '../modules/graph/application/use-cases/create-edge.use-case';
import { CreateNodeUseCase } from '../modules/graph/application/use-cases/create-node.use-case';
import { CreateDeckUseCase } from '../modules/graph/application/use-cases/create-deck.use-case';

type TipoNode =
  | 'ASSUNTO'
  | 'TOPICO'
  | 'CONCEITO'
  | 'FLASHCARD'
  | 'NOTA'
  | 'TEXTO_BRUTO'
  | 'BARALHO'
  | 'GRAFO_REF'
  | 'QUESTION'
  | 'PROVA';

export interface CreateNodeInput {
  tipoNode: TipoNode;
  nome?: string;
  descricao?: string | null;
  pergunta?: string;
  resposta?: string;
  titulo?: string;
  conteudo?: string;
  tipoNota?: string;
  subtipo?: string;
  fonte?: string | null;
  texto?: string;
  posicaoX?: number | null;
  posicaoY?: number | null;
  nivelDominio?: number;
}

// Thin facade kept for the ai.service (AI generation), which still creates nodes,
// edges and decks through it. Each method delegates to the migrated use-case;
// the class disappears once ai.service injects the use-cases directly.
@Injectable()
export class GraphService {
  constructor(
    private readonly createEdgeUseCase: CreateEdgeUseCase,
    private readonly createNodeUseCase: CreateNodeUseCase,
    private readonly createDeckUseCase: CreateDeckUseCase,
  ) {}

  async createNode(userId: string, grafoId: string, input: CreateNodeInput) {
    return this.createNodeUseCase.execute(userId, grafoId, input);
  }

  async createEdge(
    userId: string,
    grafoId: string,
    input: { sourceNodeId: string; targetNodeId: string; tipoRelacao: string; peso?: number },
  ): Promise<{ edgeId: string }> {
    return this.createEdgeUseCase.execute({ userId, grafoId, ...input });
  }

  async createBaralho(userId: string, grafoId: string, titulo: string, flashcardIds: string[]) {
    return this.createDeckUseCase.execute(userId, grafoId, titulo, flashcardIds);
  }
}
