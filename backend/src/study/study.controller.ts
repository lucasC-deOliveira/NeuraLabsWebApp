import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Inject,
  Param,
  Post,
  Query,
  UseFilters,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { GetTodayPlanUseCase } from '../modules/study/application/use-cases/get-today-plan.use-case';
import { SaveStudyPlanUseCase } from '../modules/study/application/use-cases/save-study-plan.use-case';
import { StartPlannedSessionUseCase } from '../modules/study/application/use-cases/start-planned-session.use-case';
import {
  STUDY_PLAN_REPOSITORY,
  type PlanMetaTipo,
  type StudyPlanRepository,
} from '../modules/study/domain/ports/study-plan-repository';
import {
  ROADMAP_OPTIONS_QUERY,
  type RoadmapOptionsQuery,
} from '../modules/study/domain/ports/roadmap-options-query';
import {
  SubmitReviewUseCase,
  type SubmitReviewCommand,
} from '../modules/study/application/use-cases/submit-review.use-case';
import { StartSessionUseCase } from '../modules/study/application/use-cases/start-session.use-case';
import { DiagnoseConceptErrorsUseCase } from '../modules/curriculum/application/use-cases/diagnose-concept-errors.use-case';
import { EndSessionUseCase } from '../modules/study/application/use-cases/end-session.use-case';
import { FinalizeSessionUseCase } from '../modules/study/application/use-cases/finalize-session.use-case';
import { GetFlashcardForStudyUseCase } from '../modules/study/application/use-cases/get-flashcard-for-study.use-case';
import { StartSingleCardStudyUseCase } from '../modules/study/application/use-cases/start-single-card-study.use-case';
import { StartDeckStudyUseCase } from '../modules/study/application/use-cases/start-deck-study.use-case';
import {
  SyncVaultLogUseCase,
  type VaultSessionInput,
} from '../modules/study/application/use-cases/sync-vault-log.use-case';
import { StudyDomainExceptionFilter } from '../modules/study/interface/study-domain-exception.filter';

@UseGuards(JwtAuthGuard)
@UseFilters(StudyDomainExceptionFilter)
@Controller('study')
export class StudyController {
  constructor(
    private readonly submitReview: SubmitReviewUseCase,
    private readonly startSession: StartSessionUseCase,
    private readonly endSession: EndSessionUseCase,
    private readonly finalizeSession: FinalizeSessionUseCase,
    private readonly getFlashcardForStudy: GetFlashcardForStudyUseCase,
    private readonly startSingleCardStudy: StartSingleCardStudyUseCase,
    private readonly startDeckStudy: StartDeckStudyUseCase,
    private readonly syncVaultLog: SyncVaultLogUseCase,
    private readonly diagnoseConceptErrors: DiagnoseConceptErrorsUseCase,
    private readonly getTodayPlan: GetTodayPlanUseCase,
    private readonly saveStudyPlan: SaveStudyPlanUseCase,
    private readonly startPlannedSession: StartPlannedSessionUseCase,
    @Inject(STUDY_PLAN_REPOSITORY) private readonly plans: StudyPlanRepository,
    @Inject(ROADMAP_OPTIONS_QUERY) private readonly roadmapOptions: RoadmapOptionsQuery,
  ) {}

  // Onde o usuário mais erra, por conceito. 0 token: sai do histórico de revisões
  // cruzado com as arestas DEFINE do grafo.
  @Get('diagnosis/concepts')
  conceptErrors(@CurrentUser() userId: string) {
    return this.diagnoseConceptErrors.execute(userId);
  }

  @Post('session')
  start(@CurrentUser() userId: string) {
    return this.startSession.execute(userId);
  }

  @Post('session/:id/end')
  end(@CurrentUser() userId: string, @Param('id') id: string) {
    return this.endSession.execute(userId, id);
  }

  @Post('review')
  review(
    @CurrentUser() userId: string,
    @Body() body: Omit<SubmitReviewCommand, 'userId'>,
  ): Promise<{ success: boolean }> {
    return this.submitReview.execute({ ...body, userId });
  }

  @Post('deck/:baralhoId')
  startDeck(@CurrentUser() userId: string, @Param('baralhoId') baralhoId: string) {
    return this.startDeckStudy.execute(userId, baralhoId);
  }

  @Get('flashcard/:flashcardId')
  flashcardForStudy(@CurrentUser() userId: string, @Param('flashcardId') flashcardId: string) {
    return this.getFlashcardForStudy.execute(userId, flashcardId);
  }

  @Post('flashcard/:flashcardId/start')
  startSingleCard(@CurrentUser() userId: string, @Param('flashcardId') flashcardId: string) {
    return this.startSingleCardStudy.execute(userId, flashcardId);
  }

  @Post('session/:id/finalize')
  finalize(@CurrentUser() userId: string, @Param('id') id: string) {
    return this.finalizeSession.execute(userId, id);
  }

  @Post('sync-vault-log')
  sync(@CurrentUser() userId: string, @Body() body: { sessions?: VaultSessionInput[] }) {
    return this.syncVaultLog.execute(userId, body.sessions ?? []);
  }

  // Todos os planos do usuário (o Dashboard usa o mais recente).
  @Get('plans')
  listPlans(@CurrentUser() userId: string) {
    return this.plans.listByUser(userId);
  }

  // Escopos disponíveis (roadmaps já gerados) de um grafo, para montar um plano.
  @Get('plan/roadmaps')
  roadmaps(@CurrentUser() userId: string, @Query('grafoId') grafoId: string) {
    return this.roadmapOptions.list(userId, grafoId ?? '');
  }

  // "Hoje" de um plano: alvo do dia + projeção (null se o plano não existe).
  @Get('plan/:id/today')
  today(@CurrentUser() userId: string, @Param('id') id: string) {
    return this.getTodayPlan.execute(userId, id);
  }

  // Abre a sessão do dia do plano (intercalada, escopada ao grafo).
  @Post('plan/:id/session')
  planSession(@CurrentUser() userId: string, @Param('id') id: string) {
    return this.startPlannedSession.execute(userId, id);
  }

  // Remove um plano (o histórico de estudo/agendamento não é afetado).
  @Delete('plan/:id')
  @HttpCode(204)
  async deletePlan(@CurrentUser() userId: string, @Param('id') id: string): Promise<void> {
    await this.plans.deleteById(userId, id);
  }

  // Cria (sem id) ou atualiza (com id) a config do plano.
  @Post('plan')
  savePlan(@CurrentUser() userId: string, @Body() body: PlanBody) {
    return this.saveStudyPlan.execute(userId, {
      id: body.id,
      prioridade: (body.prioridade ?? '').trim(),
      metaTipo: (body.metaTipo ?? '') as PlanMetaTipo,
      metaValor: Number(body.metaValor),
      dataAlvo: body.dataAlvo ? new Date(body.dataAlvo) : null,
      grafoIds: body.grafoIds ?? [],
      baralhoIds: body.baralhoIds ?? [],
      provaIds: body.provaIds ?? [],
      conceitosExcluidos: body.conceitosExcluidos ?? [],
    });
  }
}

interface PlanBody {
  id?: string;
  prioridade?: string;
  metaTipo?: string;
  metaValor?: number;
  dataAlvo?: string | null;
  grafoIds?: string[];
  baralhoIds?: string[];
  provaIds?: string[];
  conceitosExcluidos?: string[];
}
