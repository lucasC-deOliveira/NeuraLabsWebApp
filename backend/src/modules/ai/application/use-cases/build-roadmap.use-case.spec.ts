import { describe, it, expect } from 'vitest';
import { BuildRoadmapUseCase } from './build-roadmap.use-case';
import type {
  LearningGraph,
  LearningGraphRepository,
} from '../../domain/ports/learning-graph-repository';
import type { ConceitoImportanceSource } from '../../domain/ports/conceito-importance-source';
import type { ImportanceRow } from '../../domain/services/conceito-importance';
import type { EditalCoverageSource } from '../../domain/ports/edital-coverage-source';
import type {
  RoadmapTrilhaRepository,
  SavedTrilha,
} from '../../domain/ports/roadmap-trilha-repository';
import type { PathStep } from '../../domain/services/learning-path';

class FakeLearningGraph implements LearningGraphRepository {
  constructor(private readonly graph: LearningGraph = { nodes: [], edges: [] }) {}
  async loadLearningGraph(): Promise<LearningGraph> {
    return this.graph;
  }
}

class FakeImportance implements ConceitoImportanceSource {
  lastProvaId: string | undefined;
  // Rows keyed by provaId; "" = aggregate (no provaId passed).
  constructor(private readonly byProva: Record<string, ImportanceRow[]>) {}
  async load(_u: string, _g: string, provaId?: string): Promise<ImportanceRow[]> {
    this.lastProvaId = provaId;
    return this.byProva[provaId ?? ""] ?? this.byProva[""] ?? [];
  }
}

class FakeEditalCoverage implements EditalCoverageSource {
  lastEditalId: string | undefined;
  // Coverage keyed by editalId; "" = the aggregate (no editalId passed).
  constructor(private readonly byEdital: Record<string, string[]> = {}) {}
  async load(_u: string, _g: string, editalId?: string): Promise<Set<string>> {
    this.lastEditalId = editalId;
    return new Set(this.byEdital[editalId ?? ""] ?? []);
  }
}

class FakeRoadmapTrilha implements RoadmapTrilhaRepository {
  saved: PathStep[] | null = null;
  savedModo: string | null = null;
  constructor(private readonly seed: SavedTrilha | null = null) {}
  async load(): Promise<SavedTrilha | null> {
    return this.seed;
  }
  async save(_u: string, _g: string, modo: string, itens: PathStep[]): Promise<Date> {
    this.saved = itens;
    this.savedModo = modo;
    return new Date('2026-07-09T00:00:00Z');
  }
}

const row = (conceitoId: string, provaFreq: number): ImportanceRow => ({
  conceitoId,
  nome: conceitoId.toUpperCase(),
  topicoId: null,
  provaFreq,
});

const ids = (steps: PathStep[]): string[] => steps.map((s) => s.nodeId);

