import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { StudyController } from './study.controller';
import { StudyService } from './study.service';
import { SubmitReviewUseCase } from '../modules/study/application/use-cases/submit-review.use-case';
import { CLOCK, type Clock } from '../modules/study/domain/ports/clock';
import {
  STUDY_REPOSITORY,
  type StudyRepository,
} from '../modules/study/domain/ports/study-repository';
import { SystemClock } from '../modules/study/infrastructure/clock/system-clock';
import { PrismaStudyRepository } from '../modules/study/infrastructure/persistence/prisma-study.repository';

@Module({
  imports: [AuthModule],
  controllers: [StudyController],
  providers: [
    StudyService,
    { provide: STUDY_REPOSITORY, useClass: PrismaStudyRepository },
    { provide: CLOCK, useClass: SystemClock },
    {
      provide: SubmitReviewUseCase,
      useFactory: (repo: StudyRepository, clock: Clock) => new SubmitReviewUseCase(repo, clock),
      inject: [STUDY_REPOSITORY, CLOCK],
    },
  ],
})
export class StudyModule {}
