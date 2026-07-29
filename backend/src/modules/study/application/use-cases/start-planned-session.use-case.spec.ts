import { describe, it, expect } from 'vitest';
import {
  StartPlannedSessionUseCase,
  type TodayPlanProvider,
} from './start-planned-session.use-case';
import type { TodayPlan } from './get-today-plan.use-case';
import type { StudyCardQuery, StudyCardView } from '../../domain/ports/study-card-query';
import type { RoadmapNewCardsQuery } from '../../domain/ports/roadmap-new-cards-query';
import type {
  RoadmapQuestionsQuery,
  PlanQuestion,
} from '../../domain/ports/roadmap-questions-query';
import type { StudySessionRepository } from '../../domain/ports/study-session-repository';
import type { StudySession } from '../../domain/entities/study-session';
import type { CardConceptSource } from '../../domain/ports/card-concept-source';
import type { PlanContentSource } from '../../domain/ports/plan-content-source';

const card = (id: string, conceito: string | null): StudyCardView =>
  ({ id, conceito }) as StudyCardView;

class FakeToday implements TodayPlanProvider {
  constructor(private readonly plan: TodayPlan | null) {}
  execute(): Promise<TodayPlan | null> {
    return Promise.resolve(this.plan);
  }
}

class FakeCards implements StudyCardQuery {
  constructor(private readonly due: StudyCardView[]) {}
  findDueCards(): Promise<StudyCardView[]> {
    return Promise.resolve(this.due);
  }
  findNewCards(): Promise<StudyCardView[]> {
    return Promise.resolve([]);
  }
}

class FakeNewCards implements RoadmapNewCardsQuery {
  public askedLimit = -1;
  constructor(private readonly fresh: StudyCardView[]) {}
  findByRoadmap(_u: string, _g: string[], _m: string, limit: number): Promise<StudyCardView[]> {
    this.askedLimit = limit;
    return Promise.resolve(this.fresh.slice(0, limit));
  }
}

class FakeQuestions implements RoadmapQuestionsQuery {
  constructor(private readonly qs: PlanQuestion[] = []) {}
  findByRoadmap(_u: string, _g: string[], _m: string, limit: number): Promise<PlanQuestion[]> {
    return Promise.resolve(this.qs.slice(0, limit));
  }
}

class FakeSessions implements StudySessionRepository {
  start(): Promise<StudySession> {
    return Promise.resolve({ id: 's1' } as unknown as StudySession);
  }
  findActive(): Promise<StudySession | null> {
    return Promise.resolve(null);
  }
  save(): Promise<void> {
    return Promise.resolve();
  }
}

class FakeCardConcepts implements CardConceptSource {
  constructor(private readonly map: Map<string, string> = new Map()) {}
  conceptsFor(): Promise<Map<string, string>> {
    return Promise.resolve(this.map);
  }
}

interface ContentOpts {
  due?: StudyCardView[];
  fresh?: StudyCardView[];
  questions?: PlanQuestion[];
  excluded?: { flashcards: Set<string>; questions: Set<string> };
}

class FakeContent implements PlanContentSource {
  constructor(private readonly opts: ContentOpts = {}) {}
  dueCardsFromBaralhos(): Promise<StudyCardView[]> {
    return Promise.resolve(this.opts.due ?? []);
  }
  newCardsFromBaralhos(): Promise<StudyCardView[]> {
    return Promise.resolve(this.opts.fresh ?? []);
  }
  questionsFromProvas(): Promise<PlanQuestion[]> {
    return Promise.resolve(this.opts.questions ?? []);
  }
  excludedEntityIds(): Promise<{ flashcards: Set<string>; questions: Set<string> }> {
    return Promise.resolve(this.opts.excluded ?? { flashcards: new Set(), questions: new Set() });
  }
}

const planWith = (over: Partial<TodayPlan['plan']>, novos: number): TodayPlan =>
  ({
    plan: {
      grafoIds: ['g1'],
      prioridade: 'prova',
      baralhoIds: [] as string[],
      provaIds: [] as string[],
      conceitosExcluidos: [] as string[],
      ...over,
    },
    target: { novos },
  }) as unknown as TodayPlan;

const todayPlan = (novos: number): TodayPlan => planWith({}, novos);

