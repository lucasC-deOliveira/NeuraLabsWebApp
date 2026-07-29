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
  prioridade: string;
  metaTipo: string;
  metaValor: number;
  dataAlvo: Date | null;
  ativo: boolean;
  grafoIds: unknown;
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
    id: row.id,
    prioridade: row.prioridade,
    metaTipo: row.metaTipo as PlanMetaTipo,
    metaValor: row.metaValor,
    dataAlvo: row.dataAlvo,
    ativo: row.ativo,
    grafoIds: toIds(row.grafoIds),
    baralhoIds: toIds(row.baralhoIds),
    provaIds: toIds(row.provaIds),
    conceitosExcluidos: toIds(row.conceitosExcluidos),
  };
}

// Campos persistíveis (sem o `id`, que é identidade, não dado).
type PlanData = {
  prioridade: string;
  metaTipo: string;
  metaValor: number;
  dataAlvo: Date | null;
  grafoIds: string[];
  baralhoIds: string[];
  provaIds: string[];
  conceitosExcluidos: string[];
};

function toData(input: StudyPlanInput): PlanData {
  return {
    prioridade: input.prioridade,
    metaTipo: input.metaTipo,
    metaValor: input.metaValor,
    dataAlvo: input.dataAlvo,
    grafoIds: input.grafoIds,
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

  // Cria (sem id) ou atualiza por id — checando o dono antes de atualizar.
  async save(userId: string, input: StudyPlanInput): Promise<StudyPlan> {
    if (input.id && (await this.owns(userId, input.id))) return this.update(input.id, input);
    return this.create(userId, input);
  }

  private async owns(userId: string, id: string): Promise<boolean> {
    return (await this.prisma.planoEstudo.count({ where: { id, usuarioId: userId } })) > 0;
  }

  private async update(id: string, input: StudyPlanInput): Promise<StudyPlan> {
    const row = await this.prisma.planoEstudo.update({
      where: { id },
      data: { ...toData(input), ativo: true },
    });
    return toPlan(row);
  }

  private async create(userId: string, input: StudyPlanInput): Promise<StudyPlan> {
    const row = await this.prisma.planoEstudo.create({
      data: { usuarioId: userId, ...toData(input) },
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
