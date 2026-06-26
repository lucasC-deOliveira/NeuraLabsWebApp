import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../prisma/prisma.service';
import type { CurriculumRepository } from '../../domain/ports/curriculum-repository';
import type { ExistingCurriculum } from '../../domain/services/curriculum-plan';

const NAME_SELECT = { id: true, nome: true } as const;

@Injectable()
export class PrismaCurriculumRepository implements CurriculumRepository {
  constructor(private readonly prisma: PrismaService) {}

  async loadExisting(userId: string): Promise<ExistingCurriculum> {
    const [assuntos, topicos, conceitos] = await Promise.all([
      this.prisma.assunto.findMany({ where: { usuarioId: userId }, select: NAME_SELECT }),
      this.prisma.topico.findMany({ where: { usuarioId: userId }, select: NAME_SELECT }),
      this.prisma.conceito.findMany({ where: { usuarioId: userId }, select: NAME_SELECT }),
    ]);
    return { assuntos, topicos, conceitos };
  }

  async createAssunto(userId: string, nome: string): Promise<string> {
    const { id } = await this.prisma.assunto.create({ data: { usuarioId: userId, nome } });
    return id;
  }

  async createTopico(userId: string, assuntoId: string, nome: string): Promise<string> {
    const { id } = await this.prisma.topico.create({
      data: { usuarioId: userId, assuntoId, nome },
    });
    return id;
  }

  async createConceito(userId: string, topicoId: string, nome: string): Promise<string> {
    const { id } = await this.prisma.conceito.create({
      data: { usuarioId: userId, topicoId, nome },
    });
    return id;
  }

  async createNota(userId: string, titulo: string, conteudo: string): Promise<string> {
    const { id } = await this.prisma.nota.create({
      data: { usuarioId: userId, titulo, conteudo },
    });
    return id;
  }
}
