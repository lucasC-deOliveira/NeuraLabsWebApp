import type {
  StudyPlan,
  StudyPlanInput,
  StudyPlanRepository,
} from '../../domain/ports/study-plan-repository';
import type { CachePort } from '../../../cache/domain/cache-port';

const META_TIPOS = ['TEMPO', 'NOVOS'];
// Prefixo da prioridade = modo do roadmap (o escopo prova/edital vem dobrado na chave).
const PRIORIDADES = ['prova', 'edital', 'prova_edital', 'ai'];

function validate(input: StudyPlanInput): void {
  if (!META_TIPOS.includes(input.metaTipo)) {
    throw new Error(`invalid metaTipo: "${input.metaTipo}". Expected: TEMPO|NOVOS`);
  }
  if (!Number.isInteger(input.metaValor) || input.metaValor <= 0) {
    throw new Error(`invalid metaValor: "${input.metaValor}". Expected: positive integer`);
  }
  if (!PRIORIDADES.includes(input.prioridade.split('|')[0])) {
    throw new Error(
      `invalid prioridade: "${input.prioridade}". Expected one of: ${PRIORIDADES.join('|')}`,
    );
  }
}

/**
 * Cria ou atualiza a config do plano de estudo (upsert por grafo + prioridade).
 * @example save.execute('u1', { grafoId: 'g1', prioridade: 'prova', metaTipo: 'NOVOS', metaValor: 5, dataAlvo: null })
 */
export class SaveStudyPlanUseCase {
  constructor(
    private readonly plans: StudyPlanRepository,
    private readonly cache: CachePort,
  ) {}

  async execute(userId: string, input: StudyPlanInput): Promise<StudyPlan> {
    validate(input);
    const plan = await this.plans.save(userId, input);
    // Config mudou → o "hoje" cacheado desse plano some na hora.
    await this.cache.delByTag(`plan:${plan.id}`);
    return plan;
  }
}
