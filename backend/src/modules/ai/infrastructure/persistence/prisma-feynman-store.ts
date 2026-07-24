import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../../prisma/prisma.service';
import type { FeynmanAlvoTipo } from '../../domain/ports/feynman-context-source';
import type {
  FeynmanAttemptInput,
  FeynmanStateInput,
  FeynmanStore,
} from '../../domain/ports/feynman-store';

// JSON seguro para o Prisma (arrays/objetos válidos; null vira DbNull).
function toJson(value: unknown): Prisma.InputJsonValue {
  return (value ?? []) as Prisma.InputJsonValue;
}

@Injectable()
export class PrismaFeynmanStore implements FeynmanStore {
  constructor(private readonly prisma: PrismaService) {}

  async saveAttempt(input: FeynmanAttemptInput): Promise<void> {
    await this.prisma.explicacaoFeynman.create({
      data: {
        usuarioId: input.userId,
        alvoTipo: input.alvoTipo,
        alvoId: input.alvoId,
        texto: input.texto,
        clareza: input.clareza,
        lacunas: toJson(input.lacunas),
        jargao: toJson(input.jargao),
        angulo: input.angulo ?? null,
      },
    });
  }

  async currentInterval(
    userId: string,
    alvoTipo: FeynmanAlvoTipo,
    alvoId: string,
  ): Promise<number> {
    const state = await this.prisma.estadoFeynman.findUnique({
      where: { usuarioId_alvoTipo_alvoId: { usuarioId: userId, alvoTipo, alvoId } },
      select: { intervalo: true },
    });
    return state?.intervalo ?? 0;
  }

  async upsertState(input: FeynmanStateInput): Promise<void> {
    const key = { usuarioId: input.userId, alvoTipo: input.alvoTipo, alvoId: input.alvoId };
    const fields = {
      ultimaClareza: input.ultimaClareza,
      intervalo: input.intervalo,
      proximaRevisao: input.proximaRevisao,
    };
    await this.prisma.estadoFeynman.upsert({
      where: { usuarioId_alvoTipo_alvoId: key },
      create: { ...key, ...fields },
      update: fields,
    });
  }
}
