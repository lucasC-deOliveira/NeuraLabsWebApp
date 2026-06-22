import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PrismaService } from '../prisma/prisma.service';
import { StudyController } from './study.controller';
import { StudyService } from './study.service';
import { SubmitReviewUseCase } from '../modules/study/application/use-cases/submit-review.use-case';
import { StartSessionUseCase } from '../modules/study/application/use-cases/start-session.use-case';
import { CLOCK, type Clock } from '../modules/study/domain/ports/clock';
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

@Module({
  imports: [AuthModule],
  controllers: [StudyController],
  providers: [
    StudyService,
    { provide: STUDY_UNIT_OF_WORK, useClass: PrismaStudyUnitOfWork },
    { provide: STUDY_CARD_QUERY, useClass: PrismaStudyCardQuery },
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
  ],
})
export class StudyModule {}
