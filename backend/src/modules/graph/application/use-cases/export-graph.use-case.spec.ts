import { describe, it, expect, beforeEach } from 'vitest';
import { ExportGraphUseCase } from './export-graph.use-case';
import { GraphNotFoundError } from '../../domain/errors';
import type {
  ExportGraphHeader,
  ExportNodeRow,
  GraphExportRepository,
} from '../../domain/ports/graph-export-repository';
import type { NodeDetails, NodeDetailsQuery } from '../../domain/ports/node-details-query';
import type { GraphEdgesQuery, GraphEdgeView } from '../../domain/ports/graph-edges-query';

class FakeExportRepo implements GraphExportRepository {
  header: ExportGraphHeader | null = { id: 'g1', nome: 'Bio' };
  rows: ExportNodeRow[] = [];
  async findGraph(): Promise<ExportGraphHeader | null> {
    return this.header;
  }
  async listNodes(): Promise<ExportNodeRow[]> {
    return this.rows;
  }
}

class FakeDetails implements NodeDetailsQuery {
  constructor(private readonly map: Record<string, NodeDetails | null>) {}
  async findDetails(_u: string, _t: string, refId: string): Promise<NodeDetails | null> {
    return this.map[refId] ?? null;
  }
}

class FakeEdges implements GraphEdgesQuery {
  constructor(private readonly rows: GraphEdgeView[]) {}
  async listForGraph(): Promise<GraphEdgeView[]> {
    return this.rows;
  }
}

const row = (referenciaId: string): ExportNodeRow => ({
  tipoNode: 'CONCEITO',
  referenciaId,
  pesoEdital: null,
  posicaoX: 1,
  posicaoY: 2,
  nivelDominio: 0,
});

describe('ExportGraphUseCase', () => {
  let repo: FakeExportRepo;

  beforeEach(() => {
    repo = new FakeExportRepo();
  });

  it('throws when the graph is not found', async () => {
    repo.header = null;
    const useCase = new ExportGraphUseCase(repo, new FakeDetails({}), new FakeEdges([]));
    await expect(useCase.execute('u1', 'missing')).rejects.toBeInstanceOf(GraphNotFoundError);
  });

  it('attaches content to nodes and skips unresolvable ones', async () => {
    repo.rows = [row('c1'), row('gone')];
    const details = new FakeDetails({ c1: { nome: 'Mitose' } });
    const useCase = new ExportGraphUseCase(repo, details, new FakeEdges([]));
    const res = await useCase.execute('u1', 'g1');
    expect(res.nodes).toEqual([
      {
        ref: 'c1',
        tipo: 'CONCEITO',
        posicaoX: 1,
        posicaoY: 2,
        nivelDominio: 0,
        pesoEdital: null,
        nome: 'Mitose',
      },
    ]);
  });

  // Regression: the projection is spread over the node, so a `tipo` key in the
  // content overwrote the node's own type — a QUESTION was exported as
  // `tipo: 'MULTIPLA_ESCOLHA'` and came back from the vault as an unknown type.
  // The question projector now names that field `tipoQuestao`.
  it('keeps the node type when the content carries its own type field', async () => {
    repo.rows = [{ ...row('q1'), tipoNode: 'QUESTION' }];
    const details = new FakeDetails({
      q1: { enunciado: 'O que é um SLA?', tipoQuestao: 'MULTIPLA_ESCOLHA', gabarito: 'A' },
    });
    const useCase = new ExportGraphUseCase(repo, details, new FakeEdges([]));
    const res = await useCase.execute('u1', 'g1');
    expect(res.nodes[0].tipo).toBe('QUESTION');
    expect(res.nodes[0]).toMatchObject({ tipoQuestao: 'MULTIPLA_ESCOLHA' });
  });

  it('maps edges to the vault format', async () => {
    const edges = new FakeEdges([
      {
        id: 'e1',
        source: 's',
        target: 't',
        tipoRelacao: 'CONTEM',
        peso: 1,
        sourceLabel: 'S',
        targetLabel: 'T',
      },
    ]);
    const useCase = new ExportGraphUseCase(repo, new FakeDetails({}), edges);
    const res = await useCase.execute('u1', 'g1');
    expect(res.edges).toEqual([{ origem: 's', destino: 't', relacao: 'CONTEM', peso: 1 }]);
  });
});
