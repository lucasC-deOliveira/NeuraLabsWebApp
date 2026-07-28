import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PrismaService } from '../prisma/prisma.service';
import { StudyController } from './study.controller';
import { SubmitReviewUseCase } from '../modules/study/application/use-cases/submit-review.use-case';
import { StartSessionUseCase } from '../modules/study/application/use-cases/start-session.use-case';
import {
  PREREQUISITE_MASTERY_QUERY,
  type PrerequisiteMasteryQuery,
} from '../modules/study/domain/ports/prerequisite-mastery-query';
import { PrismaPrerequisiteMasteryQuery } from '../modules/study/infrastructure/persistence/prisma-prerequisite-mastery.query';
import {
  CARD_MASTERY_CALCULATOR,
  type CardMasteryCalculator,
} from '../modules/study/domain/ports/card-mastery-calculator';
import { computeMastery } from '../modules/graph/domain/services/domain-propagation';

// Liga o cálculo de retenção do contexto do grafo ao port do estudo — o mesmo
// padrão do RelationRulesPort no AiModule: quem consome declara a interface,
// o módulo escolhe a implementação.
const graphCardMastery: CardMasteryCalculator = {
  mastery: (input, nowMs) => computeMastery(input, nowMs),
};
import { EndSessionUseCase } from '../modules/study/application/use-cases/end-session.use-case';
import { FinalizeSessionUseCase } from '../modules/study/application/use-cases/finalize-session.use-case';
import { GetFlashcardForStudyUseCase } from '../modules/study/application/use-cases/get-flashcard-for-study.use-case';
import { StartSingleCardStudyUseCase } from '../modules/study/application/use-cases/start-single-card-study.use-case';
import { StartDeckStudyUseCase } from '../modules/study/application/use-cases/start-deck-study.use-case';
import { SyncVaultLogUseCase } from '../modules/study/application/use-cases/sync-vault-log.use-case';
import { CLOCK, type Clock } from '../modules/study/domain/ports/clock';
import {
  VAULT_IMPORT_SESSION_REPOSITORY,
  type VaultImportSessionRepository,
} from '../modules/study/domain/ports/vault-import-session-repository';
import {
  STUDY_DECK_QUERY,
  type StudyDeckQuery,
} from '../modules/study/domain/ports/study-deck-query';
import {
  STUDY_FLASHCARD_QUERY,
  type StudyFlashcardQuery,
} from '../modules/study/domain/ports/study-flashcard-query';
import {
  STUDY_SESSION_LIFECYCLE,
  type StudySessionLifecycle,
} from '../modules/study/domain/ports/study-session-lifecycle';
import {
  STUDY_CARD_QUERY,
  type StudyCardQuery,
} from '../modules/study/domain/ports/study-card-query';
import {
  ROADMAP_NEW_CARDS_QUERY,
  type RoadmapNewCardsQuery,
} from '../modules/study/domain/ports/roadmap-new-cards-query';
import { PrismaRoadmapNewCardsQuery } from '../modules/study/infrastructure/persistence/prisma-roadmap-new-cards.query';
import {
  ROADMAP_QUESTIONS_QUERY,
  type RoadmapQuestionsQuery,
} from '../modules/study/domain/ports/roadmap-questions-query';
import { PrismaRoadmapQuestionsQuery } from '../modules/study/infrastructure/persistence/prisma-roadmap-questions.query';
import {
  STUDY_PLAN_REPOSITORY,
  type StudyPlanRepository,
} from '../modules/study/domain/ports/study-plan-repository';
import {
  PLAN_CONTEXT_QUERY,
  type PlanContextQuery,
} from '../modules/study/domain/ports/plan-context-query';
import { PrismaStudyPlanRepository } from '../modules/study/infrastructure/persistence/prisma-study-plan.repository';
import { PrismaPlanContextQuery } from '../modules/study/infrastructure/persistence/prisma-plan-context.query';
import { ROADMAP_OPTIONS_QUERY } from '../modules/study/domain/ports/roadmap-options-query';
import { PrismaRoadmapOptionsQuery } from '../modules/study/infrastructure/persistence/prisma-roadmap-options.query';
import {
  CARD_CONCEPT_SOURCE,
  type CardConceptSource,
} from '../modules/study/domain/ports/card-concept-source';
import { PrismaCardConceptQuery } from '../modules/study/infrastructure/persistence/prisma-card-concept.query';
import {
  PLAN_CONTENT_SOURCE,
  type PlanContentSource,
} from '../modules/study/domain/ports/plan-content-source';
import { PrismaPlanContentSource } from '../modules/study/infrastructure/persistence/prisma-plan-content.source';
import { SaveStudyPlanUseCase } from '../modules/study/application/use-cases/save-study-plan.use-case';
import { GetTodayPlanUseCase } from '../modules/study/application/use-cases/get-today-plan.use-case';
import { CACHE_PORT, type CachePort } from '../modules/cache/domain/cache-port';
import { StartPlannedSessionUseCase } from '../modules/study/application/use-cases/start-planned-session.use-case';
import {
  STUDY_SESSION_REPOSITORY,
  type StudySessionRepository,
} from '../modules/study/domain/ports/study-session-repository';
import {
  STUDY_UNIT_OF_WORK,
  type StudyUnitOfWork,
} from '../modules/study/domain/ports/study-unit-of-work';
import { SystemClock } from '../modules/study/infrastructure/clock/system-clock';
import { PrismaStudyUnitOfWork } from '../modules/study/infrastructure/persistence/prisma-study-unit-of-work';
import { PrismaStudySessionRepository } from '../modules/study/infrastructure/persistence/prisma-study-session.repository';
import { PrismaStudyCardQuery } from '../modules/study/infrastructure/persistence/prisma-study-card.query';
import { PrismaStudySessionLifecycle } from '../modules/study/infrastructure/persistence/prisma-study-session-lifecycle';
import { PrismaStudyFlashcardQuery } from '../modules/study/infrastructure/persistence/prisma-study-flashcard.query';
import { PrismaStudyDeckQuery } from '../modules/study/infrastructure/persistence/prisma-study-deck.query';
import { PrismaCardImportanceQuery } from '../modules/curriculum/infrastructure/persistence/prisma-card-importance.query';
import { DiagnoseConceptErrorsUseCase } from '../modules/curriculum/application/use-cases/diagnose-concept-errors.use-case';
import {
  CONCEPT_REVIEW_TALLY_QUERY,
  type ConceptReviewTallyQuery,
} from '../modules/curriculum/domain/ports/concept-review-tally-query';
import { PrismaConceptReviewTallyQuery } from '../modules/curriculum/infrastructure/persistence/prisma-concept-review-tally.query';
import { PrismaConceitoImportanceRepository } from '../modules/curriculum/infrastructure/persistence/prisma-conceito-importance.repository';
import { PrismaVaultImportSessionRepository } from '../modules/study/infrastructure/persistence/prisma-vault-import-session.repository';

