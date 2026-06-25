import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../prisma/prisma.service';
import type {
  ConceptRef,
  FlashcardSourceRepository,
} from '../../domain/ports/flashcard-source-repository';

@Injectable()
export class PrismaFlashcardSourceRepository implements FlashcardSourceRepository {
  constructor(private readonly prisma: PrismaService) {}

  async loadNote(userId: string, notaId: string): Promise<{ conteudo: string } | null> {
    return this.prisma.nota.findFirst({
      where: { id: notaId, usuarioId: userId },
      select: { conteudo: true },
    });
  }

  loadConcepts(userId: string): Promise<ConceptRef[]> {
    return this.prisma.conceito.findMany({
      where: { usuarioId: userId },
      select: { id: true, nome: true },
    });
  }
}
