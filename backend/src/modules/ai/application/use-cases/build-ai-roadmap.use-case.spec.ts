import { describe, it, expect } from 'vitest';
import { BuildAiRoadmapUseCase } from './build-ai-roadmap.use-case';
import type { GenerateLearningPathUseCase } from './generate-learning-path.use-case';
import type {
  LearningGraph,
  LearningGraphRepository,
} from '../../domain/ports/learning-graph-repository';
import type {
  RoadmapTrilhaRepository,
  SavedTrilha,
} from '../../domain/ports/roadmap-trilha-repository';
import type { LlmPort } from '../../domain/ports/llm-port';
import type { PathStep } from '../../domain/services/learning-path';

const step = (nodeId: string): PathStep => ({ nodeId, nome: nodeId.toUpperCase(), tipo: 'CONCEITO', motivo: '' });

class FakeGenerate {
  constructor(private readonly steps: PathStep[]) {}
  async execute(): Promise<{ steps: PathStep[] }> {
    return { steps: this.steps };
  }
}

class FakeLearningGraph implements LearningGraphRepository {
  constructor(private readonly graph: LearningGraph) {}
  async loadLearningGraph(): Promise<LearningGraph> {
    return this.graph;
  }
}

class FakeTrilha implements RoadmapTrilhaRepository {
  saved: PathStep[] | null = null;
  constructor(private readonly seed: SavedTrilha | null = null) {}
  async load(): Promise<SavedTrilha | null> {
    return this.seed;
  }
  async save(_u: string, _g: string, _m: string, itens: PathStep[]): Promise<Date> {
    this.saved = itens;
    return new Date('2026-07-09T00:00:00Z');
  }
}

class FakeLlm implements LlmPort {
  constructor(private readonly reply: string) {}
  async complete(): Promise<string> {
    return this.reply;
  }
}

const graphWith = (nodeIds: string[]): LearningGraph => ({
  nodes: nodeIds.map((id) => ({ id, nome: id.toUpperCase(), tipo: 'CONCEITO' })),
  edges: [],
});
const ids = (steps: PathStep[]): string[] => steps.map((s) => s.nodeId);

describe('BuildAiRoadmapUseCase', () => {
  it('full-generates via the learning-path use-case on first run and persists it', async () => {
    const trilha = new FakeTrilha(null);
    const useCase = new BuildAiRoadmapUseCase(
      new FakeGenerate([step('a'), step('b')]) as unknown as GenerateLearningPathUseCase,
      new FakeLearningGraph(graphWith(['a', 'b'])),
      trilha,
      new FakeLlm(''),
    );

    const res = await useCase.buildAi('u1', 'g1', false);

    expect(ids(res.itens)).toEqual(['a', 'b']);
    expect(res.novos).toBe(0);
    expect(ids(trilha.saved!)).toEqual(['a', 'b']);
  });

  it('places only the new nodes after their LLM-chosen anchor, keeping the saved order', async () => {
    const seed: SavedTrilha = { itens: [step('a'), step('b')], dataGeracao: new Date() };
    const useCase = new BuildAiRoadmapUseCase(
      new FakeGenerate([]) as unknown as GenerateLearningPathUseCase,
      new FakeLearningGraph(graphWith(['a', 'b', 'c'])), // c is new
      new FakeTrilha(seed),
      new FakeLlm(JSON.stringify({ placements: [{ nome: 'C', after: 'A' }] })),
    );

    const res = await useCase.buildAi('u1', 'g1', false);

    expect(ids(res.itens)).toEqual(['a', 'c', 'b']);
    expect(res.novos).toBe(1);
  });

  it('returns the persisted trilha untouched when nothing is new', async () => {
    const seed: SavedTrilha = { itens: [step('a')], dataGeracao: new Date('2026-07-01T00:00:00Z') };
    const trilha = new FakeTrilha(seed);
    const useCase = new BuildAiRoadmapUseCase(
      new FakeGenerate([]) as unknown as GenerateLearningPathUseCase,
      new FakeLearningGraph(graphWith(['a'])),
      trilha,
      new FakeLlm(''),
    );

    const res = await useCase.buildAi('u1', 'g1', false);

    expect(res.novos).toBe(0);
    expect(trilha.saved).toBeNull(); // no re-save when unchanged
  });

  it('appends new nodes when the LLM reply is unusable', async () => {
    const seed: SavedTrilha = { itens: [step('a'), step('b')], dataGeracao: new Date() };
    const useCase = new BuildAiRoadmapUseCase(
      new FakeGenerate([]) as unknown as GenerateLearningPathUseCase,
      new FakeLearningGraph(graphWith(['a', 'b', 'c'])),
      new FakeTrilha(seed),
      new FakeLlm('not json'),
    );

    const res = await useCase.buildAi('u1', 'g1', false);

    expect(ids(res.itens)).toEqual(['a', 'b', 'c']); // appended
    expect(res.novos).toBe(1);
  });

  it('regenerate ignores the persisted trilha and full-generates', async () => {
    const seed: SavedTrilha = { itens: [step('z')], dataGeracao: new Date() };
    const useCase = new BuildAiRoadmapUseCase(
      new FakeGenerate([step('a')]) as unknown as GenerateLearningPathUseCase,
      new FakeLearningGraph(graphWith(['a'])),
      new FakeTrilha(seed),
      new FakeLlm(''),
    );

    const res = await useCase.buildAi('u1', 'g1', true);

    expect(ids(res.itens)).toEqual(['a']);
  });
});
