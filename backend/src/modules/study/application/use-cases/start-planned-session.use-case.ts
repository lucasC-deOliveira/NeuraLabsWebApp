import { applyInterleaving } from '../../domain/services/interleaving';
import { orderByReadiness } from '../../domain/services/prerequisite-readiness';
import type { TodayPlan } from './get-today-plan.use-case';
import type { StudyPlan } from '../../domain/ports/study-plan-repository';
import type { PrerequisiteMasteryQuery } from '../../domain/ports/prerequisite-mastery-query';
import type { StudyCardQuery, StudyCardView } from '../../domain/ports/study-card-query';
import type { RoadmapNewCardsQuery } from '../../domain/ports/roadmap-new-cards-query';
import type {
  RoadmapQuestionsQuery,
  PlanQuestion,
} from '../../domain/ports/roadmap-questions-query';
import type { StudySessionRepository } from '../../domain/ports/study-session-repository';
import type { CardConceptSource } from '../../domain/ports/card-concept-source';
import type { PlanContentSource } from '../../domain/ports/plan-content-source';

// Uma sentada não é o dia inteiro: o alvo diário pode ter 150 vencidas, mas a sessão
// serve um punhado por vez. Reserva espaço para os novos caberem sempre.
const MAX_SESSION = 40;

// A fila do dia mistura flashcards e questões (prática) — o `kind` diz qual é cada um;
// os dois têm `conceito`, então intercalam juntos.
export interface FlashcardItem {
  kind: 'flashcard';
  id: string;
  pergunta: string;
  resposta: string;
  conceito: string | null;
}
export interface QuestionItem {
  kind: 'question';
  id: string;
  enunciado: string;
  alternativas: { letra: string; texto: string }[] | null;
  gabarito: string;
  explicacao: string | null;
  conceito: string | null;
}
export type PlannedItem = FlashcardItem | QuestionItem;

export interface PlannedSessionResult {
  sessionId: string;
  items: PlannedItem[];
}

interface Excluded {
  flashcards: Set<string>;
  questions: Set<string>;
}

const toFlashcardItem = (c: StudyCardView): FlashcardItem => ({
  kind: 'flashcard',
  id: c.id,
  pergunta: c.pergunta,
  resposta: c.resposta,
  conceito: c.conceito,
});

const toQuestionItem = (q: PlanQuestion): QuestionItem => ({
  kind: 'question',
  id: q.id,
  enunciado: q.enunciado,
  alternativas: q.alternativas,
  gabarito: q.gabarito,
  explicacao: q.explicacao,
  conceito: q.conceito,
});

// O "hoje" do plano, tipado estruturalmente para o GetTodayPlanUseCase satisfazer.
export interface TodayPlanProvider {
  execute(userId: string, grafoId: string): Promise<TodayPlan | null>;
}

/**
 * Abre a sessão do dia. O conteúdo vem das FONTES do plano (baralhos/provas) quando há;
 * senão, do roadmap. Remove os conceitos excluídos, ordena por prontidão e intercala.
 * `null` quando o plano não existe.
 * @example useCase.execute('u1', 'plan1')
 */
export class StartPlannedSessionUseCase {
  constructor(
    private readonly today: TodayPlanProvider,
    private readonly cards: StudyCardQuery,
    private readonly newCards: RoadmapNewCardsQuery,
    private readonly questions: RoadmapQuestionsQuery,
    private readonly sessions: StudySessionRepository,
    private readonly cardConcepts: CardConceptSource,
    private readonly content: PlanContentSource,
    private readonly prerequisites?: PrerequisiteMasteryQuery,
  ) {}

