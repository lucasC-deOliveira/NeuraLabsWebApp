import { describe, it, expect } from 'vitest';
import { PopulateGraphFromBaralhoUseCase } from './populate-graph-from-baralho.use-case';
import { BaralhoNotFoundError, EmptyBaralhoError, GraphNotFoundError } from '../../domain/errors';
import type {
  BaralhoForPopulation,
  BaralhoPopulationRepository,
} from '../../domain/ports/baralho-population-repository';
import type { GraphNameIndexRepository } from '../../domain/ports/graph-name-index-repository';
import type { GraphNodeInput, GraphNodeWriter } from '../../domain/ports/graph-node-writer';
import type { GraphEdgeInput, GraphEdgeWriter } from '../../domain/ports/graph-edge-writer';
import type { LlmPort } from '../../domain/ports/llm-port';

class FakeRepo implements BaralhoPopulationRepository {
  constructor(
    private readonly graph: boolean,
    private readonly baralho: BaralhoForPopulation | null,
    private readonly refs: Set<string> = new Set(),
  ) {}
  async graphExists(): Promise<boolean> {
    return this.graph;
  }
  async loadBaralho(): Promise<BaralhoForPopulation | null> {
    return this.baralho;
  }
  async loadFlashcardNodeRefs(): Promise<Set<string>> {
    return this.refs;
  }
}

class FakeNames implements GraphNameIndexRepository {
  constructor(private readonly index = new Map<string, string>()) {}
  async loadNameIndex(): Promise<{ nameIndex: Map<string, string>; existingContext: string }> {
    return { nameIndex: this.index, existingContext: '' };
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

class FakeLlm implements LlmPort {
  constructor(private readonly response: string) {}
  async complete(): Promise<string> {
    return this.response;
  }
}

const deck = (flashcards: BaralhoForPopulation['flashcards']): BaralhoForPopulation => ({
  titulo: 'Deck',
  flashcards,
});

function build(repo: BaralhoPopulationRepository, llm: LlmPort, names = new FakeNames()) {
  const nodeWriter = new FakeNodeWriter();
  const edgeWriter = new FakeEdgeWriter();
  const useCase = new PopulateGraphFromBaralhoUseCase(repo, names, nodeWriter, edgeWriter, llm);
  return { useCase, nodeWriter, edgeWriter };
}

describe('PopulateGraphFromBaralhoUseCase', () => {
  it('throws when the graph does not exist', async () => {
    const { useCase } = build(new FakeRepo(false, null), new FakeLlm('{}'));
    await expect(useCase.execute('u1', 'g1', 'b1')).rejects.toBeInstanceOf(GraphNotFoundError);
  });

  it('throws when the deck is not found', async () => {
    const { useCase } = build(new FakeRepo(true, null), new FakeLlm('{}'));
    await expect(useCase.execute('u1', 'g1', 'b1')).rejects.toBeInstanceOf(BaralhoNotFoundError);
  });

  it('throws when the deck has no flashcards', async () => {
    const { useCase } = build(new FakeRepo(true, deck([])), new FakeLlm('{}'));
    await expect(useCase.execute('u1', 'g1', 'b1')).rejects.toBeInstanceOf(EmptyBaralhoError);
  });

  it('builds the hierarchy and links flashcards present in the graph', async () => {
    const flashcards = [{ id: 'fc0', pergunta: 'p', resposta: 'r' }];
    const repo = new FakeRepo(true, deck(flashcards), new Set(['fc0']));
    const llm = new FakeLlm(
      JSON.stringify({
        assuntos: [{ nome: 'Bio' }],
        topicos: [{ nome: 'Cel', assunto: 'Bio' }],
        conceitos: [{ nome: 'Mitose', topico: 'Cel', indices: [0] }],
      }),
    );
    const { useCase, nodeWriter, edgeWriter } = build(repo, llm);

    const res = await useCase.execute('u1', 'g1', 'b1');

    expect(res).toEqual({ baralhoNome: 'Deck', assuntos: 1, topicos: 1, conceitos: 1 });
    expect(nodeWriter.created.map((n) => n.tipoNode)).toEqual(['ASSUNTO', 'TOPICO', 'CONCEITO']);
    // TOPICO→ASSUNTO, CONCEITO→TOPICO, FLASHCARD(fc0)→CONCEITO
    expect(edgeWriter.created).toEqual([
      { sourceNodeId: 'n2', targetNodeId: 'n1', tipoRelacao: 'PERTENCE_A' },
      { sourceNodeId: 'n3', targetNodeId: 'n2', tipoRelacao: 'PERTENCE_A' },
      { sourceNodeId: 'fc0', targetNodeId: 'n3', tipoRelacao: 'DEFINE' },
    ]);
  });
});