describe('BuildRoadmapUseCase', () => {
  it('orders by past-exam frequency (prova mode) and persists the full order on first run', async () => {
    const trilhas = new FakeRoadmapTrilha();
    const useCase = new BuildRoadmapUseCase(
      new FakeLearningGraph(),
      new FakeImportance({ "": [row('a', 1), row('b', 5), row('c', 3)] }),
      new FakeEditalCoverage(),
      trilhas,
    );

    const res = await useCase.execute('u1', 'g1', 'prova');

    expect(ids(res.itens)).toEqual(['b', 'c', 'a']); // 5 > 3 > 1
    expect(res.novos).toBe(0);
    expect(ids(trilhas.saved!)).toEqual(['b', 'c', 'a']);
  });

  it('edital mode ranks covered concepts first', async () => {
    const useCase = new BuildRoadmapUseCase(
      new FakeLearningGraph(),
      new FakeImportance({ "": [row('a', 9), row('b', 0)] }),
      new FakeEditalCoverage({ "": ['b'] }),
      new FakeRoadmapTrilha(),
    );

    const res = await useCase.execute('u1', 'g1', 'edital');

    expect(ids(res.itens)).toEqual(['b', 'a']); // b covered → first despite lower provaFreq
  });

  it('scopes coverage to the chosen edital and persists under a per-edital key', async () => {
    const coverage = new FakeEditalCoverage({ ed1: ['a'], ed2: ['b'] });
    const trilha = new FakeRoadmapTrilha();
    const useCase = new BuildRoadmapUseCase(
      new FakeLearningGraph(),
      new FakeImportance({ "": [row('a', 0), row('b', 0)] }),
      coverage,
      trilha,
    );

    const res = await useCase.execute('u1', 'g1', 'edital', { editalId: 'ed2' });

    expect(coverage.lastEditalId).toBe('ed2');
    expect(ids(res.itens)[0]).toBe('b'); // only ed2 covers b
    expect(trilha.savedModo).toBe('edital|e:ed2'); // separate trilha per edital
  });

  it('scopes prova frequency to the chosen prova and persists under a per-prova key', async () => {
    const importance = new FakeImportance({
      p1: [row('a', 9), row('b', 0)],
      p2: [row('a', 0), row('b', 9)],
    });
    const trilha = new FakeRoadmapTrilha();
    const useCase = new BuildRoadmapUseCase(
      new FakeLearningGraph(),
      importance,
      new FakeEditalCoverage(),
      trilha,
    );

    const res = await useCase.execute('u1', 'g1', 'prova', { provaId: 'p2' });

    expect(importance.lastProvaId).toBe('p2');
    expect(ids(res.itens)).toEqual(['b', 'a']); // p2 tests b the most
    expect(trilha.savedModo).toBe('prova|p:p2');
  });

  it('inserts new concepts into the persisted order and reports how many are new', async () => {
    const seed: SavedTrilha = {
      itens: [
        { nodeId: 'a', nome: 'A', tipo: 'CONCEITO', motivo: '' },
        { nodeId: 'b', nome: 'B', tipo: 'CONCEITO', motivo: '' },
      ],
      dataGeracao: new Date('2026-07-01T00:00:00Z'),
    };
    const useCase = new BuildRoadmapUseCase(
      new FakeLearningGraph(),
      new FakeImportance({ "": [row('a', 1), row('b', 1), row('c', 9)] }),
      new FakeEditalCoverage(),
      new FakeRoadmapTrilha(seed),
    );

    const res = await useCase.execute('u1', 'g1', 'prova');

    expect(res.novos).toBe(1); // 'c' is new
    expect(ids(res.itens)).toEqual(['c', 'a', 'b']); // c (freq 9) slots at the top
  });

  it('regenerate ignores the persisted trilha', async () => {
    const seed: SavedTrilha = {
      itens: [{ nodeId: 'z', nome: 'Z', tipo: 'CONCEITO', motivo: '' }],
      dataGeracao: new Date('2026-07-01T00:00:00Z'),
    };
    const useCase = new BuildRoadmapUseCase(
      new FakeLearningGraph(),
      new FakeImportance({ "": [row('a', 1)] }),
      new FakeEditalCoverage(),
      new FakeRoadmapTrilha(seed),
    );

    const res = await useCase.execute('u1', 'g1', 'prova', { regenerate: true });

    expect(ids(res.itens)).toEqual(['a']);
    expect(res.novos).toBe(0);
  });

  it('throws for ai mode when no ai builder is wired', async () => {
    const useCase = new BuildRoadmapUseCase(
      new FakeLearningGraph(),
      new FakeImportance({ "": [] }),
      new FakeEditalCoverage(),
      new FakeRoadmapTrilha(),
    );
    await expect(useCase.execute('u1', 'g1', 'ai')).rejects.toThrow('ai');
  });

  it('delegates ai mode to the ai builder, forwarding regenerate', async () => {
    const calls: Array<{ regenerate: boolean }> = [];
    const aiBuilder = {
      buildAi: async (_u: string, _g: string, regenerate: boolean) => {
        calls.push({ regenerate });
        return { itens: [], dataGeracao: '2026-07-09T00:00:00Z', novos: 0 };
      },
    };
    const useCase = new BuildRoadmapUseCase(
      new FakeLearningGraph(),
      new FakeImportance({ "": [] }),
      new FakeEditalCoverage(),
      new FakeRoadmapTrilha(),
      aiBuilder,
    );

    await useCase.execute('u1', 'g1', 'ai', { regenerate: true });

    expect(calls).toEqual([{ regenerate: true }]);
  });
});
