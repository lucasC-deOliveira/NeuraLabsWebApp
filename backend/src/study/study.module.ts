import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { StudyController } from './study.controller';
import { StudyService } from './study.service';
import { SubmitReviewUseCase } from '../modules/study/application/use-cases/submit-review.use-case';
import { CLOCK, type Clock } from '../modules/study/domain/ports/clock';
import {
  STUDY_UNIT_OF_WORK,
  type StudyUnitOfWork,
} from '../modules/study/domain/ports/study-unit-of-work';
import { SystemClock } from '../modules/study/infrastructure/clock/system-clock';
import { PrismaStudyUnitOfWork } from '../modules/study/infrastructure/persistence/prisma-study-unit-of-work';

@Module({
  imports: [AuthModule],
  controllers: [StudyController],
  providers: [
    StudyService,
    { provide: STUDY_UNIT_OF_WORK, useClass: PrismaStudyUnitOfWork },
    { provide: CLOCK, useClass: SystemClock },
    {
      provide: SubmitReviewUseCase,
      useFactory: (uow: StudyUnitOfWork, clock: Clock) => new SubmitReviewUseCase(uow, clock),
      inject: [STUDY_UNIT_OF_WORK, CLOCK],
    },
  ],
})
export class StudyModule {}
