import { prioritizeLearningPath } from '../../domain/services/prioritize-learning-path';
import { prereqLinks } from '../../domain/services/prereq-links';
import { mergeTrilha } from '../../domain/services/roadmap-delta';
import {
  scoreConceitos,
  type RoadmapMode,
  type ScoredConceito,
  type ConceitoSignal,
} from '../../domain/services/roadmap-score';
import type { ImportanceRow } from '../../../curriculum/domain/services/conceito-importance';
import type { PathStep } from '../../domain/services/learning-path';
import type { LearningGraphRepository } from '../../domain/ports/learning-graph-repository';
import type { ConceitoImportanceSource } from '../../../curriculum/domain/ports/conceito-importance-source';
import type { EditalCoverageSource } from '../../domain/ports/edital-coverage-source';
import type { RoadmapTrilhaRepository } from '../../domain/ports/roadmap-trilha-repository';
import type { AiRoadmapBuilder, RoadmapResult } from '../../domain/ports/ai-roadmap-builder';

export type { RoadmapResult };

// A graph may hold several provas and editais, so the prova/edital modes are scoped
// to a specific one (and persisted separately per scope).
export interface RoadmapScope {
  regenerate?: boolean;
  provaId?: string;
  editalId?: string;
}

type DeterministicMode = Exclude<RoadmapMode, 'ai'>;

/**
 * Builds and persists a graph's study roadmap for a given mode, recomputing only the
 * delta: on an existing trilha, new nodes are slotted by priority and removed nodes
 * dropped, keeping the prior order stable. The deterministic modes (prova/edital/
 * prova_edital) score concepts with zero tokens; 'ai' is handled in a later phase.
 * @example buildRoadmap.execute('u1', 'g1', 'prova')
 */
export class BuildRoadmapUseCase {
  constructor(
    private readonly graph: LearningGraphRepository,
    private readonly importance: ConceitoImportanceSource,
    private readonly coverage: EditalCoverageSource,
    private readonly trilhas: RoadmapTrilhaRepository,
    private readonly aiBuilder?: AiRoadmapBuilder,
  ) {}

  async execute(
    userId: string,
    grafoId: string,
    mode: RoadmapMode,
    opts?: RoadmapScope,
  ): Promise<RoadmapResult> {
    const regenerate = opts?.regenerate ?? false;
    if (mode === 'ai') {
      if (!this.aiBuilder) throw new Error('unsupported roadmap mode: "ai" builder not wired');
      return this.aiBuilder.buildAi(userId, grafoId, regenerate);
    }
    const fullOrder = await this.deterministicOrder(userId, grafoId, mode, opts);
    return this.persistMerged(userId, grafoId, storageKey(mode, opts), fullOrder, regenerate);
  }

  private async deterministicOrder(
    userId: string,
    grafoId: string,
    mode: DeterministicMode,
    opts?: RoadmapScope,
  ): Promise<PathStep[]> {
    const [{ edges }, rows, covered] = await Promise.all([
      this.graph.loadLearningGraph(userId, grafoId),
      this.importance.load(userId, grafoId, opts?.provaId),
      this.coverage.load(userId, grafoId, opts?.editalId),
    ]);
    const scored = scoreConceitos(toSignals(rows, covered), mode);
    const scoreMap = new Map(scored.map((s) => [s.refId, s.score]));
    return prioritizeLearningPath(scored.map(toStep), prereqLinks(edges), scoreMap);
  }

  // Merges the fresh full order with the persisted trilha (or replaces it when
  // regenerating / none exists) and saves the result.
  private async persistMerged(
    userId: string,
    grafoId: string,
    mode: string,
    fullOrder: PathStep[],
    regenerate: boolean,
  ): Promise<RoadmapResult> {
    const persisted = regenerate ? null : await this.trilhas.load(userId, grafoId, mode);
    const { itens, novos } = persisted
      ? mergeTrilha(
          persisted.itens.map((i) => i.nodeId),
          fullOrder,
        )
      : { itens: fullOrder, novos: 0 };
    const dataGeracao = await this.trilhas.save(userId, grafoId, mode, itens);
    return { itens, dataGeracao: dataGeracao.toISOString(), novos };
  }
}

function toSignals(rows: ImportanceRow[], covered: Set<string>): ConceitoSignal[] {
  return rows.map((r) => ({
    refId: r.conceitoId,
    nome: r.nome,
    provaFreq: r.provaFreq,
    covered: covered.has(r.conceitoId),
  }));
}

function toStep(s: ScoredConceito): PathStep {
  return {
    nodeId: s.refId,
    nome: s.nome,
    tipo: 'CONCEITO',
    motivo: s.motivo,
    provaFreq: s.provaFreq,
  };
}

// A graph may hold several provas and editais, so scoped roadmaps persist separately:
// the trilha's storage key folds the chosen provaId/editalId into the mode.
function storageKey(mode: DeterministicMode, opts?: RoadmapScope): string {
  const parts = [mode as string];
  if ((mode === 'prova' || mode === 'prova_edital') && opts?.provaId)
    parts.push(`p:${opts.provaId}`);
  if ((mode === 'edital' || mode === 'prova_edital') && opts?.editalId)
    parts.push(`e:${opts.editalId}`);
  return parts.join('|');
}
