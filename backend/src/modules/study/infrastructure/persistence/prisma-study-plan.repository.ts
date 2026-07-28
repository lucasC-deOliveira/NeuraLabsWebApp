import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../prisma/prisma.service';
import type {
  PlanMetaTipo,
  StudyPlan,
  StudyPlanInput,
  StudyPlanRepository,
} from '../../domain/ports/study-plan-repository';

type PlanRow = {
  id: string;
  grafoId: string;
  prioridade: string;
  metaTipo: string;
  metaValor: number;
  dataAlvo: Date | null;
  ativo: boolean;
  baralhoIds: unknown;
  provaIds: unknown;
  conceitosExcluidos: unknown;
};

// Array de strings vindo do JSON (defensivo: filtra o que não é string).
function toIds(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((x): x is string => typeof x === 'string') : [];
}

function toPlan(row: PlanRow): StudyPlan {
  return {
    ...row,
    metaTipo: row.metaTipo as PlanMetaTipo,
    baralhoIds: toIds(row.baralhoIds),
    provaIds: toIds(row.provaIds),
    conceitosExcluidos: toIds(row.conceitosExcluidos),
  };
}

function toData(input: StudyPlanInput): StudyPlanInput {
  return {
    grafoId: input.grafoId,
    prioridade: input.prioridade,
    metaTipo: input.metaTipo,
    metaValor: input.metaValor,
    dataAlvo: input.dataAlvo,
    baralhoIds: input.baralhoIds,
    provaIds: input.provaIds,
    conceitosExcluidos: input.conceitosExcluidos,
  };
}

@Injectable()
export class PrismaStudyPlanRepository implements StudyPlanRepository {
  constructor(private readonly prisma: PrismaService) {}

  async loadById(userId: string, id: string): Promise<StudyPlan | null> {
    const row = await this.prisma.planoEstudo.findFirst({ where: { id, usuarioId: userId } });
    return row ? toPlan(row) : null;
  }

  async load(userId: string, grafoId: string): Promise<StudyPlan | null> {
    const row = await this.prisma.planoEstudo.findFirst({
      where: { usuarioId: userId, grafoId, ativo: true },
      orderBy: { dataAtualizacao: 'desc' },
    });
    return row ? toPlan(row) : null;
  }

  async save(userId: string, input: StudyPlanInput): Promise<StudyPlan> {
    const key = { usuarioId: userId, grafoId: input.grafoId, prioridade: input.prioridade };
    const row = await this.prisma.planoEstudo.upsert({
      where: { _plano_uk: key },
      create: { usuarioId: userId, ...toData(input) },
      update: { ...toData(input), ativo: true },
    });
    return toPlan(row);
  }

  async listByUser(userId: string): Promise<StudyPlan[]> {
    const rows = await this.prisma.planoEstudo.findMany({
      where: { usuarioId: userId },
      orderBy: { dataAtualizacao: 'desc' },
    });
    return rows.map(toPlan);
  }

  // deleteMany (não delete) para o `where` poder checar o dono sem estourar se sumir.
  async deleteById(userId: string, id: string): Promise<void> {
    await this.prisma.planoEstudo.deleteMany({ where: { id, usuarioId: userId } });
  }
}
