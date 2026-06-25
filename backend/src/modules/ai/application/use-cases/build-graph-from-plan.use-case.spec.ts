import { describe, it, expect } from 'vitest';
import { BuildGraphFromPlanUseCase } from './build-graph-from-plan.use-case';
import type { GraphNameIndexRepository } from '../../domain/ports/graph-name-index-repository';
import type { GraphNodeInput, GraphNodeWriter } from '../../domain/ports/graph-node-writer';
import type { GraphEdgeInput, GraphEdgeWriter } from '../../domain/ports/graph-edge-writer';
import type { GraphDeckWriter } from '../../domain/ports/graph-deck-writer';

class FakeNames implements GraphNameIndexRepository {
  async loadNameIndex(): Promise<{ nameIndex: Map<string, string>; existingContext: string }> {
    return { nameIndex: new Map(), existingContext: '' };
  }
}

class FakeNodeWriter implements GraphNodeWriter {
  readonly created: GraphNodeInput[] = [];
  async createNode(_u: string, _g: string, input: GraphNodeInput): Promise<{ nodeId: string }> {
    this.created.push(input);
    return { nodeId: `n${this.created.length}` };
  }
}

class FakeEdgeWriter implements GraphEdgeWriter {
  readonly created: GraphEdgeInput[] = [];
  async createEdge(_u: string, _g: string, edge: GraphEdgeInput): Promise<void> {
    this.created.push(edge);
  }
}

class FakeDeckWriter implements GraphDeckWriter {
  calls: Array<{ nome: string; flashcardIds: string[] }> = [];
  async createBaralho(_u: string, _g: string, nome: string, flashcardIds: string[]): Promise<void> {
    this.calls.push({ nome, flashcardIds });
  }
}

const plan = {
  assunto: { nome: 'Bio', descricao: 'd' },
  topicos: [
    {
      nome: 'Cel',
      conceitos: [
        {
          nome: 'Mitose',
          nota: { titulo: 'N', conteudo: 'c' },
          flashcards: [{ pergunta: 'p', resposta: 'r' }],
        },
      ],
    },
  ],
  baralho: 'Deck',
};

describe('BuildGraphFromPlanUseCase', () => {
  function build() {
    const nodeWriter = new FakeNodeWriter();
    const edgeWriter = new FakeEdgeWriter();
    const deckWriter = new FakeDeckWriter();
    const useCase = new BuildGraphFromPlanUseCase(
      new FakeNames(),
      nodeWriter,
      edgeWriter,
      deckWriter,
    );
    return { useCase, nodeWriter, edgeWriter, deckWriter };
  }

  it('persists the full plan and reports the counts', async () => {
    const { useCase, nodeWriter, deckWriter } = build();
    const res = await useCase.execute('u1', 'g1', 'fonte', plan, true);

    expect(res).toEqual({
      assunto: 'Bio',
      topicos: 1,
      conceitos: 1,
      notas: 1,
      flashcards: 1,
      baralho: 'Deck',
    });
    expect(nodeWriter.created.map((n) => n.tipoNode)).toEqual([
      'ASSUNTO',
      'TOPICO',
      'CONCEITO',
      'NOTA',
      'FLASHCARD',
      'TEXTO_BRUTO',
    ]);
    expect(deckWriter.calls).toEqual([{ nome: 'Deck', flashcardIds: ['n5'] }]);
  });

  it('wires the hierarchy, note, flashcard and source edges', async () => {
    const { useCase, edgeWriter } = build();
    await useCase.execute('u1', 'g1', 'fonte', plan, true);
    expect(edgeWriter.created).toEqual([
      { sourceNodeId: 'n2', targetNodeId: 'n1', tipoRelacao: 'PERTENCE_A' },
      { sourceNodeId: 'n3', targetNodeId: 'n2', tipoRelacao: 'PERTENCE_A' },
      { sourceNodeId: 'n4', targetNodeId: 'n3', tipoRelacao: 'EXPLICA' },
      { sourceNodeId: 'n5', targetNodeId: 'n3', tipoRelacao: 'HERDA' },
      { sourceNodeId: 'n6', targetNodeId: 'n4', tipoRelacao: 'GERA' },
    ]);
  });

  it('skips the deck and source node when there are no flashcards and saveBruto is false', async () => {
    const { useCase, nodeWriter, deckWriter } = build();
    const noFc = { assunto: { nome: 'Bio' }, topicos: [{ nome: 'Cel', conceitos: [] }] };
    await useCase.execute('u1', 'g1', 'fonte', noFc, false);
    expect(deckWriter.calls).toEqual([]);
    expect(nodeWriter.created.map((n) => n.tipoNode)).toEqual(['ASSUNTO', 'TOPICO']);
  });
});