@Module({
  imports: [AuthModule],
  controllers: [StudyController],
  providers: [
    { provide: STUDY_UNIT_OF_WORK, useClass: PrismaStudyUnitOfWork },
    { provide: VAULT_IMPORT_SESSION_REPOSITORY, useClass: PrismaVaultImportSessionRepository },
    { provide: STUDY_CARD_QUERY, useClass: PrismaStudyCardQuery },
    { provide: ROADMAP_NEW_CARDS_QUERY, useClass: PrismaRoadmapNewCardsQuery },
    { provide: ROADMAP_QUESTIONS_QUERY, useClass: PrismaRoadmapQuestionsQuery },
    { provide: STUDY_PLAN_REPOSITORY, useClass: PrismaStudyPlanRepository },
    { provide: PLAN_CONTEXT_QUERY, useClass: PrismaPlanContextQuery },
    { provide: ROADMAP_OPTIONS_QUERY, useClass: PrismaRoadmapOptionsQuery },
    { provide: CARD_CONCEPT_SOURCE, useClass: PrismaCardConceptQuery },
    { provide: PLAN_CONTENT_SOURCE, useClass: PrismaPlanContentSource },
    { provide: CARD_MASTERY_CALCULATOR, useValue: graphCardMastery },
    { provide: CONCEPT_REVIEW_TALLY_QUERY, useClass: PrismaConceptReviewTallyQuery },
    {
      provide: DiagnoseConceptErrorsUseCase,
      useFactory: (tallies: ConceptReviewTallyQuery) => new DiagnoseConceptErrorsUseCase(tallies),
      inject: [CONCEPT_REVIEW_TALLY_QUERY],
    },
    { provide: PREREQUISITE_MASTERY_QUERY, useClass: PrismaPrerequisiteMasteryQuery },
    { provide: STUDY_SESSION_LIFECYCLE, useClass: PrismaStudySessionLifecycle },
    { provide: STUDY_FLASHCARD_QUERY, useClass: PrismaStudyFlashcardQuery },
    PrismaConceitoImportanceRepository,
    PrismaCardImportanceQuery,
    { provide: STUDY_DECK_QUERY, useClass: PrismaStudyDeckQuery },
    { provide: CLOCK, useClass: SystemClock },
    {
      provide: STUDY_SESSION_REPOSITORY,
      useFactory: (prisma: PrismaService) => new PrismaStudySessionRepository(prisma),
      inject: [PrismaService],
    },
    {
      provide: SubmitReviewUseCase,
      useFactory: (uow: StudyUnitOfWork, clock: Clock) => new SubmitReviewUseCase(uow, clock),
      inject: [STUDY_UNIT_OF_WORK, CLOCK],
    },
    {
      provide: StartSessionUseCase,
      useFactory: (
        sessions: StudySessionRepository,
        cards: StudyCardQuery,
        prerequisites: PrerequisiteMasteryQuery,
      ) => new StartSessionUseCase(sessions, cards, prerequisites),
      inject: [STUDY_SESSION_REPOSITORY, STUDY_CARD_QUERY, PREREQUISITE_MASTERY_QUERY],
    },
    {
      provide: EndSessionUseCase,
      useFactory: (sessions: StudySessionLifecycle) => new EndSessionUseCase(sessions),
      inject: [STUDY_SESSION_LIFECYCLE],
    },
    {
      provide: FinalizeSessionUseCase,
      useFactory: (sessions: StudySessionLifecycle) => new FinalizeSessionUseCase(sessions),
      inject: [STUDY_SESSION_LIFECYCLE],
    },
    {
      provide: GetFlashcardForStudyUseCase,
      useFactory: (cards: StudyFlashcardQuery) => new GetFlashcardForStudyUseCase(cards),
      inject: [STUDY_FLASHCARD_QUERY],
    },
    {
      provide: StartSingleCardStudyUseCase,
      useFactory: (cards: StudyFlashcardQuery, sessions: StudySessionRepository) =>
        new StartSingleCardStudyUseCase(cards, sessions),
      inject: [STUDY_FLASHCARD_QUERY, STUDY_SESSION_REPOSITORY],
    },
    {
      provide: StartDeckStudyUseCase,
      useFactory: (decks: StudyDeckQuery, sessions: StudySessionRepository) =>
        new StartDeckStudyUseCase(decks, sessions),
      inject: [STUDY_DECK_QUERY, STUDY_SESSION_REPOSITORY],
    },
    {
      provide: SyncVaultLogUseCase,
      useFactory: (imports: VaultImportSessionRepository, uow: StudyUnitOfWork) =>
        new SyncVaultLogUseCase(imports, uow),
      inject: [VAULT_IMPORT_SESSION_REPOSITORY, STUDY_UNIT_OF_WORK],
    },
    {
      provide: SaveStudyPlanUseCase,
      useFactory: (plans: StudyPlanRepository, cache: CachePort) =>
        new SaveStudyPlanUseCase(plans, cache),
      inject: [STUDY_PLAN_REPOSITORY, CACHE_PORT],
    },
    {
      provide: GetTodayPlanUseCase,
      useFactory: (
        plans: StudyPlanRepository,
        context: PlanContextQuery,
        newCards: RoadmapNewCardsQuery,
        clock: Clock,
        cache: CachePort,
      ) => new GetTodayPlanUseCase(plans, context, newCards, clock, cache),
      inject: [
        STUDY_PLAN_REPOSITORY,
        PLAN_CONTEXT_QUERY,
        ROADMAP_NEW_CARDS_QUERY,
        CLOCK,
        CACHE_PORT,
      ],
    },
    {
      provide: StartPlannedSessionUseCase,
      useFactory: (
        today: GetTodayPlanUseCase,
        cards: StudyCardQuery,
        newCards: RoadmapNewCardsQuery,
        questions: RoadmapQuestionsQuery,
        sessions: StudySessionRepository,
        cardConcepts: CardConceptSource,
        content: PlanContentSource,
        prerequisites: PrerequisiteMasteryQuery,
      ) =>
        new StartPlannedSessionUseCase(
          today,
          cards,
          newCards,
          questions,
          sessions,
          cardConcepts,
          content,
          prerequisites,
        ),
      inject: [
        GetTodayPlanUseCase,
        STUDY_CARD_QUERY,
        ROADMAP_NEW_CARDS_QUERY,
        ROADMAP_QUESTIONS_QUERY,
        STUDY_SESSION_REPOSITORY,
        CARD_CONCEPT_SOURCE,
        PLAN_CONTENT_SOURCE,
        PREREQUISITE_MASTERY_QUERY,
      ],
    },
  ],
})
export class StudyModule {}
