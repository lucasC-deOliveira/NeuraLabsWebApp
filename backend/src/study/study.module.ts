import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PrismaService } from '../prisma/prisma.service';
import { StudyController } from './study.controller';
import { StudyService } from './study.service';
import { SubmitReviewUseCase } from '../modules/study/application/use-cases/submit-review.use-case';
import { StartSessionUseCase } from '../modules/study/application/use-cases/start-session.use-case';
import { EndSessionUseCase } from '../modules/study/application/use-cases/end-session.use-case';
import { FinalizeSessionUseCase } from '../modules/study/application/use-cases/finalize-session.use-case';
import { GetFlashcardForStudyUseCase } from '../modules/study/application/use-cases/get-flashcard-for-study.use-case';
import { StartSingleCardStudyUseCase } from '../modules/study/application/use-cases/start-single-card-study.use-case';
import { StartDeckStudyUseCase } from '../modules/study/application/use-cases/start-deck-study.use-case';
import { CLOCK, type Clock } from '../modules/study/domain/ports/clock';
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

@Module({
  imports: [AuthModule],
  controllers: [StudyController],
  providers: [
    StudyService,
    { provide: STUDY_UNIT_OF_WORK, useClass: PrismaStudyUnitOfWork },
    { provide: STUDY_CARD_QUERY, useClass: PrismaStudyCardQuery },
    { provide: STUDY_SESSION_LIFECYCLE, useClass: PrismaStudySessionLifecycle },
    { provide: STUDY_FLASHCARD_QUERY, useClass: PrismaStudyFlashcardQuery },
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
      useFactory: (sessions: StudySessionRepository, cards: StudyCardQuery) =>
        new StartSessionUseCase(sessions, cards),
      inject: [STUDY_SESSION_REPOSITORY, STUDY_CARD_QUERY],
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
  ],
})
export class StudyModule {}