describe('StartPlannedSessionUseCase', () => {
  it('returns null when the graph has no plan', async () => {
    const useCase = new StartPlannedSessionUseCase(
      new FakeToday(null),
      new FakeCards([]),
      new FakeNewCards([]),
      new FakeQuestions(),
      new FakeSessions(),
      new FakeCardConcepts(),
      new FakeContent(),
    );
    expect(await useCase.execute('u1', 'g1')).toBeNull();
  });

  it('pulls new cards up to the day goal and starts a session with due + new', async () => {
    const fresh = new FakeNewCards([card('n1', 'A'), card('n2', 'B'), card('n3', 'C')]);
    const useCase = new StartPlannedSessionUseCase(
      new FakeToday(todayPlan(2)),
      new FakeCards([card('d1', 'A'), card('d2', 'B')]),
      fresh,
      new FakeQuestions(),
      new FakeSessions(),
      new FakeCardConcepts(),
      new FakeContent(),
    );
    const result = await useCase.execute('u1', 'g1');
    expect(fresh.askedLimit).toBe(2); // limitado à meta do dia
    expect(result?.sessionId).toBe('s1');
    expect(result?.items.map((c) => c.id).sort()).toEqual(['d1', 'd2', 'n1', 'n2']);
  });

  it('enriches due cards missing a concept from the graph (so interleaving can work)', async () => {
    const due = [card('d1', null), card('d2', null)];
    const concepts = new Map([
      ['d1', 'Recursão'],
      ['d2', 'Grafos'],
    ]);
    const useCase = new StartPlannedSessionUseCase(
      new FakeToday(todayPlan(0)),
      new FakeCards(due),
      new FakeNewCards([]),
      new FakeQuestions(),
      new FakeSessions(),
      new FakeCardConcepts(concepts),
      new FakeContent(),
    );
    const result = await useCase.execute('u1', 'p1');
    const byId = new Map((result?.items ?? []).map((c) => [c.id, c.conceito]));
    expect(byId.get('d1')).toBe('Recursão');
    expect(byId.get('d2')).toBe('Grafos');
  });

  it('mixes questions of the roadmap concepts into the session', async () => {
    const q: PlanQuestion = {
      id: 'q1',
      enunciado: 'Qual a complexidade?',
      alternativas: [{ letra: 'A', texto: 'O(n)' }],
      gabarito: 'A',
      explicacao: null,
      conceito: 'Complexidade',
      conceitoId: 'c2',
    };
    const useCase = new StartPlannedSessionUseCase(
      new FakeToday(todayPlan(2)),
      new FakeCards([card('d1', 'A')]),
      new FakeNewCards([]),
      new FakeQuestions([q]),
      new FakeSessions(),
      new FakeCardConcepts(),
      new FakeContent(),
    );
    const result = await useCase.execute('u1', 'p1');
    const q1 = result?.items.find((i) => i.id === 'q1');
    expect(q1?.kind).toBe('question');
    expect(result?.items.some((i) => i.kind === 'flashcard' && i.id === 'd1')).toBe(true);
  });

  // Objetivo = aprender TUDO: com baralho E grafo no conteúdo, as fontes se UNEM
  // (cards do baralho + do roadmap do grafo). As vencidas seguem dos baralhos.
  it('unites baralho and graph sources when the plan has both', async () => {
    const content = new FakeContent({ due: [card('bd', 'A')], fresh: [card('bn', 'B')] });
    const roadmapNew = new FakeNewCards([card('rm', 'X')]);
    const useCase = new StartPlannedSessionUseCase(
      new FakeToday(planWith({ baralhoIds: ['b1'], grafoIds: ['g1'] }, 5)),
      new FakeCards([card('global', 'G')]),
      roadmapNew,
      new FakeQuestions(),
      new FakeSessions(),
      new FakeCardConcepts(),
      content,
    );
    const ids = (await useCase.execute('u1', 'p1'))?.items.map((i) => i.id) ?? [];
    expect(ids).toContain('bd'); // vencida do baralho
    expect(ids).toContain('bn'); // nova do baralho
    expect(ids).toContain('rm'); // nova do roadmap do grafo (UNIÃO)
    expect(ids).not.toContain('global'); // vencidas vêm do baralho, não globais
    expect(roadmapNew.askedLimit).toBe(5); // roadmap consultado (grafo no conteúdo)
  });

  // Sem grafos no conteúdo, o roadmap não é consultado — só as fontes escolhidas.
  it('does not query the graph roadmap when no graph is in the content', async () => {
    const content = new FakeContent({ fresh: [card('bn', 'B')] });
    const roadmapNew = new FakeNewCards([card('rm', 'X')]);
    const useCase = new StartPlannedSessionUseCase(
      new FakeToday(planWith({ baralhoIds: ['b1'], grafoIds: [] }, 5)),
      new FakeCards([]),
      roadmapNew,
      new FakeQuestions(),
      new FakeSessions(),
      new FakeCardConcepts(),
      content,
    );
    const ids = (await useCase.execute('u1', 'p1'))?.items.map((i) => i.id) ?? [];
    expect(ids).toContain('bn');
    expect(ids).not.toContain('rm');
    expect(roadmapNew.askedLimit).toBe(-1); // grafoIds vazio → roadmap nunca consultado
  });

  it('removes items of excluded concepts from the pool', async () => {
    const content = new FakeContent({
      excluded: { flashcards: new Set(['d2']), questions: new Set() },
    });
    const useCase = new StartPlannedSessionUseCase(
      new FakeToday(planWith({ conceitosExcluidos: ['cX'] }, 0)),
      new FakeCards([card('d1', 'A'), card('d2', 'B')]),
      new FakeNewCards([]),
      new FakeQuestions(),
      new FakeSessions(),
      new FakeCardConcepts(),
      content,
    );
    const ids = (await useCase.execute('u1', 'p1'))?.items.map((i) => i.id) ?? [];
    expect(ids).toContain('d1');
    expect(ids).not.toContain('d2');
  });

  it('skips the roadmap query when the day goal is zero', async () => {
    const fresh = new FakeNewCards([card('n1', 'A')]);
    const useCase = new StartPlannedSessionUseCase(
      new FakeToday(todayPlan(0)),
      new FakeCards([card('d1', 'A')]),
      fresh,
      new FakeQuestions(),
      new FakeSessions(),
      new FakeCardConcepts(),
      new FakeContent(),
    );
    const result = await useCase.execute('u1', 'g1');
    expect(fresh.askedLimit).toBe(-1); // nunca chamou
    expect(result?.items.map((c) => c.id)).toEqual(['d1']);
  });
});