  async execute(userId: string, planId: string): Promise<PlannedSessionResult | null> {
    const today = await this.today.execute(userId, planId);
    if (!today) return null;
    const plan = today.plan;
    const novos = today.target.novos;
    const [fresh, due, questions, excluded] = await Promise.all([
      this.freshCards(userId, plan, novos),
      this.dueCards(userId, plan),
      this.planQuestions(userId, plan, novos),
      this.excluded(userId, plan),
    ]);
    const cardViews = await this.enrichConcepts(userId, this.assemble(due, fresh));
    const pool = this.buildPool(cardViews, questions, excluded);
    const session = await this.sessions.start(userId);
    return { sessionId: session.id, items: await this.arrange(userId, pool) };
  }

  // Cards novos: dos baralhos do plano, ou (sem fontes) na ordem do roadmap.
  private freshCards(userId: string, plan: StudyPlan, novos: number): Promise<StudyCardView[]> {
    if (novos <= 0) return Promise.resolve([]);
    if (plan.baralhoIds.length > 0) {
      return this.content.newCardsFromBaralhos(userId, plan.baralhoIds, novos);
    }
    return this.newCards.findByRoadmap(userId, plan.grafoId, plan.prioridade, novos);
  }

  // Revisões vencidas: dos baralhos do plano, ou (sem fontes) globais.
  private dueCards(userId: string, plan: StudyPlan): Promise<StudyCardView[]> {
    if (plan.baralhoIds.length > 0)
      return this.content.dueCardsFromBaralhos(userId, plan.baralhoIds);
    return this.cards.findDueCards(userId);
  }

  // Questões: das provas do plano, ou (sem fontes) dos conceitos do roadmap.
  private planQuestions(userId: string, plan: StudyPlan, novos: number): Promise<PlanQuestion[]> {
    if (plan.provaIds.length > 0)
      return this.content.questionsFromProvas(userId, plan.provaIds, novos);
    return this.questions.findByRoadmap(userId, plan.grafoId, plan.prioridade, novos);
  }

  private excluded(userId: string, plan: StudyPlan): Promise<Excluded> {
    if (plan.conceitosExcluidos.length === 0) {
      return Promise.resolve({ flashcards: new Set(), questions: new Set() });
    }
    return this.content.excludedEntityIds(userId, plan.conceitosExcluidos);
  }

  private buildPool(
    cardViews: StudyCardView[],
    questions: PlanQuestion[],
    excluded: Excluded,
  ): PlannedItem[] {
    const flash = cardViews.filter((c) => !excluded.flashcards.has(c.id)).map(toFlashcardItem);
    const q = questions.filter((x) => !excluded.questions.has(x.id)).map(toQuestionItem);
    return [...flash, ...q];
  }

  // Preenche o conceito (do grafo) dos cards que vêm sem ele — as revisões. Sem isto o
  // interleaving agrupa todas as revisões como "sem conceito" e não intercala nada.
  private async enrichConcepts(userId: string, pool: StudyCardView[]): Promise<StudyCardView[]> {
    const missing = pool.filter((c) => !c.conceito).map((c) => c.id);
    if (missing.length === 0) return pool;
    const concepts = await this.cardConcepts.conceptsFor(userId, missing);
    return pool.map((c) => (c.conceito ? c : { ...c, conceito: concepts.get(c.id) ?? null }));
  }

  // Novos sempre entram; o resto do teto é preenchido pelas vencidas.
  private assemble(due: StudyCardView[], fresh: StudyCardView[]): StudyCardView[] {
    const room = Math.max(0, MAX_SESSION - fresh.length);
    return [...due.slice(0, room), ...fresh];
  }

  // Prontidão escolhe a ordem geral; o interleaving só evita repetir o conceito.
  private async arrange(userId: string, pool: PlannedItem[]): Promise<PlannedItem[]> {
    if (!this.prerequisites) return applyInterleaving(pool);
    const conceitos = [...new Set(pool.flatMap((c) => (c.conceito ? [c.conceito] : [])))];
    const prereqs = await this.prerequisites.forConcepts(userId, conceitos);
    return applyInterleaving(orderByReadiness(pool, prereqs));
  }
}
