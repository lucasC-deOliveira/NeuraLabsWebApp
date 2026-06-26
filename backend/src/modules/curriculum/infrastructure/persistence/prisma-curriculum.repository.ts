import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../prisma/prisma.service';
import type { CurriculumRepository } from '../../domain/ports/curriculum-repository';
import type { CreateConceptInput, CreatedNode } from '../../domain/curriculum-views';
import { AssuntoNotFoundError, TopicoNotFoundError } from '../../domain/errors';

@Injectable()
export class PrismaCurriculumRepository implements CurriculumRepository {
  constructor(private readonly prisma: PrismaService) {}

  async createAssunto(userId: string, nome: string): Promise<CreatedNode> {
    const created = await this.prisma.assunto.create({
      data: { nome, usuarioId: userId },
      select: { id: true, nome: true },
    });
    return created;
  }

  async createTopico(userId: string, nome: string, assuntoId: string): Promise<CreatedNode> {
    const assunto = await this.prisma.assunto.findFirst({
      where: { id: assuntoId, usuarioId: userId },
      select: { id: true },
    });
    if (!assunto) throw new AssuntoNotFoundError();
    return this.prisma.topico.create({
      data: { nome, assuntoId, usuarioId: userId },
      select: { id: true, nome: true },
    });
  }

  async createConceito(userId: string, input: CreateConceptInput): Promise<CreatedNode> {
    const topico = await this.prisma.topico.findFirst({
      where: { id: input.topicoId, assunto: { usuarioId: userId } },
      select: { id: true },
    });
    if (!topico) throw new TopicoNotFoundError();
    return this.prisma.conceito.create({
      data: { nome: input.nome, topicoId: input.topicoId, usuarioId: userId },
      select: { id: true, nome: true },
    });
  }
}
