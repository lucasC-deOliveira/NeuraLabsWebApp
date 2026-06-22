import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../prisma/prisma.service';
import type { StudyRepositories, StudyUnitOfWork } from '../../domain/ports/study-unit-of-work';
import { PrismaFlashcardRepository } from './prisma-flashcard.repository';
import { PrismaStudySessionRepository } from './prisma-study-session.repository';

// Prisma unit of work: opens a single transaction and hands the work
// transaction-bound aggregate repositories, so cross-aggregate writes commit
// atomically (review + reschedule).
@Injectable()
export class PrismaStudyUnitOfWork implements StudyUnitOfWork {
  constructor(private readonly prisma: PrismaService) {}

  execute<T>(work: (repos: StudyRepositories) => Promise<T>): Promise<T> {
    return this.prisma.$transaction((tx) =>
      work({
        flashcards: new PrismaFlashcardRepository(tx),
        sessions: new PrismaStudySessionRepository(tx),
      }),
    );
  }
}
