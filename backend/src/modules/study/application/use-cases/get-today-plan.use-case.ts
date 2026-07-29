import { buildDailyTarget, type DailyTarget } from '../../domain/services/daily-plan';
import { projectCompletion, type Projection } from '../../domain/services/plan-projection';
import type { StudyPlan, StudyPlanRepository } from '../../domain/ports/study-plan-repository';
import type { PlanContext, PlanContextQuery } from '../../domain/ports/plan-context-query';
import type { RoadmapNewCardsQuery } from '../../domain/ports/roadmap-new-cards-query';
import type { Clock } from '../../domain/ports/clock';
import type { CachePort } from '../../../cache/domain/cache-port';

// Teto de novos que olhamos à frente só para saber a disponibilidade (a meta é bem
// menor); evita carregar a trilha inteira só para contar.
const NEW_LOOKAHEAD = 60;

// O "hoje" é lido repetidamente (página + card do Dashboard) e muda pouco dentro de um
// minuto; o TTL cobre as revisões, e salvar o plano invalida na hora (SaveStudyPlan).
const TODAY_TTL_MS = 60_000;

export interface TodayPlan {
  plan: StudyPlan;
  target: DailyTarget;
  projection: Projection;
  newAvailable: number;
}

/**
 * Monta o "hoje" do plano: alvo do dia (revisões + Feynman + novos até a meta) e a
 * projeção de término. `null` quando o grafo não tem plano configurado.
 * @example today.execute('u1', 'g1')
 */
export class GetTodayPlanUseCase {
  constructor(
    private readonly plans: StudyPlanRepository,
    private readonly context: PlanContextQuery,
    private readonly newCards: RoadmapNewCardsQuery,
    private readonly clock: Clock,
    private readonly cache: CachePort,
  ) {}

  execute(userId: string, planId: string): Promise<TodayPlan | null> {
    return this.cache.getOrCompute(
      `plan:today:${planId}`,
      TODAY_TTL_MS,
      () => this.compute(userId, planId),
      [`plan:${planId}`],
    );
  }

  private async compute(userId: string, planId: string): Promise<TodayPlan | null> {
    const plan = await this.plans.loadById(userId, planId);
    if (!plan) return null;
    // Independentes → em paralelo (o backlog e a disponibilidade de novos não se cruzam).
    const [ctx, available] = await Promise.all([
      this.context.load(userId, plan.grafoIds, plan.prioridade),
      this.newCards.findByRoadmap(userId, plan.grafoIds, plan.prioridade, NEW_LOOKAHEAD),
    ]);
    const target = this.buildTarget(plan, ctx, available.length);
    const projection = this.project(plan, ctx, target.novos);
    return { plan, target, projection, newAvailable: available.length };
  }

  private buildTarget(plan: StudyPlan, ctx: PlanContext, newAvailable: number): DailyTarget {
    return buildDailyTarget(
      {
        dueReviews: ctx.dueReviews,
        dueFeynman: ctx.dueFeynman,
        newAvailable,
        secPerReview: ctx.avgSecondsPerCard,
      },
      { tipo: plan.metaTipo, valor: plan.metaValor },
    );
  }

  // A projeção usa o ritmo PLANEJADO (os novos do dia): "no seu ritmo, termina em X".
  private project(plan: StudyPlan, ctx: PlanContext, novosPorDia: number): Projection {
    return projectCompletion({
      remainingConcepts: ctx.remainingConcepts,
      avgNewPerDay: novosPorDia,
      today: this.clock.now(),
      dataAlvo: plan.dataAlvo,
    });
  }
}
